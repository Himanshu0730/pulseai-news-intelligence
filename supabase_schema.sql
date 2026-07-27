-- PulseAI Supabase Database Schema
-- Paste this script into the Supabase SQL Editor and click 'Run'.

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create User Interests Table
CREATE TABLE IF NOT EXISTS user_interests (
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, category)
);

-- 3. Create Bookmarks Table
CREATE TABLE IF NOT EXISTS bookmarks (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    url TEXT NOT NULL,
    url_to_image TEXT,
    published_at TEXT,
    source_name TEXT,
    category TEXT,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id)
);

-- 4. Create Summaries Cache Table
CREATE TABLE IF NOT EXISTS summaries (
    article_id VARCHAR(255) PRIMARY KEY,
    article_url TEXT NOT NULL,
    tldr TEXT NOT NULL,
    key_points JSONB NOT NULL,
    analysis JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_user ON user_interests(user_id);
