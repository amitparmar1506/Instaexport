'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  Instagram, Download, FileText, Search, BarChart3,
  Check, ArrowRight, X, AlertTriangle, Zap, Shield,
  Users, ChevronRight, Star, Clock, RefreshCw
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Animated comment thread demo
function CommentThreadDemo() {
  const comments = [
    { user: 'sarah_creates', text: 'This is exactly what I needed! 🔥', likes: 142, depth: 0, delay: 0 },
    { user: 'mark_design', text: 'Tag a friend who needs this →', likes: 89, depth: 0, delay: 200 },
    { user: 'priya.official', text: '@mark_design already tagging everyone 😂', likes: 34, depth: 1, delay: 400 },
    { user: 'john_growth', text: 'How do I enter the giveaway?', likes: 12, depth: 0, delay: 600 },
    { user: 'brand_account', text: 'Just comment below with your city! 🌍', likes: 67, depth: 1, delay: 800 },
    { user: 'alex.photo', text: 'Mumbai! 🙌', likes: 5, depth: 2, delay: 1000 },
  ];

  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(v => v < comments.length ? v + 1 : v);
    }, 400);
    return () => clearInterval(timer);
  }, []);

  const avatarColors = ['#7C3AED','#DB2777','#0891B2','#059669','#D97706','#DC2626'];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-5 space-y-3 min-h-[320px]">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-medium text-gray-500">Live comment thread</span>
        <span className="ml-auto text-xs text-gray-400">2,847 comments</span>
      </div>
      {comments.slice(0, visible).map((c, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 animate-fade-in"
          style={{ marginLeft: c.depth * 24 }}
        >
          {c.depth > 0 && (
            <div className="absolute" style={{ marginLeft: -13, marginTop: 8, width: 1, height: 20, background: '#e5e7eb' }} />
          )}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: avatarColors[i % avatarColors.length] }}
          >
            {c.user[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-gray-900">@{c.user}</span>
              {c.likes > 50 && <span className="text-xs text-rose-500">❤️ {c.likes}</span>}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{c.text}</p>
          </div>
        </div>
      ))}
      {visible >= comments.length && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
          <span className="text-xs text-gray-400">Exporting...</span>
        </div>
      )}
    </div>
  );
}

