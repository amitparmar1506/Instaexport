const express = require('express');
const { format } = require('fast-csv');
const puppeteer = require('puppeteer');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

// PDF is available on ALL tiers — free gets 500 comments, pro gets unlimited
// Usernames are ALWAYS preserved (real Instagram @usernames, no anonymization)

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

    // Free tier: 500 comment limit; Pro/purchased: unlimited
    if (!access.isUnlocked) query = query.limit(500);

    const { data: comments, error } = await query;
    if (error) throw error;

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
        username: c.commenter_username, // REAL username always preserved
        text: c.text,
        likes: c.like_count,
        depth: c.depth,
        parent_id: c.parent_id || '',
        timestamp: c.instagram_timestamp,
      });
    }

    csvStream.end();

    await supabase
      .from('users')
      .update({ total_comments_exported: supabase.raw('total_comments_exported + ' + comments.length) })
      .eq('id', req.user.userId);

  } catch (err) {
    console.error('[Export] CSV error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ── GET /api/export/pdf/:postId ────────────────
// PDF available on ALL tiers (free=500 comments, pro=unlimited)
router.get('/pdf/:postId', authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const access = await checkAccess(req.user.userId, postId);
  if (access.error) return res.status(access.status).json({ error: access.error });

  try {
    let query = supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('depth', { ascending: true })
      .order('instagram_timestamp', { ascending: true });

    // Free tier: 500 comments; Pro/purchased: unlimited
    if (!access.isUnlocked) query = query.limit(500);

    const { data: comments } = await query;
    if (!comments?.length) return res.status(404).json({ error: 'No comments found. Please sync first.' });

    const threadedHtml = buildThreadedHtml(comments, access.post, access.isUnlocked);

    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setContent(threadedHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size:8px;color:#999;width:100%;text-align:center;padding-top:5px;">CommentExport — Comment Archive</div>',
      footerTemplate: '<div style="font-size:8px;color:#999;width:100%;text-align:center;padding-bottom:5px;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="comments_${postId}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('[Export] PDF error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ── Build Instagram-style threaded HTML ────────
function buildThreadedHtml(comments, post, isUnlocked) {
  const tree = {};
  const roots = [];

  comments.forEach(c => { tree[c.id] = { ...c, children: [] }; });
  comments.forEach(c => {
    if (c.parent_id && tree[c.parent_id]) {
      tree[c.parent_id].children.push(tree[c.id]);
    } else {
      roots.push(tree[c.id]);
    }
  });

  function renderComment(node, depth = 0) {
    const indent = depth * 20;
    const avatarColor = stringToColor(node.commenter_username || '?');
    const initial = (node.commenter_username || '?')[0].toUpperCase();
    const children = node.children.map(child => renderComment(child, depth + 1)).join('');
    const date = node.instagram_timestamp ? new Date(node.instagram_timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

    return `
      <div style="margin-left:${indent}px;margin-bottom:10px;position:relative;">
        ${depth > 0 ? `<div style="position:absolute;left:-12px;top:0;bottom:0;width:1.5px;background:#e0e0e0;border-radius:1px;"></div>` : ''}
        <div style="display:flex;align-items:flex-start;gap:8px;">
          <div style="width:28px;height:28px;border-radius:50%;background:${avatarColor};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;margin-top:2px;">
            ${initial}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap;">
              <span style="font-weight:700;font-size:12px;color:#262626;">@${escapeHtml(node.commenter_username || 'unknown')}</span>
              ${node.like_count > 0 ? `<span style="font-size:11px;color:#8e8e8e;">❤️ ${node.like_count}</span>` : ''}
              ${date ? `<span style="font-size:10px;color:#aaa;margin-left:auto;">${date}</span>` : ''}
            </div>
            <div style="font-size:13px;color:#262626;line-height:1.5;word-break:break-word;">${escapeHtml(node.text)}</div>
          </div>
        </div>
        ${children ? `<div style="margin-top:8px;">${children}</div>` : ''}
      </div>`;
  }

  const commentsHtml = roots.map(r => renderComment(r)).join('');
  const exportedAt = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #262626; background: #fff; font-size: 13px; }
    .header { border-bottom: 2px solid #f0f0f0; padding: 16px 0 16px; margin-bottom: 20px; }
    .post-caption { font-size: 13px; color: #262626; line-height: 1.6; margin-top: 6px; max-width: 600px; }
    .meta { font-size: 11px; color: #8e8e8e; margin-top: 6px; display: flex; gap: 16px; flex-wrap: wrap; }
    .comments { padding-bottom: 40px; }
    .watermark { text-align: center; font-size: 10px; color: #ccc; margin-top: 20px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
    ${!isUnlocked ? '.paywall-note { background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 11px; color: #856404; }' : ''}
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size:16px;font-weight:800;color:#262626;">📋 Comment Archive</div>
    <div class="post-caption">${escapeHtml((post.caption || 'No caption').substring(0, 300))}${(post.caption || '').length > 300 ? '...' : ''}</div>
    <div class="meta">
      <span>💬 ${comments.length.toLocaleString()} comments${!isUnlocked ? ' (free preview)' : ''}</span>
      <span>🕐 Exported: ${exportedAt}</span>
      ${post.permalink ? `<span>🔗 ${post.permalink}</span>` : ''}
    </div>
  </div>
  ${!isUnlocked ? '<div class="paywall-note">⚠️ This is a free preview showing the first 500 comments. Upgrade to Pro at commentexport.vercel.app for the full archive.</div>' : ''}
  <div class="comments">${commentsHtml}</div>
  <div class="watermark">Generated by CommentExport · commentexport.vercel.app</div>
</body>
</html>`;
}

function stringToColor(str) {
  const colors = ['#7c3aed','#db2777','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#2563eb'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = router;
