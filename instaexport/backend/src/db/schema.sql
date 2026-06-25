-- ============================================
-- InstaExport Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instagram_user_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  full_name TEXT,
  profile_picture TEXT,
  encrypted_access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,

  -- Subscription
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  payment_customer_id TEXT,
  payment_subscription_id TEXT,
  pro_expires_at TIMESTAMPTZ,

  -- Usage tracking
  total_comments_exported INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POSTS
-- ============================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  instagram_media_id TEXT NOT NULL,
  caption TEXT,
  media_type TEXT CHECK (media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM')),
  media_url TEXT,
  thumbnail_url TEXT,
  permalink TEXT,
  comment_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, instagram_media_id)
);

-- ============================================
-- COMMENTS
-- ============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  instagram_comment_id TEXT NOT NULL,

  -- Anonymized user info
  commenter_instagram_id TEXT,
  commenter_username TEXT,

  text TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,

  -- Threading
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  depth INTEGER DEFAULT 0,

  instagram_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, instagram_comment_id)
);

-- Index for fast thread queries
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_depth ON comments(post_id, depth);

-- ============================================
-- JOBS
-- ============================================
CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
  progress INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  processed_comments INTEGER DEFAULT 0,
  error_message TEXT,
  result_url TEXT,
  export_format TEXT CHECK (export_format IN ('csv', 'pdf', 'json')),
  next_cursor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_user_id ON export_jobs(user_id);
CREATE INDEX idx_jobs_status ON export_jobs(status);

-- ============================================
-- PURCHASES (one-time unlocks)
-- ============================================
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  payment_intent_id TEXT UNIQUE,
  payment_session_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
  purchase_type TEXT CHECK (purchase_type IN ('single_post', 'pro_monthly')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS CACHE
-- ============================================
CREATE TABLE post_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE UNIQUE,
  total_comments INTEGER DEFAULT 0,
  total_replies INTEGER DEFAULT 0,
  unique_commenters INTEGER DEFAULT 0,
  reply_ratio DECIMAL(5,4) DEFAULT 0,
  max_depth INTEGER DEFAULT 0,
  depth_distribution JSONB DEFAULT '{}',
  hourly_activity JSONB DEFAULT '[]',
  top_comments JSONB DEFAULT '[]',
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEARCH INDEX
-- ============================================
CREATE TABLE comment_search_index (
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  search_vector TSVECTOR
);

CREATE INDEX idx_search_vector ON comment_search_index USING GIN(search_vector);

-- Function to update search index
CREATE OR REPLACE FUNCTION update_comment_search()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO comment_search_index(comment_id, post_id, search_vector)
  VALUES (NEW.id, NEW.post_id, to_tsvector('english', COALESCE(NEW.text, '')))
  ON CONFLICT (comment_id) DO UPDATE
  SET search_vector = to_tsvector('english', COALESCE(NEW.text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_search_trigger
AFTER INSERT OR UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_comment_search();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (backend uses this)
-- Frontend uses anon key — no direct DB access

-- ============================================
-- UPDATED_AT trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON export_jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STORAGE BUCKET (run separately in Supabase dashboard)
-- ============================================
-- Create a bucket named "exports" with:
-- Public: false
-- File size limit: 50MB
-- Allowed types: text/csv, application/pdf, application/json
