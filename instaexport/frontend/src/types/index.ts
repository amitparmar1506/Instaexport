export interface User {
  id: string;
  instagram_user_id: string;
  username: string;
  full_name: string;
  profile_picture: string;
  plan: 'free' | 'pro';
  payment_customer_id?: string;
  pro_expires_at: string | null;
  total_comments_exported: number;
  created_at: string;
}

export interface Post {
  id: string;
  instagram_media_id: string;
  user_id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  comment_count: number;
  like_count: number;
  timestamp: string;
  last_synced_at?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  instagram_comment_id: string;
  commenter_instagram_id?: string;
  commenter_username: string;
  text: string;
  like_count: number;
  parent_id: string | null;
  depth: number;
  instagram_timestamp: string;
  reply_count?: number; // virtual field added by API
}

export interface ExportJob {
  id: string;
  user_id: string;
  post_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  total_comments: number;
  processed_comments: number;
  error_message?: string;
  export_format: 'csv' | 'pdf' | 'json';
  next_cursor?: string;
  created_at: string;
  updated_at: string;
}

export interface PostAnalytics {
  id: string;
  post_id: string;
  total_comments: number;
  total_replies: number;
  unique_commenters: number;
  reply_ratio: number;
  max_depth: number;
  depth_distribution: Record<string, number>;
  hourly_activity: { hour: number; comments: number }[];
  top_comments: { id: string; username: string; likes: number }[];
  computed_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  post_id: string;
  payment_intent_id?: string;
  payment_session_id?: string;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'completed' | 'refunded';
  purchase_type: 'single_post' | 'pro_monthly';
  created_at: string;
}

export interface PaginatedResponse<T> {
  comments: T[];
  total: number;
  page: number;
  pages: number;
}