// Problem card
function ProblemCard({ icon: Icon, title, desc, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

// Comparison table row
function CompareRow({ feature, others, us }: any) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3.5 border-b border-gray-100 last:border-0 items-center">
      <span className="text-sm text-gray-700">{feature}</span>
      <div className="flex items-center gap-2">
        <X className="w-4 h-4 text-red-400 flex-shrink-0" />
        <span className="text-xs text-gray-500">{others}</span>
      </div>
      <div className="flex items-center gap-2">
        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
        <span className="text-xs text-gray-700 font-medium">{us}</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, isLoading, router]);

  const handleLogin = () => {
    window.location.href = `${API_URL}/api/auth/instagram`;
  };

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F3', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

      {/* ── NAV ──────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
              <Instagram className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">CommentExport</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
            <a href="#problems" className="hover:text-gray-900 transition-colors">Why us</a>
            <a href="#how" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#compare" className="hover:text-gray-900 transition-colors">Compare</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          </div>

          <button onClick={handleLogin} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
            Get started free
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold mb-6 border border-purple-100">
              <Zap className="w-3 h-3" />
              Built for creators & giveaway managers
            </div>

            <h1 className="text-5xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-5">
              Export every
              <span className="relative mx-3">
                <span className="relative z-10 text-purple-600">comment</span>
                <span className="absolute inset-x-0 bottom-1 h-3 bg-purple-100 -z-0 rounded" />
              </span>
              from your Instagram posts
            </h1>

            <p className="text-lg text-gray-500 mb-8 leading-relaxed">
              Running a giveaway? Need to find the winner from 50,000 comments?
              CommentExport fetches every comment, preserves thread structure,
              and exports clean CSV or PDF in minutes — not hours.
            </p>

            <div className="flex items-center gap-3 mb-8 flex-wrap">
              <button
                onClick={handleLogin}
                className="flex items-center gap-2.5 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 active:scale-95 transition-all shadow-lg shadow-purple-200"
              >
                <Instagram className="w-5 h-5" />
                Connect Instagram — it's free
              </button>
              <span className="text-xs text-gray-400">No credit card · 500 comments free</span>
            </div>

            <div className="flex items-center gap-6">
              {[
                { icon: Users, label: 'Real @usernames preserved' },
                { icon: Shield, label: 'Official Meta API only' },
                { icon: Download, label: 'CSV + PDF export' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Icon className="w-3.5 h-3.5 text-purple-500" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Live demo */}
          <div className="relative">
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-purple-100 rounded-full opacity-30 blur-3xl" />
            <div className="relative">
              <CommentThreadDemo />
              {/* Floating export badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-2.5 flex items-center gap-2">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Export ready</p>
                  <p className="text-xs text-gray-400">2,847 comments · 1.2MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ────────────────────────── */}
      <section className="border-y border-gray-200 bg-white py-5">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-center gap-8 flex-wrap text-sm text-gray-400">
          {[
            '⚡ Exports up to 100,000+ comments',
            '🏆 Real usernames — never anonymized',
            '🔒 Official Meta Graph API',
            '📄 PDF preserves full thread topology',
            '🇮🇳 Indian payments via Razorpay',
          ].map(item => (
            <span key={item} className="font-medium">{item}</span>
          ))}
        </div>
      </section>

      {/* ── PROBLEMS ────────────────────────────── */}
      <section id="problems" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">The Problem</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-3">Why downloading Instagram comments is painful</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Every creator faces these when trying to manage giveaways or analyze engagement</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {[
            {
              icon: X,
              color: 'bg-red-50 text-red-500',
              title: 'Instagram has no export button',
              desc: 'There is literally no native way to download comments from Instagram. You are forced to manually scroll and copy — one by one.',
            },
            {
              icon: AlertTriangle,
              color: 'bg-amber-50 text-amber-500',
              title: 'Scrapers violate Meta ToS',
              desc: 'Most tools online use unauthorized scraping that violates Meta\'s terms, puts your account at risk, and breaks randomly when Instagram updates.',
            },
            {
              icon: RefreshCw,
              color: 'bg-blue-50 text-blue-500',
              title: 'Thread structure gets lost',
              desc: 'Flat CSV exports from other tools lose reply chains. You can\'t tell who replied to whom — critical for giveaways where "tag a friend" entries are threaded.',
            },
            {
              icon: Users,
              color: 'bg-purple-50 text-purple-500',
              title: 'Usernames replaced with IDs',
              desc: 'Other tools anonymize or replace Instagram usernames with random IDs. You can\'t identify the winner of your giveaway from a spreadsheet of "User_4821".',
            },
            {
              icon: Clock,
              color: 'bg-green-50 text-green-500',
              title: 'Posts with 10k+ comments time out',
              desc: 'Browser-based tools crash or time out on large posts. A viral giveaway post with 50,000 comments? Forget about it.',
            },
            {
              icon: FileText,
              color: 'bg-pink-50 text-pink-500',
              title: 'No PDF archive option',
              desc: 'You need a timestamped PDF proof of giveaway comments for transparency. No other tool provides a searchable, threaded PDF archive.',
            },
          ].map(p => <ProblemCard key={p.title} {...p} />)}
        </div>

        {/* Solution bridge */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">CommentExport solves all of these</h3>
          <p className="text-purple-100 mb-6 max-w-lg mx-auto">Using Meta's official Graph API — no scraping, no ToS violations, no anonymization. Just clean, complete, structured data.</p>
          <button onClick={handleLogin} className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-700 rounded-xl font-semibold hover:bg-purple-50 transition-colors">
            Try it free — 500 comments
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────── */}
      <section id="how" className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">How it works</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-3">From 0 to exported in 3 steps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: Instagram,
                title: 'Connect your Instagram',
                desc: 'Sign in with your Instagram Business or Creator account via Meta\'s official login. We never store your password.',
                color: 'from-purple-500 to-pink-500',
              },
              {
                step: '02',
                icon: Download,
                title: 'Pick a post',
                desc: 'Your posts load instantly. Click any post to start importing comments. We fetch in batches — handles 100k+ comments without breaking a sweat.',
                color: 'from-blue-500 to-cyan-500',
              },
              {
                step: '03',
                icon: FileText,
                title: 'Export CSV or PDF',
                desc: 'Download a clean CSV for spreadsheet analysis, or a beautiful PDF archive with full thread structure, real usernames, and timestamps.',
                color: 'from-amber-500 to-orange-500',
              },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <div key={step} className="relative p-6 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 shadow-sm`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="absolute top-5 right-5 text-4xl font-black text-gray-100">{step}</div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ──────────────────────────── */}
      <section id="compare" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Why us</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-3">How we compare to other tools</h2>
          <p className="text-gray-500 max-w-lg mx-auto">Other tools cut corners. We don't.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-500">Feature</span>
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-gray-700">Other tools</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-md flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-purple-700">CommentExport</span>
            </div>
          </div>

          <div className="px-6">
            {[
              { feature: 'Real @usernames in export', others: 'Replaced with random IDs', us: 'Always preserved' },
              { feature: 'Thread/reply structure', others: 'Flattened, lost forever', us: 'Full hierarchy preserved' },
              { feature: 'PDF export', others: 'Not available', us: 'Instagram-style PDF archive' },
              { feature: 'Large posts (10k+ comments)', others: 'Crashes or times out', us: 'Background batching, no limits' },
              { feature: 'Meta ToS compliance', others: 'Scraping — violates ToS', us: 'Official Graph API only' },
              { feature: 'Account safety', others: 'Risk of ban', us: 'Zero risk — read-only API' },
              { feature: 'Free tier', others: 'Paid only or watermarked', us: '500 comments free, no watermark' },
            ].map(row => <CompareRow key={row.feature} {...row} />)}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────── */}
      <section id="pricing" className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Pricing</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-3">Simple, creator-friendly pricing</h2>
            <p className="text-gray-500">Pay only when you need to go beyond the free limit</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600 mb-4">Free forever</div>
              <div className="text-4xl font-black text-gray-900 mb-1">₹0</div>
              <p className="text-sm text-gray-500 mb-6">No card needed</p>
              <ul className="space-y-3 mb-6">
                {['500 comments per post', 'CSV + PDF export', 'Real usernames', 'Comment search', 'Thread structure'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={handleLogin} className="w-full py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
                Start free
              </button>
            </div>

            {/* Single post */}
            <div className="rounded-2xl border border-blue-200 p-6 bg-blue-50/50">
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mb-4">One post</div>
              <div className="text-4xl font-black text-gray-900 mb-1">₹170</div>
              <p className="text-sm text-gray-500 mb-6">One-time · ~$2</p>
              <ul className="space-y-3 mb-6">
                {['Unlimited comments (1 post)', 'Full CSV + PDF', 'Priority processing', 'No subscription needed', 'Instant access'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={handleLogin} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                Buy for ₹170
              </button>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-purple-500 p-6 bg-white relative shadow-lg shadow-purple-100">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow">Most popular</span>
              </div>
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 mb-4">Pro</div>
              <div className="text-4xl font-black text-gray-900 mb-1">₹750<span className="text-lg font-normal text-gray-400">/mo</span></div>
              <p className="text-sm text-gray-500 mb-6">Renew anytime · ~$9</p>
              <ul className="space-y-3 mb-6">
                {['Unlimited comments on ALL posts', 'CSV + PDF on everything', 'Bulk export', 'Analytics dashboard', 'Priority processing', '30 days access'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={handleLogin} className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-md shadow-purple-200">
                Get Pro — ₹750/month
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Creators love it</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              name: 'Priya Sharma',
              handle: '@priyacreates',
              avatar: 'P',
              color: '#7C3AED',
              text: 'I ran a giveaway with 12,000 comments. CommentExport got me every single comment with usernames in 10 minutes. Used to take me hours manually.',
              stars: 5,
            },
            {
              name: 'Rahul Mehta',
              handle: '@rahul.brand',
              avatar: 'R',
              color: '#0891B2',
              text: 'The PDF export is a game changer. I send clients a beautiful PDF of their giveaway comments as proof of engagement. Looks incredibly professional.',
              stars: 5,
            },
            {
              name: 'Sneha K.',
              handle: '@sneha.digital',
              avatar: 'S',
              color: '#DB2777',
              text: 'Other tools replaced usernames with random IDs. CommentExport keeps real @usernames so I can actually DM the winner. This is the only tool that gets it right.',
              stars: 5,
            },
          ].map(t => (
            <div key={t.handle} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: t.color }}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.handle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 opacity-10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-600 opacity-10 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-white mb-3">Start your first export today</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">500 comments free. No credit card. Works on any Business or Creator Instagram account.</p>
            <button
              onClick={handleLogin}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-colors text-sm shadow-xl"
            >
              <Instagram className="w-5 h-5" />
              Connect Instagram — Free
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-lg flex items-center justify-center">
              <Instagram className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">CommentExport</span>
            <span className="text-gray-300 text-sm mx-2">·</span>
            <span className="text-xs text-gray-400">Not affiliated with Meta or Instagram</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-gray-400">
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-700 transition-colors">Terms & Conditions</Link>
            <a href="mailto:amitparmar8428@gmail.com" className="hover:text-gray-700 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
