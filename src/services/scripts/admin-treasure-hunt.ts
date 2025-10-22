#!/usr/bin/env tsx

import { DateTime } from "luxon";
import pool from "../../config/db.js";
import { 
  TREASURE_HUNT_CONFIG, 
  TREASURE_HUNT_TASKS, 
  TREASURE_HUNT_GROUP_IDS 
} from "../../models/treasureHunt.js";

async function createTreasureHuntTables() {
  try {
    console.log("Setting up treasure_hunt_tasks table...");
    
    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS treasure_hunt_tasks (
        id SERIAL PRIMARY KEY,
        task_index INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        validation_prompt TEXT NOT NULL,
        hint TEXT NOT NULL,
        points INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(task_index)
      );
    `);
    
    // Remove is_active column if it exists
    try {
      await pool.query(`ALTER TABLE treasure_hunt_tasks DROP COLUMN IF EXISTS is_active;`);
      console.log("✅ Removed is_active column");
    } catch (error) {
      // Column might not exist, that's okay
      console.log("ℹ️ is_active column not found (already removed)");
    }
    
    // Ensure unique constraint on task_index exists
    try {
      await pool.query(`ALTER TABLE treasure_hunt_tasks ADD CONSTRAINT treasure_hunt_tasks_task_index_unique UNIQUE (task_index);`);
      console.log("✅ Added unique constraint on task_index");
    } catch (error) {
      // Constraint might already exist, that's okay
      console.log("ℹ️ Unique constraint on task_index already exists");
    }
    
    console.log("✅ treasure_hunt_tasks table ready!");
    
  } catch (error) {
    console.error("❌ Error setting up treasure_hunt_tasks table:", error);
    throw error;
  }
}

async function initializeTreasureHunt() {
  try {
    console.log("Starting Treasure Hunt Setup...");
    
    // Create tables first
    console.log("Creating treasure hunt tables...");
    await createTreasureHuntTables();
    
    console.log("Adding treasure hunt tasks...");
    
    // Insert all tasks
    for (const task of TREASURE_HUNT_TASKS) {
      try {
        await pool.query(`
          INSERT INTO treasure_hunt_tasks (task_index, title, description, validation_prompt, hint, points)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (task_index) DO UPDATE
          SET title = EXCLUDED.title,
              description = EXCLUDED.description,
              validation_prompt = EXCLUDED.validation_prompt,
              hint = EXCLUDED.hint,
              points = EXCLUDED.points
        `, [
          task.index,
          task.title,
          task.description,
          task.validationPrompt,
          task.hint,
          task.points
        ]);
        console.log(`Added: ${task.title} (Task ${task.index + 1})`);
      } catch (error) {
        console.error(`❌ Failed to add: ${task.title}`, error);
      }
    }
    
    // Groups will be added later when needed
    
    console.log("\n✅ Treasure hunt setup completed successfully!");
    
  } catch (error) {
    console.error("❌ Error setting up treasure hunt:", error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  await initializeTreasureHunt();
}

main().catch(console.error);