-- PulseAI Supabase Seed Data (Development/Demo Only)
-- Password for admin@pulseai.local is PulseAI-Test-2026! (bcrypt hash below)

INSERT INTO users (id, email, name, password_hash, avatar_url)
VALUES (
  'usr_admin_demo_2026',
  'admin@pulseai.local',
  'PulseAI Test Admin',
  '$2a$10$wN31Yh/J14/dHQ.sC5uFVOs9oPj1uA/6s0qY4R6bO4B8z6t4e1fWm',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=PulseAITestAdmin'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_interests (user_id, category)
VALUES 
  ('usr_admin_demo_2026', 'AI & ML'),
  ('usr_admin_demo_2026', 'Technology'),
  ('usr_admin_demo_2026', 'Business'),
  ('usr_admin_demo_2026', 'Science')
ON CONFLICT DO NOTHING;
