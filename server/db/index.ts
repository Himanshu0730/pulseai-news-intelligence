import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface Bookmark {
  id: string;
  user_id: string;
  article_id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  url_to_image: string;
  published_at: string;
  source_name: string;
  category: string;
  saved_at: string;
}

interface Summary {
  article_id: string;
  article_url: string;
  tldr: string;
  key_points: string[];
  analysis: {
    sentiment?: string;
    bias?: string;
    reading_time?: string;
    key_entities?: string[];
  };
  created_at: string;
}

// In-Memory / File-backed fallback store if PostgreSQL is unavailable
const DATA_FILE = path.join(process.cwd(), '.data_store.json');

interface MemoryStore {
  users: Record<string, User>;
  user_interests: Record<string, string[]>; // user_id -> category[]
  bookmarks: Record<string, Bookmark>; // bookmark_id -> Bookmark
  summaries: Record<string, Summary>; // article_id -> Summary
  news_cache: Record<string, { data: any; expires_at: number }>;
  user_interactions: Record<string, Record<string, number>>; // user_id -> { topic: count }
}

let store: MemoryStore = {
  users: {},
  user_interests: {},
  bookmarks: {},
  summaries: {},
  news_cache: {},
  user_interactions: {},
};

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      store = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[DB] Could not load local data store, starting fresh', err);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[DB] Could not persist local data store', err);
  }
}

declare global {
  var __pulse_pg_pool: pg.Pool | null | undefined;
  var __pulse_db_initialized: boolean | undefined;
}

loadStore();

let pool: pg.Pool | null = null;
if (config.databaseUrl) {
  if (globalThis.__pulse_pg_pool !== undefined) {
    pool = globalThis.__pulse_pg_pool;
  } else {
    try {
      pool = new pg.Pool({
        connectionString: config.databaseUrl,
        ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
      });
      globalThis.__pulse_pg_pool = pool;
      console.log('[DB] Configured PostgreSQL Pool');
    } catch (e) {
      console.warn('[DB] Failed to instantiate PG Pool', e);
      pool = null;
      globalThis.__pulse_pg_pool = null;
    }
  }

  if (pool && !globalThis.__pulse_db_initialized) {
    globalThis.__pulse_db_initialized = true;
    initDatabase();
  }
} else {
  console.info('[DB] DATABASE_URL is not configured. Utilizing local file/memory store fallback.');
}

function checkProductionDbRequirement() {
  // Gracefully fallback to memory/file store if pool is not configured
  return;
}

async function initDatabase() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_interests (
        user_id VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        PRIMARY KEY (user_id, category)
      );

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
        saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS summaries (
        article_id VARCHAR(255) PRIMARY KEY,
        article_url TEXT,
        tldr TEXT,
        key_points JSONB,
        analysis JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Individual column migrations
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;`);
    } catch {}

    try {
      await pool.query(`
        ALTER TABLE user_interests DROP CONSTRAINT IF EXISTS user_interests_category_check CASCADE;
        ALTER TABLE user_interests DROP CONSTRAINT IF EXISTS user_interests_pkey CASCADE;
        ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey CASCADE;
        ALTER TABLE user_interests DROP CONSTRAINT IF EXISTS user_interests_user_id_fkey CASCADE;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
        
        ALTER TABLE users ALTER COLUMN id TYPE VARCHAR(255) USING id::text;
        ALTER TABLE users ADD PRIMARY KEY (id);
        
        ALTER TABLE user_interests ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text;
      `);
    } catch (e) {
      console.warn('[DB PG] Migration of UUID columns to VARCHAR:', (e as Error).message);
    }

    try {
      await pool.query(`ALTER TABLE bookmarks ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text;`);
    } catch {}

    try {
      await pool.query(`ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);
    } catch {}

    console.log('[DB] Database tables initialized and verified.');
  } catch (err) {
    const msg = (err as Error)?.message || String(err);
    console.warn('[DB] Failed to initialize PostgreSQL tables, falling back to local store:', msg);
    disablePgPool(msg);
  }
}

function disablePgPool(reason: string) {
  if (pool) {
    console.warn(`[DB] Disabling PostgreSQL connection pool and switching to local store fallback: ${reason}`);
    try {
      pool.end().catch(() => {});
    } catch {}
    pool = null;
    globalThis.__pulse_pg_pool = null;
  }
}

