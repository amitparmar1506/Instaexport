const express = require('express');
const axios = require('axios');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

const FB_GRAPH_URL = 'https://graph.facebook.com/v19.0';

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

// ── Resolve real Instagram account ID from token ──
async function resolveIgAccountId(token, storedIgId) {
  // If stored ID starts with fb_ it's a Facebook ID not Instagram ID
  // We need to find the real Instagram Business Account ID
  if (storedIgId && !storedIgId.startsWith('fb_')) {
    return storedIgId; // Already a real IG account ID
  }

  console.log('[Posts] Stored ID is Facebook ID, resolving real Instagram account...');

  // Step 1: Get Facebook Pages
  try {
    const pagesRes = await axios.get(`${FB_GRAPH_URL}/me/accounts`, {
      params: {
        fields: 'id,name,access_token,instagram_business_account',
        access_token: token,
      }
    });

    const pages = pagesRes.data.data || [];
    console.log(`[Posts] Found ${pages.length} Facebook pages`);

    for (const page of pages) {
      if (page.instagram_business_account?.id) {
        console.log(`[Posts] Found Instagram account: ${page.instagram_business_account.id}`);
        return { igId: page.instagram_business_account.id, pageToken: page.access_token };
      }
    }
  } catch (err) {
    console.error('[Posts] Error fetching pages:', err.response?.data || err.message);
  }

  // Step 2: Try direct me endpoint
  try {
    const meRes = await axios.get(`${FB_GRAPH_URL}/me`, {
      params: {
        fields: 'id,instagram_business_account',
        access_token: token,
      }
    });
    if (meRes.data.instagram_business_account?.id) {
      return { igId: meRes.data.instagram_business_account.id, pageToken: token };
    }
  } catch (err) {
    console.error('[Posts] Error fetching me:', err.message);
  }

  throw new Error('No Instagram Business or Creator account found. Please make sure your Instagram is linked to a Facebook Page and reconnect.');
}

// ── GET /api/posts ─────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const { refresh } = req.query;

  try {
    const { token, igAccountId: storedIgId } = await getUserData(req.user.userId);

    // Resolve real Instagram account ID
    const resolved = await resolveIgAccountId(token, storedIgId);
    const igAccountId = typeof resolved === 'string' ? resolved : resolved.igId;
    const activeToken = typeof resolved === 'string' ? token : (resolved.pageToken || token);

    // Update DB with real IG account ID if it was wrong
    if (storedIgId !== igAccountId) {
      console.log(`[Posts] Updating stored IG ID from ${storedIgId} to ${igAccountId}`);
      await supabase
        .from('users')
        .update({ instagram_user_id: igAccountId })
        .eq('id', req.user.userId);
    }

    if (refresh === 'true') {
      await syncPosts(req.user.userId, activeToken, igAccountId);
    }

    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, instagram_media_id, caption, media_type, media_url, thumbnail_url, permalink, comment_count, like_count, timestamp, last_synced_at')
      .eq('user_id', req.user.userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    if (posts.length === 0) {
      await syncPosts(req.user.userId, activeToken, igAccountId);
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

// ── Sync posts from Instagram Graph API ────────
async function syncPosts(userId, accessToken, igAccountId) {
  try {
    console.log(`[Posts] Syncing posts for IG account: ${igAccountId}`);

    const response = await axios.get(`${FB_GRAPH_URL}/${igAccountId}/media`, {
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

    console.log(`[Posts] Synced ${items.length} posts for user ${userId}`);
  } catch (err) {
    console.error('[Posts] Sync failed:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = router;
