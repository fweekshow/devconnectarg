-- DevConnect 2025 Treasure Hunt Database Schema
-- PostgreSQL on Railway

-- Main treasure hunt event (just 1 active event)
CREATE TABLE IF NOT EXISTS treasure_hunt_events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  total_tasks INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- The 10 tasks/challenges
CREATE TABLE IF NOT EXISTS treasure_hunt_tasks (
  id SERIAL PRIMARY KEY,
  treasure_hunt_id INTEGER REFERENCES treasure_hunt_events(id) ON DELETE CASCADE,
  task_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  validation_prompt TEXT NOT NULL,
  hint TEXT,
  points INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(treasure_hunt_id, task_index)
);

-- The 20 pre-created XMTP groups
CREATE TABLE IF NOT EXISTS treasure_hunt_groups (
  id SERIAL PRIMARY KEY,
  treasure_hunt_id INTEGER REFERENCES treasure_hunt_events(id) ON DELETE CASCADE,
  xmtp_group_id TEXT UNIQUE NOT NULL,
  group_number INTEGER NOT NULL,
  current_task_index INTEGER DEFAULT 0,
  completed_task_ids JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  member_count INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  CONSTRAINT check_task_index CHECK (current_task_index >= 0 AND current_task_index <= 10)
);

-- User assignments (who's in which group)
CREATE TABLE IF NOT EXISTS treasure_hunt_participants (
  id SERIAL PRIMARY KEY,
  treasure_hunt_id INTEGER REFERENCES treasure_hunt_events(id) ON DELETE CASCADE,
  user_inbox_id TEXT UNIQUE NOT NULL,
  group_id INTEGER REFERENCES treasure_hunt_groups(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW()
);

-- Photo submissions and AI validations
CREATE TABLE IF NOT EXISTS treasure_hunt_submissions (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES treasure_hunt_groups(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES treasure_hunt_tasks(id) ON DELETE CASCADE,
  submitted_by TEXT NOT NULL,
  image_url TEXT NOT NULL,
  xmtp_message_id TEXT NOT NULL,
  ai_validation_response TEXT,
  is_valid BOOLEAN DEFAULT FALSE,
  confidence_score INTEGER,
  validated_at TIMESTAMP,
  submitted_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_confidence CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_xmtp_id ON treasure_hunt_groups(xmtp_group_id);
CREATE INDEX IF NOT EXISTS idx_group_progress ON treasure_hunt_groups(current_task_index) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_active_groups ON treasure_hunt_groups(treasure_hunt_id) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_assignment ON treasure_hunt_participants(user_inbox_id);
CREATE INDEX IF NOT EXISTS idx_submissions_group ON treasure_hunt_submissions(group_id, task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_validation ON treasure_hunt_submissions(is_valid);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_treasure_hunt_events_updated_at BEFORE UPDATE ON treasure_hunt_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for leaderboard (completed groups ranked by completion time)
CREATE OR REPLACE VIEW treasure_hunt_leaderboard AS
SELECT 
  g.id as group_id,
  g.group_number,
  g.xmtp_group_id,
  g.member_count,
  g.total_points,
  g.completed_at,
  EXTRACT(EPOCH FROM (g.completed_at - g.started_at)) as completion_time_seconds,
  COUNT(p.id) as total_members,
  ROW_NUMBER() OVER (ORDER BY g.completed_at ASC NULLS LAST) as rank
FROM treasure_hunt_groups g
LEFT JOIN treasure_hunt_participants p ON p.group_id = g.id
WHERE g.completed_at IS NOT NULL
GROUP BY g.id, g.group_number, g.xmtp_group_id, g.member_count, g.total_points, g.completed_at, g.started_at
ORDER BY g.completed_at ASC;

-- View for current active groups progress
CREATE OR REPLACE VIEW treasure_hunt_progress AS
SELECT 
  g.id as group_id,
  g.group_number,
  g.current_task_index,
  g.member_count,
  g.total_points,
  g.started_at,
  t.title as current_task_title,
  t.description as current_task_description,
  COUNT(DISTINCT s.id) as total_submissions
FROM treasure_hunt_groups g
LEFT JOIN treasure_hunt_tasks t ON t.task_index = g.current_task_index AND t.treasure_hunt_id = g.treasure_hunt_id
LEFT JOIN treasure_hunt_submissions s ON s.group_id = g.id
WHERE g.completed_at IS NULL
GROUP BY g.id, g.group_number, g.current_task_index, g.member_count, g.total_points, g.started_at, t.title, t.description
ORDER BY g.total_points DESC, g.current_task_index DESC;