function handlePgError(err: unknown, operation: string) {
  const msg = (err as Error)?.message || String(err);
  console.warn(`[DB PG] ${operation} failed, using fallback store (${msg})`);
  if (
    msg.includes('password authentication failed') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('connection terminated') ||
    msg.includes('no pg_hba.conf entry')
  ) {
    disablePgPool(msg);
  }
}

export const db = {
  // --- USERS ---
  async createUser(user: { id: string; email: string; name: string; password_hash: string; avatar_url?: string }): Promise<User> {
    const newUser: User = {
      ...user,
      avatar_url: user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (pool) {
      try {
        const query = `
          INSERT INTO users (id, email, name, password_hash, avatar_url)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
          RETURNING id, email, name, password_hash, avatar_url, created_at, updated_at
        `;
        const res = await pool.query(query, [newUser.id, newUser.email, newUser.name, newUser.password_hash, newUser.avatar_url]);
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        handlePgError(err, 'createUser');
      }
    }

    checkProductionDbRequirement();
    store.users[newUser.id] = newUser;
    // Default initial interests
    store.user_interests[newUser.id] = ['Technology', 'AI & ML', 'Business'];
    saveStore();
    return newUser;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const lowerEmail = email.toLowerCase().trim();
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [lowerEmail]);
        if (res.rows.length > 0) return res.rows[0];
      } catch (err) {
        handlePgError(err, 'getUserByEmail');
      }
    }

    checkProductionDbRequirement();
    const found = Object.values(store.users).find((u) => u.email.toLowerCase() === lowerEmail);
    return found || null;
  },

  async getUserById(id: string): Promise<User | null> {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM users WHERE id::text = $1', [id]);
        if (res.rows.length > 0) return res.rows[0];
      } catch (err) {
        handlePgError(err, 'getUserById');
      }
    }

    checkProductionDbRequirement();
    return store.users[id] || null;
  },

  // --- INTERESTS ---
  async getUserInterests(userId: string): Promise<string[]> {
    if (pool) {
      try {
        const res = await pool.query('SELECT category FROM user_interests WHERE user_id::text = $1', [userId]);
        if (res.rows.length > 0) {
          return res.rows.map((r) => r.category);
        }
      } catch (err) {
        handlePgError(err, 'getUserInterests');
      }
    }

    checkProductionDbRequirement();
    return store.user_interests[userId] || ['Technology', 'AI & ML', 'Business'];
  },

  async setUserInterests(userId: string, categories: string[]): Promise<string[]> {
    const unique = Array.from(new Set(categories.map((c) => c.trim()).filter(Boolean)));
    if (pool) {
      try {
        await pool.query('DELETE FROM user_interests WHERE user_id::text = $1', [userId]);
        for (const cat of unique) {
          await pool.query('INSERT INTO user_interests (user_id, category) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, cat]);
        }
        return unique;
      } catch (err) {
        handlePgError(err, 'setUserInterests');
      }
    }

    checkProductionDbRequirement();
    store.user_interests[userId] = unique;
    saveStore();
    return unique;
  },

  // --- BOOKMARKS ---
  async getBookmarks(userId: string): Promise<Bookmark[]> {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM bookmarks WHERE user_id::text = $1 ORDER BY saved_at DESC', [userId]);
        return res.rows;
      } catch (err) {
        handlePgError(err, 'getBookmarks');
      }
    }

    checkProductionDbRequirement();
    return Object.values(store.bookmarks)
      .filter((b) => b.user_id === userId)
      .sort((a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime());
  },

  async addBookmark(bookmark: Omit<Bookmark, 'id' | 'saved_at'>): Promise<Bookmark> {
    const id = `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const saved_at = new Date().toISOString();
    const fullBookmark: Bookmark = {
      id,
      saved_at,
      ...bookmark,
    };

    if (pool) {
      try {
        const query = `
          INSERT INTO bookmarks (id, user_id, article_id, title, description, content, url, url_to_image, published_at, source_name, category, saved_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT DO NOTHING
          RETURNING *
        `;
        const res = await pool.query(query, [
          fullBookmark.id,
          fullBookmark.user_id,
          fullBookmark.article_id,
          fullBookmark.title,
          fullBookmark.description || '',
          fullBookmark.content || '',
          fullBookmark.url,
          fullBookmark.url_to_image || '',
          fullBookmark.published_at || '',
          fullBookmark.source_name || '',
          fullBookmark.category || 'General',
          fullBookmark.saved_at,
        ]);
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        handlePgError(err, 'addBookmark');
      }
    }

    checkProductionDbRequirement();
    // Key by user_id:article_id to replace duplicates
    const key = `${bookmark.user_id}:${bookmark.article_id}`;
    store.bookmarks[key] = fullBookmark;
    saveStore();
    return fullBookmark;
  },

  async removeBookmark(userId: string, articleId: string): Promise<boolean> {
    if (pool) {
      try {
        await pool.query('DELETE FROM bookmarks WHERE user_id::text = $1 AND (article_id = $2 OR id = $2)', [userId, articleId]);
        return true;
      } catch (err) {
        handlePgError(err, 'removeBookmark');
      }
    }

    checkProductionDbRequirement();
    const key = `${userId}:${articleId}`;
    if (store.bookmarks[key]) {
      delete store.bookmarks[key];
      saveStore();
      return true;
    }
    // Search by matching user_id & article_id or bookmark id
    const foundEntry = Object.entries(store.bookmarks).find(
      ([_, bm]) => bm.user_id === userId && (bm.article_id === articleId || bm.id === articleId)
    );
    if (foundEntry) {
      delete store.bookmarks[foundEntry[0]];
      saveStore();
      return true;
    }
    return false;
  },

  // --- SUMMARIES CACHE ---
  async getSummary(articleId: string): Promise<Summary | null> {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM summaries WHERE article_id = $1', [articleId]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            article_id: row.article_id,
            article_url: row.article_url,
            tldr: row.tldr,
            key_points: typeof row.key_points === 'string' ? JSON.parse(row.key_points) : row.key_points,
            analysis: typeof row.analysis === 'string' ? JSON.parse(row.analysis) : row.analysis,
            created_at: row.created_at,
          };
        }
      } catch (err) {
        handlePgError(err, 'getSummary');
      }
    }

    checkProductionDbRequirement();
    return store.summaries[articleId] || null;
  },

  async saveSummary(summary: Omit<Summary, 'created_at'>): Promise<Summary> {
    const fullSummary: Summary = {
      ...summary,
      created_at: new Date().toISOString(),
    };

    if (pool) {
      try {
        const query = `
          INSERT INTO summaries (article_id, article_url, tldr, key_points, analysis, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (article_id) DO UPDATE SET tldr = EXCLUDED.tldr, key_points = EXCLUDED.key_points, analysis = EXCLUDED.analysis
          RETURNING *
        `;
        await pool.query(query, [
          fullSummary.article_id,
          fullSummary.article_url,
          fullSummary.tldr,
          JSON.stringify(fullSummary.key_points),
          JSON.stringify(fullSummary.analysis),
          fullSummary.created_at,
        ]);
        return fullSummary;
      } catch (err) {
        handlePgError(err, 'saveSummary');
      }
    }

    checkProductionDbRequirement();
    store.summaries[summary.article_id] = fullSummary;
    saveStore();
    return fullSummary;
  },

  // --- GENERAL NEWS CACHE ---
  async getCachedNews(cacheKey: string): Promise<any | null> {
    const cached = store.news_cache[cacheKey];
    if (cached && cached.expires_at > Date.now()) {
      return cached.data;
    }
    return null;
  },

  async setCachedNews(cacheKey: string, data: any, ttlSeconds: number = 600): Promise<void> {
    store.news_cache[cacheKey] = {
      data,
      expires_at: Date.now() + ttlSeconds * 1000,
    };
    saveStore();
  },

  // --- USER INTERACTIONS & TOPICS ---
  async recordUserInteraction(userId: string, topic: string): Promise<void> {
    if (!topic || !userId) return;
    const cleanTopic = topic.trim();
    if (!store.user_interactions) {
      store.user_interactions = {};
    }
    if (!store.user_interactions[userId]) {
      store.user_interactions[userId] = {};
    }
    store.user_interactions[userId][cleanTopic] = (store.user_interactions[userId][cleanTopic] || 0) + 1;
    saveStore();
  },

  async getUserInteractionTopics(userId: string): Promise<Record<string, number>> {
    if (!userId || !store.user_interactions || !store.user_interactions[userId]) {
      return {};
    }
    return store.user_interactions[userId];
  },
};
