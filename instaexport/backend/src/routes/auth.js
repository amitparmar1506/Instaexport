require('dotenv').config();
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

const FB_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const FB_TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token';
const FB_GRAPH_URL = 'https://graph.facebook.com/v19.0';

const BACKEND_URL = (process.env.BACKEND_URL || '').replace(/\/$/, '');
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

// ── GET /api/auth/instagram ────────────────────
router.get('/instagram', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_CLIENT_ID,
    redirect_uri: `${BACKEND_URL}/api/auth/callback`,
    scope: 'public_profile',
    response_type: 'code',
    state: Math.random().toString(36).substring(7),
  });
  res.redirect(`${FB_AUTH_URL}?${params}`);
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
    const tokenRes = await axios.get(FB_TOKEN_URL, {
      params: {
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        redirect_uri: `${BACKEND_URL}/api/auth/callback`,
        code,
      }
    });

    const { access_token: shortToken } = tokenRes.data;

    // 2. Exchange for long-lived token (60 days)
    const longTokenRes = await axios.get(`${FB_GRAPH_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        fb_exchange_token: shortToken,
      }
    });

    const { access_token: longToken, expires_in } = longTokenRes.data;

    // 3. Get Facebook user profile
    const meRes = await axios.get(`${FB_GRAPH_URL}/me`, {
      params: {
        fields: 'id,name,picture',
        access_token: longToken,
      }
    });

    const fbUser = meRes.data;
    let igAccountId = null;
    let igUsername = null;
    let igPicture = fbUser.picture?.data?.url || null;
    let activeToken = longToken;

    // 4. Try to find Instagram account via Facebook Pages
    try {
      const pagesRes = await axios.get(`${FB_GRAPH_URL}/me/accounts`, {
        params: {
          fields: 'id,name,access_token,instagram_business_account',
          access_token: longToken,
        }
      });

      const pages = pagesRes.data?.data || [];
      console.log(`[Auth] Found ${pages.length} Facebook pages`);

      for (const page of pages) {
        if (page.instagram_business_account?.id) {
          igAccountId = page.instagram_business_account.id;
          activeToken = page.access_token || longToken;

          // Get Instagram profile details
          try {
            const igRes = await axios.get(`${FB_GRAPH_URL}/${igAccountId}`, {
              params: {
                fields: 'id,username,profile_picture_url',
                access_token: activeToken,
              }
            });
            igUsername = igRes.data.username;
            igPicture = igRes.data.profile_picture_url || igPicture;
          } catch (e) {
            console.log('[Auth] Could not fetch IG profile details:', e.message);
          }
          break;
        }
      }
    } catch (e) {
      console.log('[Auth] Could not fetch pages:', e.message);
    }

    // 5. Fallback — store with Facebook ID if no Instagram found
    const storedId = igAccountId || `fb_${fbUser.id}`;
    const username = igUsername || fbUser.name?.replace(/\s+/g, '').toLowerCase() || `user_${fbUser.id}`;
    const warning = !igAccountId ? 'no_ig_account' : null;

    console.log(`[Auth] Storing user — IG: ${igAccountId || 'not found'}, FB: ${fbUser.id}`);

    // 6. Upsert user
    const { data: user, error: dbError } = await supabase
      .from('users')
      .upsert({
        instagram_user_id: storedId,
        username,
        full_name: fbUser.name,
        profile_picture: igPicture,
        encrypted_access_token: activeToken,
        token_expires_at: new Date(Date.now() + (expires_in || 5184000) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'instagram_user_id', ignoreDuplicates: false })
      .select()
      .single();

    if (dbError) {
      console.error('[Auth] DB error:', dbError);
      throw dbError;
    }

    // 7. Issue JWT
    const jwtToken = jwt.sign(
      { userId: user.id, instagramUserId: user.instagram_user_id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 8. Redirect to frontend
    const redirectUrl = warning
      ? `${FRONTEND_URL}/auth/callback?token=${jwtToken}&username=${encodeURIComponent(username)}&warning=${warning}`
      : `${FRONTEND_URL}/auth/callback?token=${jwtToken}&username=${encodeURIComponent(username)}`;

    res.redirect(redirectUrl);

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
