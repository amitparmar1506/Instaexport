require('dotenv').config();
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

// New Instagram API (2024) — uses instagram.com OAuth, not facebook.com
const IG_AUTH_URL = 'https://www.instagram.com/oauth/authorize';
const IG_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const IG_LONG_TOKEN_URL = 'https://graph.instagram.com/access_token';
const IG_GRAPH_URL = 'https://graph.instagram.com/v21.0';

const BACKEND_URL = (process.env.BACKEND_URL || '').replace(/\/$/, '');
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

// ── GET /api/auth/instagram ────────────────────
router.get('/instagram', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_CLIENT_ID,
    redirect_uri: `${BACKEND_URL}/api/auth/callback`,
    scope: 'instagram_business_basic,instagram_business_manage_comments',
    response_type: 'code',
  });
  res.redirect(`${IG_AUTH_URL}?${params}`);
});

// ── GET /api/auth/callback ─────────────────────
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/auth/error?reason=${error}`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/auth/error?reason=no_code`);
  }

  try {
    // 1. Exchange code for short-lived token
    const tokenRes = await axios.post(IG_TOKEN_URL, new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: `${BACKEND_URL}/api/auth/callback`,
      code,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token: shortToken, user_id: igUserId } = tokenRes.data;
    console.log(`[Auth] Got short token for IG user: ${igUserId}`);

    // 2. Exchange for long-lived token (60 days)
    const longTokenRes = await axios.get(IG_LONG_TOKEN_URL, {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        access_token: shortToken,
      }
    });

    const { access_token: longToken, expires_in } = longTokenRes.data;

    // 3. Get Instagram profile
    const profileRes = await axios.get(`${IG_GRAPH_URL}/me`, {
      params: {
        fields: 'id,username,name,profile_picture_url,followers_count,media_count',
        access_token: longToken,
      }
    });

    const profile = profileRes.data;
    console.log(`[Auth] Instagram profile: @${profile.username}`);

    // 4. Upsert user in DB
    const { data: user, error: dbError } = await supabase
      .from('users')
      .upsert({
        instagram_user_id: String(profile.id),
        username: profile.username,
        full_name: profile.name || profile.username,
        profile_picture: profile.profile_picture_url,
        encrypted_access_token: longToken,
        token_expires_at: new Date(Date.now() + (expires_in || 5184000) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'instagram_user_id', ignoreDuplicates: false })
      .select()
      .single();

    if (dbError) {
      console.error('[Auth] DB error:', dbError);
      throw dbError;
    }

    // 5. Issue JWT (30 day expiry)
    const jwtToken = jwt.sign(
      { userId: user.id, instagramUserId: user.instagram_user_id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`[Auth] Login successful for @${profile.username}`);
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${jwtToken}&username=${encodeURIComponent(profile.username)}`);

  } catch (err) {
    console.error('[Auth] Callback error:', err.response?.data || err.message);
    res.redirect(`${FRONTEND_URL}/auth/error?reason=oauth_failed`);
  }
});

// ── GET /api/auth/me ───────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, full_name, profile_picture, plan, pro_expires_at, total_comments_exported, created_at')
    .eq('id', req.user.userId)
    .single();

  if (error) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ── POST /api/auth/logout ──────────────────────
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ success: true });
});

module.exports = router;
EOF
echo "auth.js rewritten for new Instagram API"
