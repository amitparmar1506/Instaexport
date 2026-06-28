const express = require('express');
const { format } = require('fast-csv');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');
const { execSync } = require('child_process');

// Find chromium executable
function findChromium() {
  const paths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/run/current-system/sw/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean);

  for (const p of paths) {
    try {
      const { statSync } = require('fs');
      statSync(p);
      console.log(`[PDF] Found Chromium at: ${p}`);
      return p;
    } catch {}
  }

  // Try to find via which command
  try {
    const path = execSync('which chromium || which chromium-browser || which google-chrome', { encoding: 'utf8' }).trim();
    if (path) {
      console.log(`[PDF] Found Chromium via which: ${path}`);
      return path;
    }
  } catch {}

  return null;
}

async function checkAccess(userId, postId) {
  const { data: post } = await supabase
    .from('posts')
    .select('id, caption, media_type, permalink, instagram_media_id, comment_count')
    .eq('id', postId)
    .eq('user_id', userId)
    .single();

  if (!post) return { error: 'Post not found', status: 404 };

  const { data: user } = await supabase
    .from('users')
    .select('plan, pro_expires_at')
    .eq('id', userId)
    .single();

  const isPro = user?.plan === 'pro' && (!user.pro_expires_at || new Date(user.pro_expires_at) > new Date());

  const { data: purchase } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .eq('status', 'completed')
    .maybeSingle();

  return { post, isUnlocked: isPro || !!purchase, isPro };
}

