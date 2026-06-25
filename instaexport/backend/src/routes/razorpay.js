const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Pricing in paise (INR) — 100 paise = ₹1
const PRICES = {
  single_post: 17000,  // ₹170 (~$2)
  pro_monthly: 75000,  // ₹750 (~$9)
};

// ── POST /api/razorpay/create-order ───────────
// Creates a Razorpay order and returns order_id to frontend
router.post('/create-order', authMiddleware, async (req, res) => {
  const { type, postId } = req.body;

  if (!PRICES[type]) return res.status(400).json({ error: 'Invalid purchase type' });

  try {
    const order = await razorpay.orders.create({
      amount: PRICES[type],
      currency: 'INR',
      receipt: `receipt_${req.user.userId}_${Date.now()}`,
      notes: {
        userId: req.user.userId,
        postId: postId || '',
        type,
      },
    });

    // Record pending purchase
    if (postId) {
      await supabase.from('purchases').insert({
        user_id: req.user.userId,
        post_id: postId,
        payment_session_id: order.id,
        amount_cents: PRICES[type],
        currency: 'inr',
        purchase_type: type,
        status: 'pending',
      });
    }

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[Razorpay] Create order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/razorpay/verify ──────────────────
// Verify payment signature after user pays
router.post('/verify', authMiddleware, async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    type,
    postId,
  } = req.body;

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  try {
    if (type === 'pro_monthly') {
      // Activate Pro — set expiry 30 days from now
      await supabase.from('users').update({
        plan: 'pro',
        payment_subscription_id: razorpay_payment_id,
        pro_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq('id', req.user.userId);
    }

    if (type === 'single_post' && postId) {
      // Unlock single post
      await supabase.from('purchases').update({
        status: 'completed',
        payment_intent_id: razorpay_payment_id,
      }).eq('payment_session_id', razorpay_order_id);
    }

    console.log(`[Razorpay] Payment verified: ${type} for user ${req.user.userId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[Razorpay] Verify error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/razorpay/subscription-status ─────
router.get('/subscription-status', authMiddleware, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('plan, pro_expires_at')
    .eq('id', req.user.userId)
    .single();

  const isActive = user?.plan === 'pro' &&
    (!user.pro_expires_at || new Date(user.pro_expires_at) > new Date());

  res.json({
    plan: user?.plan || 'free',
    isActive,
    expiresAt: user?.pro_expires_at,
  });
});

module.exports = router;
