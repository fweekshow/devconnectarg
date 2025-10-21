import pool from "../config/db.js";

export async function createTreasureHuntTables(): Promise<void> {
  try {
    // Read the SQL schema file and execute it
    const fs = await import('fs');
    const path = await import('path');
    
    const schemaPath = path.join(process.cwd(), 'src/services/database/treasureHuntSchema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schemaSQL);
    
    console.log("✅ Treasure hunt tables created successfully");
  } catch (error) {
    console.error("❌ Error creating treasure hunt tables:", error);
    
    // Fallback: Create tables individually if reading the file fails
    try {
      await pool.query(`
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
      `);

      await pool.query(`
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
      `);

      await pool.query(`
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
      `);

      await pool.query(`
        -- User assignments (who's in which group)
        CREATE TABLE IF NOT EXISTS treasure_hunt_participants (
          id SERIAL PRIMARY KEY,
          treasure_hunt_id INTEGER REFERENCES treasure_hunt_events(id) ON DELETE CASCADE,
          user_inbox_id TEXT UNIQUE NOT NULL,
          group_id INTEGER REFERENCES treasure_hunt_groups(id) ON DELETE CASCADE,
          joined_at TIMESTAMP DEFAULT NOW()
        );
      `);

      await pool.query(`
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
      `);

      // Create indexes
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_group_xmtp_id ON treasure_hunt_groups(xmtp_group_id);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_group_progress ON treasure_hunt_groups(current_task_index) WHERE completed_at IS NULL;`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_active_groups ON treasure_hunt_groups(treasure_hunt_id) WHERE completed_at IS NULL;`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_assignment ON treasure_hunt_participants(user_inbox_id);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_submissions_group ON treasure_hunt_submissions(group_id, task_id);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_submissions_validation ON treasure_hunt_submissions(is_valid);`);

      console.log("✅ Treasure hunt tables created successfully (fallback method)");
    } catch (fallbackError) {
      console.error("❌ Fallback table creation also failed:", fallbackError);
    }
  }
}