// ── GET /api/export/csv/:postId ────────────────
router.get('/csv/:postId', authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const access = await checkAccess(req.user.userId, postId);
  if (access.error) return res.status(access.status).json({ error: access.error });

  try {
    let query = supabase
      .from('comments')
      .select('instagram_comment_id, commenter_username, text, like_count, depth, parent_id, instagram_timestamp')
      .eq('post_id', postId)
      .order('instagram_timestamp', { ascending: true });

    if (!access.isUnlocked) query = query.limit(500);

    const { data: comments, error: commentsError } = await query;
    if (commentsError) throw new Error(commentsError.message);
    if (!comments?.length) return res.status(409).json({ error: 'No comments found. Please sync first.' });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="comments_${postId}.csv"`);

    const csvStream = format({
      headers: ['comment_id', 'username', 'text', 'likes', 'depth', 'parent_id', 'timestamp'],
      writeHeaders: true,
    });
    csvStream.pipe(res);

    for (const c of comments) {
      csvStream.write({
        comment_id: c.instagram_comment_id,
        username: c.commenter_username || 'unknown',
        text: c.text,
        likes: c.like_count,
        depth: c.depth,
        parent_id: c.parent_id || '',
        timestamp: c.instagram_timestamp,
      });
    }
    csvStream.end();

    // Update export count
    const { data: currentUser } = await supabase
      .from('users').select('total_comments_exported').eq('id', req.user.userId).single();
    await supabase
      .from('users')
      .update({ total_comments_exported: (currentUser?.total_comments_exported || 0) + comments.length })
      .eq('id', req.user.userId);

  } catch (err) {
    console.error('[Export] CSV error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ── GET /api/export/pdf/:postId ────────────────
router.get('/pdf/:postId', authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const access = await checkAccess(req.user.userId, postId);
  if (access.error) return res.status(access.status).json({ error: access.error });

  let browser = null;

  try {
    let query = supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('depth', { ascending: true })
      .order('instagram_timestamp', { ascending: true });

    if (!access.isUnlocked) query = query.limit(500);

    const { data: comments, error: commentsError } = await query;
    if (commentsError) throw new Error(commentsError.message);
    if (!comments?.length) return res.status(409).json({ error: 'No comments yet. Please sync first.' });

    const html = buildInstagramHTML(comments, access.post, access.isUnlocked);

    const puppeteer = require('puppeteer');
    const chromiumPath = findChromium();

    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    };

    if (chromiumPath) {
      launchOptions.executablePath = chromiumPath;
    }

    console.log('[PDF] Launching browser...');
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });

    console.log(`[PDF] Generated ${pdfBuffer.length} bytes`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="comments_${postId}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('[Export] PDF error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'PDF export failed', detail: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

// ── Instagram-style HTML builder ───────────────
function buildInstagramHTML(comments, post, isUnlocked) {
  // Build tree
  const tree = {};
  const roots = [];
  comments.forEach(c => { tree[c.id] = { ...c, children: [] }; });
  comments.forEach(c => {
    if (c.parent_id && tree[c.parent_id]) tree[c.parent_id].children.push(tree[c.id]);
    else roots.push(tree[c.id]);
  });

  const COLORS = ['#833AB4','#E1306C','#F56040','#FCAF45','#3897F0','#0095F6','#833AB4','#E1306C'];

  function avatarColor(username) {
    let h = 0;
    for (let i = 0; i < (username || '').length; i++) h = username.charCodeAt(i) + ((h << 5) - h);
    return COLORS[Math.abs(h) % COLORS.length];
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function renderComment(node, depth = 0) {
    const username = node.commenter_username || 'unknown';
    const initial = username[0].toUpperCase();
    const color = avatarColor(username);
    const date = formatDate(node.instagram_timestamp);
    const isOwnerLiked = node.like_count > 0;
    const children = node.children.map(c => renderComment(c, depth + 1)).join('');
    const avatarSize = depth === 0 ? 32 : 24;
    const fontSize = depth === 0 ? 14 : 13;
    const marginLeft = depth * 44;

    return `
    <div style="display:flex;gap:10px;margin-bottom:16px;margin-left:${marginLeft}px;position:relative;">
      ${depth > 0 ? `<div style="position:absolute;left:-22px;top:0;bottom:0;width:1px;background:#DBDBDB;"></div>` : ''}
      <!-- Avatar -->
      <div style="width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;background:linear-gradient(135deg,${color},${color}CC);display:flex;align-items:center;justify-content:center;color:white;font-size:${depth === 0 ? 13 : 10}px;font-weight:700;flex-shrink:0;font-family:system-ui;">
        ${initial}
      </div>
      <!-- Content -->
      <div style="flex:1;min-width:0;">
        <div style="font-size:${fontSize}px;line-height:1.5;color:#262626;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
          <span style="font-weight:600;margin-right:4px;">${escapeHtml(username)}</span><span style="white-space:pre-wrap;">${escapeHtml(node.text)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:4px;font-size:12px;color:#8E8E8E;font-family:system-ui;">
          <span>${date}</span>
          ${node.like_count > 0 ? `<span style="font-weight:600;">${node.like_count} ${node.like_count === 1 ? 'like' : 'likes'}</span>` : ''}
          ${node.children.length > 0 ? `<span style="font-weight:600;">Reply</span>` : ''}
        </div>
      </div>
      <!-- Heart icon -->
      <div style="flex-shrink:0;padding-top:4px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="${isOwnerLiked ? '#ED4956' : 'none'}" stroke="${isOwnerLiked ? '#ED4956' : '#8E8E8E'}" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </div>
    </div>
    ${children ? `<div style="margin-left:${marginLeft + 44}px;">${children}</div>` : ''}`;
  }

  const commentsHTML = roots.map(r => renderComment(r)).join('');
  const exportDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const postUrl = post.permalink || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: #FAFAFA;
    color: #262626;
    padding: 0;
  }

  /* IG-style header */
  .ig-header {
    background: white;
    border-bottom: 1px solid #DBDBDB;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
  }
  .ig-logo {
    font-size: 20px;
    font-family: 'Billabong', cursive;
    background: linear-gradient(45deg, #833AB4, #E1306C, #F56040, #FCAF45);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  .ig-title {
    font-size: 16px;
    font-weight: 600;
    color: #262626;
  }
  .ig-meta {
    font-size: 12px;
    color: #8E8E8E;
    margin-top: 1px;
  }

  /* Post preview */
  .post-preview {
    background: white;
    border-bottom: 1px solid #DBDBDB;
    padding: 12px 16px;
  }
  .post-caption {
    font-size: 14px;
    color: #262626;
    line-height: 1.5;
  }
  .post-caption strong {
    font-weight: 600;
    margin-right: 6px;
  }
  .post-url {
    font-size: 12px;
    color: #3897F0;
    margin-top: 4px;
  }

  /* Comments section */
  .comments-header {
    background: white;
    padding: 12px 16px 8px;
    font-size: 14px;
    font-weight: 600;
    color: #262626;
    border-bottom: 1px solid #DBDBDB;
  }
  .comments-list {
    background: white;
    padding: 12px 16px;
  }

  /* Free limit notice */
  .free-notice {
    background: #FFF3CD;
    border: 1px solid #FFEAA7;
    padding: 10px 16px;
    font-size: 12px;
    color: #856404;
    text-align: center;
  }

  /* Footer */
  .ig-footer {
    background: white;
    border-top: 1px solid #DBDBDB;
    padding: 12px 16px;
    text-align: center;
    font-size: 11px;
    color: #8E8E8E;
  }

  /* Divider between comments */
  .comment-divider {
    height: 1px;
    background: #FAFAFA;
    margin: 4px 0;
  }
</style>
</head>
<body>

<!-- Instagram-style header -->
<div class="ig-header">
  <div>
    <div class="ig-logo">CommentExport</div>
  </div>
  <div style="margin-left:auto;text-align:right;">
    <div style="font-size:11px;color:#8E8E8E;">Exported ${exportDate}</div>
    <div style="font-size:11px;color:#8E8E8E;">${comments.length} comments${!isUnlocked ? ' · free preview' : ''}</div>
  </div>
</div>

<!-- Post info -->
<div class="post-preview">
  <div class="post-caption">
    <strong>${escapeHtml(post.caption?.split(' ')[0] || 'Post')}</strong>${escapeHtml((post.caption || '').substring(0, 200))}${(post.caption || '').length > 200 ? '...' : ''}
  </div>
  ${postUrl ? `<div class="post-url">${postUrl}</div>` : ''}
</div>

${!isUnlocked ? `
<div class="free-notice">
  ⚠️ Showing first 500 comments · <strong>Upgrade at commentexport.vercel.app</strong> for complete archive
</div>` : ''}

<!-- Comments -->
<div class="comments-header">
  Comments <span style="color:#8E8E8E;font-weight:400;">(${comments.length.toLocaleString()})</span>
</div>

<div class="comments-list">
  ${commentsHTML}
</div>

<!-- Footer -->
<div class="ig-footer">
  Generated by <strong>CommentExport</strong> · commentexport.vercel.app · ${exportDate}
</div>

</body>
</html>`;
}

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = router;
