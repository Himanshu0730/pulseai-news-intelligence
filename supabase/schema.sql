-- =========================================================
-- PulseAI News Intelligence Platform — Supabase Database Schema
-- =========================================================
-- Paste this entire script into:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =========================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- User Interests Table
CREATE TABLE IF NOT EXISTS user_interests (
  user_id VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, category)
);

-- Bookmarks Table
CREATE TABLE IF NOT EXISTS bookmarks (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  article_id VARCHAR(255) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  url TEXT NOT NULL,
  url_to_image TEXT,
  published_at TEXT,
  source_name TEXT,
  category TEXT,
  saved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Summaries Cache Table
CREATE TABLE IF NOT EXISTS summaries (
  article_id VARCHAR(255) PRIMARY KEY,
  article_url TEXT,
  tldr TEXT,
  key_points JSONB,
  analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_article_id ON bookmarks(article_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_article ON bookmarks(user_id, article_id);
