'use client';

import { useRouter } from 'next/navigation';
import { MessageCircle, Heart, Film, Image as ImageIcon, Grid3x3, ArrowUpRight, Crown } from 'lucide-react';

interface Post {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  comment_count: number;
  like_count: number;
  timestamp: string;
}

export default function PostCard({ post, userPlan }: { post: Post; userPlan: string }) {
  const router = useRouter();

  const typeLabel = post.media_type === 'VIDEO' ? 'Reel'
    : post.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : 'Photo';

  const typeIcon = post.media_type === 'VIDEO' ? Film
    : post.media_type === 'CAROUSEL_ALBUM' ? Grid3x3 : ImageIcon;

  const TypeIcon = typeIcon;

  const timeAgo = (ts: string) => {
    const days = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const isLarge = post.comment_count > 500;
  const needsUpgrade = isLarge && userPlan === 'free';

  return (
    <div
      className="card overflow-hidden cursor-pointer group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      onClick={() => router.push(`/dashboard/${post.id}`)}
    >
      {/* Thumbnail */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {post.thumbnail_url || post.media_url ? (
          <img
            src={post.thumbnail_url || post.media_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-gray-300" />
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
          <TypeIcon className="w-3 h-3" />
          {typeLabel}
        </div>

        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
          <MessageCircle className="w-3 h-3" />
          {post.comment_count.toLocaleString()}
        </div>

        {/* Arrow on hover */}
        <div className="absolute top-3 right-3 w-7 h-7 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
          <ArrowUpRight className="w-3.5 h-3.5 text-gray-700" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed mb-3 min-h-[40px]">
          {post.caption || <span className="text-gray-400 italic">No caption</span>}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {post.like_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {post.comment_count.toLocaleString()}
            </span>
          </div>
          <span>{timeAgo(post.timestamp)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className={`px-4 py-2.5 border-t flex items-center justify-between ${
        needsUpgrade ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'
      }`}>
        {needsUpgrade ? (
          <>
            <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
              <Crown className="w-3 h-3" />
              {(post.comment_count - 500).toLocaleString()} more locked
            </span>
            <span className="text-xs text-amber-600 font-semibold">Unlock →</span>
          </>
        ) : (
          <>
            <span className="text-xs text-gray-500">Click to export</span>
            <span className="text-xs text-purple-600 font-semibold group-hover:underline">Export →</span>
          </>
        )}
      </div>
    </div>
  );
}
