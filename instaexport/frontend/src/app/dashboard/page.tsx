'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { postsApi, razorpayApi, authApi } from '@/lib/api';
import {
  Instagram, RefreshCw, LogOut, Search, Film,
  Image as ImageIcon, Grid3x3, Crown, AlertCircle,
  MessageCircle, Heart, BarChart3, Settings,
  TrendingUp, Download, ChevronRight
} from 'lucide-react';
import PostCard from '@/components/dashboard/PostCard';
import UpgradeModal from '@/components/dashboard/UpgradeModal';

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'>('all');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [noIgWarning, setNoIgWarning] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (params.get('warning') === 'no_ig_account') setNoIgWarning(true);
  }, [params]);

  const { data: posts = [], isLoading: postsLoading, refetch, isRefetching } = useQuery({
    queryKey: ['posts'],
    queryFn: () => postsApi.list(),
    enabled: isAuthenticated,
    retry: 2,
  });

  const filteredPosts = posts
    .filter((p: any) => filter === 'all' || p.media_type === filter)
    .filter((p: any) => !search || (p.caption || '').toLowerCase().includes(search.toLowerCase()));

  const totalComments = posts.reduce((sum: number, p: any) => sum + (p.comment_count || 0), 0);
  const totalLikes = posts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0);

  const handlePortal = async () => {
    try {
      const { plan, expiresAt } = await razorpayApi.subscriptionStatus();
      alert(`Plan: ${plan}\nExpires: ${expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Active'}`);
    } catch { alert('Could not fetch subscription status.'); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F6F3' }}>
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F7F6F3' }}>

      {/* ── SIDEBAR ──────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col fixed h-full z-20">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
              <Instagram className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">CommentExport</span>
          </div>
        </div>

        {/* User profile */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">@{user?.username}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {user?.plan === 'pro' ? (
                  <span className="badge-pro text-xs flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5" />Pro
                  </span>
                ) : (
                  <span className="badge-free text-xs">Free plan</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">General</p>
          <div className="sidebar-link active">
            <Grid3x3 className="w-4 h-4" />
            Dashboard
          </div>
          <div className="sidebar-link" onClick={() => refetch()}>
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Sync posts
          </div>
          <div className="sidebar-link" onClick={() => setShowUpgradeModal(true)}>
            <Download className="w-4 h-4" />
            Exports
          </div>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2 mt-5">Account</p>
          {user?.plan === 'pro' && (
            <div className="sidebar-link" onClick={handlePortal}>
              <Settings className="w-4 h-4" />
              Subscription
            </div>
          )}
          {user?.plan === 'free' && (
            <div
              className="sidebar-link text-purple-600 hover:bg-purple-50 hover:text-purple-700"
              onClick={() => setShowUpgradeModal(true)}
            >
              <Crown className="w-4 h-4" />
              Upgrade to Pro
            </div>
          )}
        </nav>

        {/* Upgrade banner (free only) */}
        {user?.plan === 'free' && (
          <div className="mx-3 mb-3 p-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl text-white">
            <Crown className="w-5 h-5 mb-2 opacity-80" />
            <p className="text-xs font-bold mb-1">Upgrade to Pro</p>
            <p className="text-xs opacity-80 mb-3">Unlimited comments on all posts. ₹750/month.</p>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
            >
              Upgrade now →
            </button>
          </div>
        )}

        {/* Logout */}
        <div className="px-3 pb-4 border-t border-gray-100 pt-3">
          <button onClick={logout} className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────── */}
      <main className="flex-1 ml-64 min-h-screen">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.full_name?.split(' ')[0] || user?.username} 👋
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Here are your Instagram posts ready to export</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="btn-secondary text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                Sync
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* No IG warning */}
          {noIgWarning && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Instagram account not linked</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your Facebook account doesn't have an Instagram Business or Creator account connected.
                  Go to Instagram app → Settings → Account → Switch to Professional Account, then reconnect.
                </p>
                <button
                  onClick={() => window.location.href = authApi.loginUrl()}
                  className="mt-2 text-xs font-semibold text-amber-700 underline"
                >
                  Reconnect →
                </button>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total posts', value: posts.length, icon: Grid3x3, color: 'text-purple-500', bg: 'bg-purple-50' },
              { label: 'Total comments', value: totalComments.toLocaleString(), icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
              { label: 'Total likes', value: totalLikes.toLocaleString(), icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
              { label: 'Exported', value: (user?.total_comments_exported || 0).toLocaleString(), icon: Download, color: 'text-green-500', bg: 'bg-green-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card p-5">
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className={`w-4.5 h-4.5 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts by caption..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
              {[
                { key: 'all', icon: Grid3x3, label: 'All' },
                { key: 'IMAGE', icon: ImageIcon, label: 'Photos' },
                { key: 'VIDEO', icon: Film, label: 'Reels' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filter === key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Posts */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
              {search && <span className="text-gray-400 font-normal"> matching "{search}"</span>}
            </h2>
          </div>

          {postsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card h-72 animate-pulse bg-gray-100" />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="card p-16 text-center">
              <Instagram className="w-12 h-12 mx-auto mb-4 text-gray-200" />
              <p className="font-semibold text-gray-700 mb-1">
                {posts.length === 0 ? 'No posts loaded yet' : 'No posts match your search'}
              </p>
              <p className="text-sm text-gray-400 mb-5">
                {posts.length === 0 ? 'Click Sync to load your Instagram posts' : 'Try clearing the filter'}
              </p>
              {posts.length === 0 && (
                <button onClick={() => refetch()} className="btn-primary mx-auto">
                  <RefreshCw className="w-4 h-4" />
                  Sync posts
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPosts.map((post: any) => (
                <PostCard key={post.id} post={post} userPlan={user?.plan || 'free'} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
}
