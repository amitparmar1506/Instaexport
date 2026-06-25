const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');
const { enqueueCommentIngestion } = require('../workers/queue');

const FREE_COMMENT_LIMIT = 500;

// ── POST /api/comments/ingest ──────────────────
// Start ingesting comments for a post
router.post('/ingest', authMiddleware, async (req, res) => {
  const { postId } = req.body;
  if (!postId) return res.status(400).json({ error: 'postId required' });

  try {
    // Verify post ownership
    const { data: post } = await supabase
      .from('posts')
      .select('id, instagram_media_id, comment_count')
      .eq('id', postId)
      .eq('user_id', req.user.userId)
      .single();

    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Check if user has already ingested free tier
    const { count: existingCount } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId);

    // Check user plan
    const { data: user } = await supabase
      .from('users')
      .select('plan, pro_expires_at')
      .eq('id', req.user.userId)
      .single();

    const isPro = user.plan === 'pro' && (!user.pro_expires_at || new Date(user.pro_expires_at) > new Date());

    // Check single-post purchase
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', req.user.userId)
      .eq('post_id', postId)
      .eq('status', 'completed')
      .single();

    const isUnlocked = isPro || !!purchase;
    const limit = isUnlocked ? null : FREE_COMMENT_LIMIT;

    // Create or resume job
    const { data: existingJob } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', req.user.userId)
      .neq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingJob?.status === 'completed') {
      return res.json({
        jobId: existingJob.id,
        status: 'completed',
        processed: existingJob.processed_comments,
        isUnlocked,
        hitPaywall: !isUnlocked && existingJob.processed_comments >= FREE_COMMENT_LIMIT,
      });
    }

    // Enqueue ingestion job
    const { data: job } = await supabase
      .from('export_jobs')
      .insert({
        user_id: req.user.userId,
        post_id: postId,
        status: 'pending',
        total_comments: post.comment_count,
        export_format: 'json',
      })
      .select()
      .single();

    await enqueueCommentIngestion({
      jobId: job.id,
      userId: req.user.userId,
      postId,
      instagramMediaId: post.instagram_media_id,
      limit,
    });

    res.json({
      jobId: job.id,
      status: 'pending',
      total: post.comment_count,
      isUnlocked,
      freeLimit: FREE_COMMENT_LIMIT,
    });
  } catch (err) {
    console.error('[Comments] Ingest error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/comments/:postId ──────────────────
// Get threaded comments for a post (paginated)
router.get('/:postId', authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 50, search, parentId } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Verify ownership
  const { data: post } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('user_id', req.user.userId)
    .single();

  if (!post) return res.status(404).json({ error: 'Post not found' });

  try {
    let query = supabase
      .from('comments')
      .select('*', { count: 'exact' })
      .eq('post_id', postId)
      .order('instagram_timestamp', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    // Filter by parent (depth level)
    if (parentId === 'null' || !parentId) {
      query = query.is('parent_id', null); // root comments only
    } else if (parentId) {
      query = query.eq('parent_id', parentId);
    }

    // Full-text search via search index
    if (search && search.trim()) {
      const { data: searchResults } = await supabase
        .from('comment_search_index')
        .select('comment_id')
        .eq('post_id', postId)
        .textSearch('search_vector', search.trim(), { type: 'websearch' });

      const ids = (searchResults || []).map(r => r.comment_id);
      if (ids.length === 0) return res.json({ comments: [], total: 0, page: parseInt(page) });
      query = supabase
        .from('comments')
        .select('*', { count: 'exact' })
        .eq('post_id', postId)
        .in('id', ids)
        .range(offset, offset + parseInt(limit) - 1);
    }

    const { data: comments, count, error } = await query;
    if (error) throw error;

    // Attach reply counts to root comments
    if (!parentId || parentId === 'null') {
      const commentIds = comments.map(c => c.id);
      const { data: replyCounts } = await supabase
        .from('comments')
        .select('parent_id')
        .in('parent_id', commentIds);

      const replyMap = {};
      (replyCounts || []).forEach(r => {
        replyMap[r.parent_id] = (replyMap[r.parent_id] || 0) + 1;
      });

      comments.forEach(c => { c.reply_count = replyMap[c.id] || 0; });
    }

    res.json({
      comments,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    console.error('[Comments] Fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/comments/:postId/analytics ───────
router.get('/:postId/analytics', authMiddleware, async (req, res) => {
  const { postId } = req.params;

  // Verify ownership
  const { data: post } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('user_id', req.user.userId)
    .single();

  if (!post) return res.status(404).json({ error: 'Post not found' });

  // Return cached analytics
  const { data: analytics } = await supabase
    .from('post_analytics')
    .select('*')
    .eq('post_id', postId)
    .single();

  if (analytics) return res.json(analytics);

  // Compute on-the-fly if not cached
  const { count: totalComments } = await supabase
    .from('comments').select('id', { count: 'exact', head: true }).eq('post_id', postId);
  const { count: totalReplies } = await supabase
    .from('comments').select('id', { count: 'exact', head: true }).eq('post_id', postId).gt('depth', 0);

  const uniqueQuery = await supabase
    .from('comments').select('commenter_instagram_id').eq('post_id', postId);
  const uniqueCommenters = new Set((uniqueQuery.data || []).map(c => c.commenter_instagram_id)).size;

  const result = {
    post_id: postId,
    total_comments: totalComments || 0,
    total_replies: totalReplies || 0,
    unique_commenters: uniqueCommenters,
    reply_ratio: totalComments ? ((totalReplies || 0) / totalComments).toFixed(4) : 0,
  };

  res.json(result);
});

module.exports = router;
