const express = require('express');
const axios = require('axios');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

// New Instagram Graph API 2024
const IG_GRAPH_URL = 'https://graph.instagram.com/v21.0';

async function getUserData(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('encrypted_access_token, token_expires_at, instagram_user_id')
    .eq('id', userId)
    .single();

  if (error || !data) throw new Error('User not found');
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
    throw new Error('Token expired. Please reconnect your Instagram account.');
  }
  return { token: data.encrypted_access_token, igAccountId: data.instagram_user_id };
}

// ── GET /api/posts ─────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const { refresh } = req.query;
  try {
    const { token, igAccountId } = await getUserData(req.user.userId);

    if (refresh === 'true') {
      await syncPosts(req.user.userId, token, igAccountId);
    }

    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, instagram_media_id, caption, media_type, media_url, thumbnail_url, permalink, comment_count, like_count, timestamp, last_synced_at')
      .eq('user_id', req.user.userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    if (posts.length === 0) {
      await syncPosts(req.user.userId, token, igAccountId);
      const { data: freshPosts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', req.user.userId)
        .order('timestamp', { ascending: false });
      return res.json(freshPosts || []);
    }

    res.json(posts);
  } catch (err) {
    console.error('[Posts] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/posts/:id ─────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  const { data: post, error } = await supabase
    .from('posts')
    .select('*, post_analytics(*)')
    .eq('id', req.params.id)
    .eq('user_id', req.user.userId)
    .single();

  if (error || !post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

// ── Sync posts from new Instagram API ──────────
async function syncPosts(userId, accessToken, igAccountId) {
  try {
    console.log(`[Posts] Syncing for IG account: ${igAccountId}`);

    // New Instagram API endpoint
    const response = await axios.get(`${IG_GRAPH_URL}/${igAccountId}/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,comments_count,like_count,timestamp',
        limit: 50,
        access_token: accessToken,
      }
    });

    const items = response.data.data || [];
    console.log(`[Posts] Found ${items.length} posts`);

    for (const item of items) {
      await supabase
        .from('posts')
        .upsert({
          user_id: userId,
          instagram_media_id: item.id,
          caption: item.caption || '',
          media_type: item.media_type,
          media_url: item.media_url,
          thumbnail_url: item.thumbnail_url || item.media_url,
          permalink: item.permalink,
          comment_count: item.comments_count || 0,
          like_count: item.like_count || 0,
          timestamp: item.timestamp,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'user_id,instagram_media_id' });
    }

    console.log(`[Posts] Synced ${items.length} posts`);
  } catch (err) {
    console.error('[Posts] Sync failed:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = router;
