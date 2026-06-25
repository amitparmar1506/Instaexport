const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

// ── GET /api/jobs/:jobId ───────────────────────
router.get('/:jobId', authMiddleware, async (req, res) => {
  const { data: job, error } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('id', req.params.jobId)
    .eq('user_id', req.user.userId) // ownership check
    .single();

  if (error || !job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// ── GET /api/jobs?postId=xxx ───────────────────
router.get('/', authMiddleware, async (req, res) => {
  const { postId } = req.query;
  let query = supabase
    .from('export_jobs')
    .select('*')
    .eq('user_id', req.user.userId)
    .order('created_at', { ascending: false });

  if (postId) query = query.eq('post_id', postId);

  const { data: jobs, error } = await query.limit(20);
  if (error) return res.status(500).json({ error: error.message });
  res.json(jobs);
});

// ── POST /api/jobs/:jobId/resume ───────────────
// Resume a paused job after payment
router.post('/:jobId/resume', authMiddleware, async (req, res) => {
  const { data: job } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('id', req.params.jobId)
    .eq('user_id', req.user.userId)
    .single();

  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'paused') return res.status(400).json({ error: 'Job is not paused' });

  // Verify user is now unlocked
  const { data: user } = await supabase
    .from('users')
    .select('plan, pro_expires_at')
    .eq('id', req.user.userId)
    .single();

  const isPro = user.plan === 'pro';
  const { data: purchase } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', req.user.userId)
    .eq('post_id', job.post_id)
    .eq('status', 'completed')
    .maybeSingle();

  if (!isPro && !purchase) {
    return res.status(402).json({ error: 'Payment required to resume' });
  }

  // Re-enqueue
  const { enqueueCommentIngestion } = require('../workers/queue');
  const { data: post } = await supabase
    .from('posts')
    .select('instagram_media_id')
    .eq('id', job.post_id)
    .single();

  await supabase
    .from('export_jobs')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', job.id);

  await enqueueCommentIngestion({
    jobId: job.id,
    userId: req.user.userId,
    postId: job.post_id,
    instagramMediaId: post.instagram_media_id,
    limit: null, // unlimited after payment
  });

  res.json({ success: true, jobId: job.id });
});

module.exports = router;
