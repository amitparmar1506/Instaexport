'use client';

import { useState, useEffect } from 'react';
import { X, Crown, Zap, Check } from 'lucide-react';
import { razorpayApi } from '@/lib/api';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
  postId?: string;
  commentCount?: number;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function UpgradeModal({ onClose, onSuccess, postId, commentCount }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    if (window.Razorpay) { setScriptLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
  }, []);

  const handlePayment = async (type: 'pro_monthly' | 'single_post') => {
    if (!scriptLoaded) {
      alert('Payment system loading, please try again in a moment.');
      return;
    }

    setLoading(type);

    try {
      // 1. Create order on backend
      const order = await razorpayApi.createOrder(type, postId);

      // 2. Open Razorpay checkout
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'CommentExport',
        description: type === 'pro_monthly' ? 'Pro Plan - Monthly' : 'Single Post Export',
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            // 3. Verify payment on backend
            await razorpayApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              type,
              postId,
            });

            // 4. Success
            onSuccess?.();
            onClose();
            window.location.reload(); // refresh to show unlocked state
          } catch (err) {
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {},
        theme: { color: '#9333ea' },
        modal: {
          ondismiss: () => setLoading(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error('[Razorpay] Error:', err);
      alert('Could not initiate payment. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">Unlock full export</h2>
            </div>
            {commentCount && (
              <p className="text-sm text-gray-500">
                You've reached the 500 comment free limit.
                This post has <strong>{commentCount.toLocaleString()}</strong> total comments.
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Single post */}
          {postId && (
            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-900">This post only</span>
                  </div>
                  <p className="text-sm text-gray-500">One-time, no subscription</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">₹170</span>
                  <p className="text-xs text-gray-400">~$2</p>
                </div>
              </div>
              <ul className="space-y-1.5 mb-4">
                {['All comments for this post', 'CSV export', 'PDF export', 'Instant access'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePayment('single_post')}
                disabled={loading === 'single_post'}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading === 'single_post' ? 'Opening payment...' : 'Pay ₹170 for this post →'}
              </button>
            </div>
          )}

          {/* Pro */}
          <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/50 relative">
            {!postId && (
              <div className="absolute -top-3 left-4">
                <span className="bg-purple-600 text-white text-xs font-medium px-3 py-0.5 rounded-full">Best value</span>
              </div>
            )}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-gray-900">Pro plan</span>
                </div>
                <p className="text-sm text-gray-500">30 days · renew anytime</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">₹750</span>
                <p className="text-xs text-gray-400">~$9/mo</p>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {[
                'Unlimited comments on ALL posts',
                'CSV + PDF export',
                'Priority processing',
                'Full analytics dashboard',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handlePayment('pro_monthly')}
              disabled={loading === 'pro_monthly'}
              className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading === 'pro_monthly' ? 'Opening payment...' : 'Get Pro — ₹750/month →'}
            </button>
          </div>
        </div>

        <div className="px-6 pb-4 text-center text-xs text-gray-400">
          Secured by Razorpay · UPI, Cards, NetBanking accepted
        </div>
      </div>
    </div>
  );
}
