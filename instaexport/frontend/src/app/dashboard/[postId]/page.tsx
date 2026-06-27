'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { postsApi, commentsApi, exportApi } from '@/lib/api';
import { useJobProgress } from '@/hooks/useJobProgress';
import {
  ArrowLeft, Download, FileText, Search,
  MessageCircle, Users, BarChart3, Crown,
  Loader2, ChevronDown, ChevronRight,
  Heart, Clock, Film, Image as ImageIcon,
  ExternalLink, RefreshCw
} from 'lucide-react';
import UpgradeModal from '@/components/dashboard/UpgradeModal';
import AnalyticsPanel from '@/components/comments/AnalyticsPanel';

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null);
  const [page, setPage] = useState(1);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<Record<string, any[]>>({});

  const job = useJobProgress(jobId);

  const { data: post } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsApi.get(postId),
  });

  const { data: commentsData, isLoading: commentsLoading, refetch: refetchComments } = useQuery({
    queryKey: ['comments', postId, page, search],
    queryFn: () => commentsApi.list(postId, { page, limit: 30, search: search || undefined }),
    enabled: !!postId,
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics', postId],
    queryFn: () => commentsApi.analytics(postId),
    enabled: showAnalytics,
  });

  useEffect(() => {
    if (!postId) return;
    commentsApi.ingest(postId).then(res => {
      setJobId(res.jobId);
      if (res.hitPaywall) setShowUpgrade(true);
    }).catch(console.error);
  }, [postId]);

  useEffect(() => {
    if (job?.status === 'completed') refetchComments();
    if (job?.status === 'paused') setShowUpgrade(true);
  }, [job?.status]);

  const toggleReplies = async (commentId: string) => {
    const next = new Set(expandedReplies);
    if (next.has(commentId)) {
      next.delete(commentId);
    } else {
      next.add(commentId);
      if (!replies[commentId]) {
        const data = await commentsApi.replies(postId, commentId);
        setReplies(prev => ({ ...prev, [commentId]: data.comments || [] }));
      }
    }
    setExpandedReplies(next);
  };

  const handleExport = async (type: 'csv' | 'pdf') => {
    setIsExporting(type);
    try {
      if (type === 'csv') await exportApi.downloadCsv(postId);
      else await exportApi.downloadPdf(postId);
    } catch (e: any) {
      if (e.message?.includes('402') || e.message?.includes('Payment')) setShowUpgrade(true);
      else alert(e.message || 'Export failed. Please try again.');
    }
    setIsExporting(null);
  };

  const isPro = user?.plan === 'pro';
  const comments = commentsData?.comments || [];
  const total = commentsData?.total || 0;
  const isIngesting = job && !['completed', 'failed', 'paused'].includes(job.status);

  return (
    <div className="min-h-screen flex" style={{ background: '#F7F6F3' }}>

      {/* ── SIDEBAR ─────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-100 fixed h-full z-20 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Comment Export</span>
          </div>
        </div>

        {/* Post thumbnail */}
        {post && (
          <div className="p-4 border-b border-gray-100">
            <div className="rounded-xl overflow-hidden bg-gray-100 mb-3 h-36">
              {post.thumbnail_url || post.media_url ? (
                <img src={post.thumbnail_url || post.media_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{post.caption || 'No caption'}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.comment_count?.toLocaleString()}</span>
              <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.like_count?.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Export actions */}
        <div className="p-4 space-y-2 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Export</p>
          <button
            onClick={() => handleExport('csv')}
            disabled={!!isExporting}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-blue-500" />
            {isExporting === 'csv' ? 'Exporting...' : 'Download CSV'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={!!isExporting}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-purple-500" />
            {isExporting === 'pdf' ? 'Generating PDF...' : 'Download PDF'}
            {!isPro && <span className="ml-auto text-xs text-amber-500 font-normal">500 limit</span>}
          </button>
          {!isPro && (
            <button
              onClick={() => setShowUpgrade(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-purple-600 hover:bg-purple-50 rounded-xl font-medium transition-colors"
            >
              <Crown className="w-3.5 h-3.5" />
              Unlock unlimited export
            </button>
          )}
        </div>

        {/* Analytics toggle */}
        <div className="p-4">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              showAnalytics ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            {showAnalytics ? 'Hide analytics' : 'Show analytics'}
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────── */}
      <main className="flex-1 ml-64">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-gray-900">Comment Viewer</h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-gray-500">{total.toLocaleString()} comments loaded</span>
                {isIngesting && (
                  <div className="flex items-center gap-2 text-xs text-purple-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Importing {job?.processed_comments?.toLocaleString()} / {job?.total_comments?.toLocaleString()}
                    <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${job?.progress || 0}%` }} />
                    </div>
                  </div>
                )}
                {job?.status === 'paused' && (
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    ⏸ Paused at free limit (500) · <button onClick={() => setShowUpgrade(true)} className="underline">Unlock more</button>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Analytics */}
          {showAnalytics && analytics && (
            <div className="mb-6">
              <AnalyticsPanel analytics={analytics} />
            </div>
          )}

          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search through comments..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
            />
          </div>

          {/* Comments */}
          {commentsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
            </div>
          ) : comments.length === 0 ? (
            <div className="card p-16 text-center">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="font-semibold text-gray-700">No comments yet</p>
              <p className="text-sm text-gray-400 mt-1">
                {isIngesting ? 'Comments are being imported...' : 'Sync to load comments'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment: any) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  isExpanded={expandedReplies.has(comment.id)}
                  onToggle={() => toggleReplies(comment.id)}
                  replies={replies[comment.id] || []}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {commentsData?.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs">Previous</button>
              <span className="text-sm text-gray-500">Page {page} of {commentsData.pages}</span>
              <button onClick={() => setPage(p => Math.min(commentsData.pages, p + 1))} disabled={page === commentsData.pages} className="btn-secondary text-xs">Next</button>
            </div>
          )}
        </div>
      </main>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} postId={postId} commentCount={post?.comment_count} />}
    </div>
  );
}

// Comment card component
const AVATAR_COLORS = ['#7C3AED','#DB2777','#0891B2','#059669','#D97706','#DC2626','#2563EB','#7C3AED'];

function CommentCard({ comment, isExpanded, onToggle, replies }: any) {
  const initial = (comment.commenter_username || '?')[0].toUpperCase();
  const colorIndex = comment.commenter_username?.charCodeAt(0) % AVATAR_COLORS.length || 0;
  const avatarColor = AVATAR_COLORS[colorIndex];
  const date = comment.instagram_timestamp
    ? new Date(comment.instagram_timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  return (
    <div className="card p-4 animate-fade-in">
      {/* Root comment */}
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: avatarColor }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-bold text-gray-900">@{comment.commenter_username || 'unknown'}</span>
            {comment.like_count > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-rose-400">
                <Heart className="w-3 h-3 fill-rose-400" />{comment.like_count}
              </span>
            )}
            {date && <span className="text-xs text-gray-400 ml-auto">{date}</span>}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{comment.text}</p>

          {comment.reply_count > 0 && (
            <button
              onClick={onToggle}
              className="flex items-center gap-1 mt-2 text-xs text-purple-600 hover:text-purple-800 font-semibold"
            >
              {isExpanded
                ? <><ChevronDown className="w-3.5 h-3.5" />Hide {comment.reply_count} replies</>
                : <><ChevronRight className="w-3.5 h-3.5" />{comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {isExpanded && replies.length > 0 && (
        <div className="mt-3 ml-12 space-y-3 pl-4 border-l-2 border-gray-100">
          {replies.map((reply: any) => {
            const rInitial = (reply.commenter_username || '?')[0].toUpperCase();
            const rColor = AVATAR_COLORS[reply.commenter_username?.charCodeAt(0) % AVATAR_COLORS.length || 0];
            return (
              <div key={reply.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: rColor }}>
                  {rInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-bold text-gray-800">@{reply.commenter_username}</span>
                    {reply.like_count > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-rose-400">
                        <Heart className="w-2.5 h-2.5 fill-rose-400" />{reply.like_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{reply.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
