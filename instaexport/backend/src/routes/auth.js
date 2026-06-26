require('dotenv').config();
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

const GRAPH_API_VERSION = 'v21.0';
const BACKEND_URL = (process.env.BACKEND_URL || '').replace(/\/$/, '');
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

// ─────────────────────────────────────────────
// STEP 1: Redirect user to Meta login
// ─────────────────────────────────────────────
router.get('/instagram', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_CLIENT_ID, // META APP ID
    redirect_uri: `${BACKEND_URL}/api/auth/callback`,
    response_type: 'code',
    scope: [
      'instagram_basic',
      'instagram_manage_comments',
      'pages_show_list',
      'pages_read_engagement'
    ].join(','),
  });

  const authUrl =
    `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;

  return res.redirect(authUrl);
});

// ─────────────────────────────────────────────
// STEP 2: OAuth callback
// ─────────────────────────────────────────────
router.get('/callback', async (req, res) => {
  const { code, error, error_reason } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/auth/error?reason=${error_reason || error}`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/auth/error?reason=no_code`);
  }

  try {
    // ─────────────────────────────────────────────
    // 1. Exchange code for short-lived token
    // ─────────────────────────────────────────────
    const tokenRes = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`,
      {
        params: {
          client_id: process.env.INSTAGRAM_CLIENT_ID,
          client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
          redirect_uri: `${BACKEND_URL}/api/auth/callback`,
          code,
        },
      }
    );

    const { access_token } = tokenRes.data;

    // ─────────────────────────────────────────────
    // 2. Get Facebook Pages connected to user
    // (Required step for Instagram Graph API)
    // ─────────────────────────────────────────────
    const pagesRes = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts`,
      {
        params: { access_token },
      }
    );

    const page = pagesRes.data?.data?.[0];
    if (!page) {
      throw new Error('No Facebook Page connected to this account');
    }

    // ─────────────────────────────────────────────
    // 3. Get Instagram Business Account ID
    // ─────────────────────────────────────────────
    const igRes = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${page.id}`,
      {
        params: {
          fields: 'instagram_business_account',
          access_token: page.access_token,
        },
      }
    );

    const igUserId = igRes.data?.instagram_business_account?.id;

    if (!igUserId) {
      throw new Error('No Instagram Business account linked to this Page');
    }

    // ─────────────────────────────────────────────
    // 4. Get Instagram profile
    // ─────────────────────────────────────────────
    const profileRes = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}`,
      {
        params: {
          fields: 'id,username,name,profile_picture_url,followers_count,media_count',
          access_token: page.access_token,
        },
      }
    );

    const profile = profileRes.data;

    // ─────────────────────────────────────────────
    // 5. Store / update user in DB
    // ─────────────────────────────────────────────
    const { data: user, error: dbError } = await supabase
      .from('users')
      .upsert(
        {
          instagram_user_id: String(profile.id),
          username: profile.username,
          full_name: profile.name || profile.username,
          profile_picture: profile.profile_picture_url,
          encrypted_access_token: page.access_token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'instagram_user_id' }
      )
      .select()
      .single();

    if (dbError) throw dbError;

    // ─────────────────────────────────────────────
    // 6. Issue JWT
    // ─────────────────────────────────────────────
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        instagramUserId: profile.id,
        username: profile.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.redirect(
      `${FRONTEND_URL}/auth/callback?token=${jwtToken}&username=${encodeURIComponent(
        profile.username
      )}`
    );
  } catch (err) {
    console.error('[AUTH ERROR]', err.response?.data || err.message);

    return res.redirect(
      `${FRONTEND_URL}/auth/error?reason=oauth_failed`
    );
  }
});

// ─────────────────────────────────────────────
// STEP 3: Get current user
// ─────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select(
      'id, username, full_name, profile_picture, plan, created_at'
    )
    .eq('id', req.user.userId)
    .single();

  if (error) return res.status(404).json({ error: 'User not found' });

  res.json(data);
});

// ─────────────────────────────────────────────
// STEP 4: Logout (client-side JWT only)
// ─────────────────────────────────────────────
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ success: true });
});

module.exports = router;
