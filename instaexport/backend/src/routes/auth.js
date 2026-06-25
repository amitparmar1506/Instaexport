const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

// ── New Instagram Graph API via Facebook Login ──
// Meta deprecated Instagram Basic Display API in 2024
// Now uses: Facebook OAuth → get FB user token → get IG account → get IG token

const FB_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const FB_TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token';
const FB_GRAPH_URL = 'https://graph.facebook.com/v19.0';

// ── GET /api/auth/instagram ────────────────────
// Redirect user to Facebook OAuth (which includes Instagram)
router.get('/instagram', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_CLIENT_ID,
    redirect_uri: `${process.env.BACKEND_URL}/api/auth/callback`,
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
    return res.redirect(`${process.env.FRONTEND_URL}/auth/error?reason=${error}`);
  }

  try {
    // 1. Exchange code for Facebook user access token
    const tokenResponse = await axios.get(FB_TOKEN_URL, {
      params: {
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        redirect_uri: `${process.env.BACKEND_URL}/api/auth/callback`,
        code,
      }
    });

    const { access_token: fbToken, expires_in } = tokenResponse.data;

    // 2. Get long-lived Facebook token (60 days)
    const longTokenResponse = await axios.get(`${FB_GRAPH_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        fb_exchange_token: fbToken,
      }
    });

    const { access_token: longFbToken, expires_in: longExpiry } = longTokenResponse.data;

    // 3. Get Facebook Pages linked to this user
    const pagesResponse = await axios.get(`${FB_GRAPH_URL}/me/accounts`, {
      params: {
        access_token: longFbToken,
        fields: 'id,name,access_token,instagram_business_account',
      }
    });

    const pages = pagesResponse.data.data || [];

    // 4. Find the page that has an Instagram Business Account linked
    let igAccountId = null;
    let igPageToken = null;
    let igPageName = null;

    for (const page of pages) {
      if (page.instagram_business_account) {
        igAccountId = page.instagram_business_account.id;
        igPageToken = page.access_token;
        igPageName = page.name;
        break;
      }
    }

    // 5. If no page found, try getting IG account directly from user token
    if (!igAccountId) {
      try {
        const meResponse = await axios.get(`${FB_GRAPH_URL}/me`, {
          params: {
            fields: 'id,name,instagram_business_account',
            access_token: longFbToken,
          }
        });
        if (meResponse.data.instagram_business_account) {
          igAccountId = meResponse.data.instagram_business_account.id;
          igPageToken = longFbToken;
        }
      } catch (e) {
        console.log('[Auth] No direct IG account found, trying pages...');
      }
    }

    if (!igAccountId) {
      // No Instagram Business/Creator account found
      // Store user with FB token anyway — they can still use the app
      // but will see a message to connect their Instagram
      const fbMeResponse = await axios.get(`${FB_GRAPH_URL}/me`, {
        params: { fields: 'id,name,email,picture', access_token: longFbToken }
      });

      const fbUser = fbMeResponse.data;

      const { data: user, error: dbError } = await supabase
        .from('users')
        .upsert({
          instagram_user_id: `fb_${fbUser.id}`,
          username: fbUser.name?.replace(/\s+/g, '').toLowerCase() || `user_${fbUser.id}`,
          full_name: fbUser.name,
          profile_picture: fbUser.picture?.data?.url,
          encrypted_access_token: longFbToken,
          token_expires_at: new Date(Date.now() + (longExpiry || 5184000) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'instagram_user_id' })
        .select()
        .single();

      if (dbError) throw dbError;

      const jwtToken = jwt.sign(
        { userId: user.id, instagramUserId: user.instagram_user_id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}&username=${user.username}&warning=no_ig_account`
      );
    }

    // 6. Get Instagram account details
    const igProfileResponse = await axios.get(`${FB_GRAPH_URL}/${igAccountId}`, {
      params: {
        fields: 'id,username,name,profile_picture_url,followers_count',
        access_token: igPageToken || longFbToken,
      }
    });

    const igProfile = igProfileResponse.data;

    // 7. Upsert user in DB
    const { data: user, error: dbError } = await supabase
      .from('users')
      .upsert({
        instagram_user_id: String(igAccountId),
        username: igProfile.username || igPageName || `user_${igAccountId}`,
        full_name: igProfile.name || igProfile.username,
        profile_picture: igProfile.profile_picture_url,
        encrypted_access_token: igPageToken || longFbToken,
        token_expires_at: new Date(Date.now() + (longExpiry || 5184000) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'instagram_user_id', ignoreDuplicates: false })
      .select()
      .single();

    if (dbError) throw dbError;

    // 8. Issue JWT
    const jwtToken = jwt.sign(
      { userId: user.id, instagramUserId: user.instagram_user_id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}&username=${user.username}`);

  } catch (err) {
    console.error('[Auth] OAuth callback error:', err.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?reason=oauth_failed`);
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
