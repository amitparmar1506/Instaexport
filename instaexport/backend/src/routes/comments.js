const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');
const { enqueueCommentIngestion } = require('../workers/queue');

const FREE_COMMENT_LIMIT = 500;

// ── POST /api/comments/ingest ──────────────────
router.post('/ingest', authMiddleware, async (req, res) => {
  const { postId, deltaSync } = req.body;
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

    // Check user plan
    const { data: user } = await supabase
      .from('users')
      .select('plan, pro_expires_at')
      .eq('id', req.user.userId)
      .single();

    const isPro = user?.plan === 'pro' && (!user.pro_expires_at || new Date(user.pro_expires_at) > new Date());

    // Check single-post purchase — use maybeSingle to avoid error when none exists
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', req.user.userId)
      .eq('post_id', postId)
      .eq('status', 'completed')
      .maybeSingle();

    const isUnlocked = isPro || !!purchase;
    const limit = isUnlocked ? null : FREE_COMMENT_LIMIT;

    // Check for existing job
    const { data: existingJob } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', req.user.userId)
      .neq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingJob?.status === 'running' || existingJob?.status === 'pending') {
      return res.json({
        jobId: existingJob.id,
        status: existingJob.status,
        processed: existingJob.processed_comments,
        total: existingJob.total_comments,
        isUnlocked,
      });
    }

    if (existingJob?.status === 'completed' && !deltaSync) {
      return res.json({
        jobId: existingJob.id,
        status: 'completed',
        processed: existingJob.processed_comments,
        isUnlocked,
        hitPaywall: !isUnlocked && existingJob.processed_comments >= FREE_COMMENT_LIMIT,
      });
    }

    // Create new job (for both initial sync and delta syncs)
    const { data: job, error: jobError } = await supabase
      .from('export_jobs')
      .insert({
        user_id: req.user.userId,
        post_id: postId,
        status: 'pending',
        total_comments: post.comment_count || 0,
        processed_comments: 0,
        progress: 0,
        export_format: 'json',
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Enqueue
    await enqueueCommentIngestion({
      jobId: job.id,
      userId: req.user.userId,
      postId,
      instagramMediaId: post.instagram_media_id,
      limit,
      deltaSync: !!deltaSync,
    });

    console.log(`[Comments] Enqueued job ${job.id} for post ${post.instagram_media_id}`);

    res.json({
      jobId: job.id,
      status: 'pending',
      total: post.comment_count || 0,
      isUnlocked,
      freeLimit: FREE_COMMENT_LIMIT,
    });

  } catch (err) {
    console.error('[Comments] Ingest error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/comments/:postId ──────────────────
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

    // Filter by parent
    if (!parentId || parentId === 'null') {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }

    // Full text search
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

    // Attach reply counts
    if (!parentId || parentId === 'null') {
      const commentIds = (comments || []).map(c => c.id);
      if (commentIds.length > 0) {
        const { data: replyCounts } = await supabase
          .from('comments')
          .select('parent_id')
          .in('parent_id', commentIds);

        const replyMap = {};
        (replyCounts || []).forEach(r => {
          replyMap[r.parent_id] = (replyMap[r.parent_id] || 0) + 1;
        });
        (comments || []).forEach(c => { c.reply_count = replyMap[c.id] || 0; });
      }
    }

    res.json({
      comments: comments || [],
      total: count || 0,
      page: parseInt(page),
      pages: Math.ceil((count || 0) / parseInt(limit)),
    });

  } catch (err) {
    console.error('[Comments] Fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/comments/:postId/analytics ────────
router.get('/:postId/analytics', authMiddleware, async (req, res) => {
  const { postId } = req.params;

  const { data: post } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('user_id', req.user.userId)
    .single();

  if (!post) return res.status(404).json({ error: 'Post not found' });

  const { data: analytics } = await supabase
    .from('post_analytics')
    .select('*')
    .eq('post_id', postId)
    .maybeSingle();

  if (analytics) return res.json(analytics);

  // Compute basic analytics on the fly
  const { count: totalComments } = await supabase
    .from('comments').select('id', { count: 'exact', head: true }).eq('post_id', postId);
  const { count: totalReplies } = await supabase
    .from('comments').select('id', { count: 'exact', head: true }).eq('post_id', postId).gt('depth', 0);

  res.json({
    post_id: postId,
    total_comments: totalComments || 0,
    total_replies: totalReplies || 0,
    unique_commenters: 0,
    reply_ratio: 0,
  });
});

module.exports = router;
