const axios = require('axios');
const supabase = require('../db/supabase');

const GRAPH_URL = 'https://graph.instagram.com';
const BATCH_SIZE = 50; // Instagram API max per page

// ── Main worker function ───────────────────────
async function processCommentIngestion(job) {
  const { jobId, userId, postId, instagramMediaId, limit } = job.data;

  console.log(`[Worker] Starting job ${jobId} for post ${instagramMediaId}`);

  try {
    // Update job status
    await updateJobStatus(jobId, 'running');

    // Get user's access token
    const { data: user } = await supabase
      .from('users')
      .select('encrypted_access_token')
      .eq('id', userId)
      .single();

    if (!user) throw new Error('User not found');
    const accessToken = user.encrypted_access_token;

    // Fetch existing job to check resume cursor
    const { data: jobRecord } = await supabase
      .from('export_jobs')
      .select('next_cursor, processed_comments')
      .eq('id', jobId)
      .single();

    let cursor = jobRecord?.next_cursor || null;
    let processedCount = jobRecord?.processed_comments || 0;
    let totalFetched = 0;
    const hardLimit = limit || Infinity;

    // ── Paginated ingestion loop ──────────────────
    while (true) {
      if (processedCount >= hardLimit) {
        // Hit free tier limit — pause job
        await updateJobStatus(jobId, 'paused', {
          processed_comments: processedCount,
          next_cursor: cursor,
        });
        console.log(`[Worker] Hit free limit (${hardLimit}) for job ${jobId}`);
        break;
      }

      const batchLimit = Math.min(BATCH_SIZE, hardLimit - processedCount);

      // Fetch root comments
      const params = {
        fields: 'id,text,like_count,timestamp,username,replies{id,text,like_count,timestamp,username}',
        limit: batchLimit,
        access_token: accessToken,
      };
      if (cursor) params.after = cursor;

      let response;
      try {
        response = await axios.get(`${GRAPH_URL}/${instagramMediaId}/comments`, { params });
      } catch (apiErr) {
        const errMsg = apiErr.response?.data?.error?.message || apiErr.message;
        console.error(`[Worker] API error:`, errMsg);
        await updateJobStatus(jobId, 'failed', { error_message: errMsg });
        return;
      }

      const rootComments = response.data?.data || [];
      cursor = response.data?.paging?.cursors?.after || null;

      if (rootComments.length === 0) break;

      // ── Process and store each comment ────────────
      for (const comment of rootComments) {
        const commentDbId = await upsertComment(postId, {
          instagram_comment_id: comment.id,
          commenter_username: comment.username,
          text: comment.text,
          like_count: comment.like_count || 0,
          parent_id: null,
          depth: 0,
          instagram_timestamp: comment.timestamp,
        });

        // Process replies
        if (comment.replies?.data?.length > 0) {
          for (const reply of comment.replies.data) {
            await upsertComment(postId, {
              instagram_comment_id: reply.id,
              commenter_username: reply.username,
              text: reply.text,
              like_count: reply.like_count || 0,
              parent_id: commentDbId,
              depth: 1,
              instagram_timestamp: reply.timestamp,
            });
          }
        }

        processedCount++;
        totalFetched++;
      }

      // Update progress in DB every batch
      await supabase
        .from('export_jobs')
        .update({
          processed_comments: processedCount,
          progress: Math.min(100, Math.round((processedCount / Math.max(1, (await getTotal(jobId)))) * 100)),
          next_cursor: cursor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // No more pages
      if (!cursor) break;

      // Small delay to respect API rate limits
      await sleep(200);
    }

    // ── Job complete ──────────────────────────────
    if (processedCount < hardLimit || limit === null) {
      await updateJobStatus(jobId, 'completed', { processed_comments: processedCount, progress: 100 });
      await computeAnalytics(postId);
      console.log(`[Worker] Job ${jobId} completed — ${processedCount} comments`);
    }

  } catch (err) {
    console.error(`[Worker] Job ${jobId} failed:`, err.message);
    await updateJobStatus(jobId, 'failed', { error_message: err.message });
    throw err; // pg-boss will retry
  }
}

// ── Helpers ────────────────────────────────────

async function upsertComment(postId, data) {
  const { data: comment, error } = await supabase
    .from('comments')
    .upsert({
      post_id: postId,
      instagram_comment_id: data.instagram_comment_id,
      commenter_username: data.commenter_username, // Real Instagram username — always preserved
      text: data.text,
      like_count: data.like_count,
      parent_id: data.parent_id,
      depth: data.depth,
      instagram_timestamp: data.instagram_timestamp,
    }, { onConflict: 'post_id,instagram_comment_id' })
    .select('id')
    .single();

  if (error) {
    console.error('[Worker] Upsert error:', error.message);
    return null;
  }
  return comment.id;
}

async function updateJobStatus(jobId, status, extra = {}) {
  await supabase
    .from('export_jobs')
    .update({ status, ...extra, updated_at: new Date().toISOString() })
    .eq('id', jobId);
}

async function getTotal(jobId) {
  const { data } = await supabase
    .from('export_jobs')
    .select('total_comments')
    .eq('id', jobId)
    .single();
  return data?.total_comments || 1;
}

async function computeAnalytics(postId) {
  try {
    const { data: comments } = await supabase
      .from('comments')
      .select('id, parent_id, depth, commenter_instagram_id, commenter_username, like_count, instagram_timestamp')
      .eq('post_id', postId);

    if (!comments?.length) return;

    const total = comments.length;
    const replies = comments.filter(c => c.depth > 0).length;
    const uniqueCommenters = new Set(comments.map(c => c.commenter_username)).size;

    const depthDist = {};
    comments.forEach(c => {
      const key = c.depth >= 3 ? '3+' : String(c.depth);
      depthDist[key] = (depthDist[key] || 0) + 1;
    });

    // Hourly activity
    const hourMap = {};
    comments.forEach(c => {
      if (c.instagram_timestamp) {
        const hour = new Date(c.instagram_timestamp).getHours();
        hourMap[hour] = (hourMap[hour] || 0) + 1;
      }
    });
    const hourlyActivity = Object.entries(hourMap)
      .map(([hour, count]) => ({ hour: parseInt(hour), comments: count }))
      .sort((a, b) => a.hour - b.hour);

    // Top comments by likes
    const topComments = [...comments]
      .filter(c => c.depth === 0)
      .sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
      .slice(0, 10)
      .map(c => ({ id: c.id, username: c.commenter_username, likes: c.like_count }));

    await supabase
      .from('post_analytics')
      .upsert({
        post_id: postId,
        total_comments: total,
        total_replies: replies,
        unique_commenters: uniqueCommenters,
        reply_ratio: total > 0 ? (replies / total).toFixed(4) : 0,
        max_depth: Math.max(...comments.map(c => c.depth)),
        depth_distribution: depthDist,
        hourly_activity: hourlyActivity,
        top_comments: topComments,
        computed_at: new Date().toISOString(),
      }, { onConflict: 'post_id' });

    console.log(`[Worker] Analytics computed for post ${postId}`);
  } catch (err) {
    console.error('[Worker] Analytics error:', err.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { processCommentIngestion };
