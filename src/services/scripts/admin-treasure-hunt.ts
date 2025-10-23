#!/usr/bin/env tsx

import { DateTime } from "luxon";
import pool, { connectDb } from "../../config/db.js";
import { 
  TREASURE_HUNT_CONFIG, 
  TREASURE_HUNT_TASKS, 
} from "../../models/treasureHunt.js";

async function createTreasureHuntTables() {
  try {
    console.log("Setting up treasure_hunt_tasks table...");
    
    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS treasure_hunt_tasks (
        id SERIAL PRIMARY KEY,
        task_index INTEGER UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        validation_prompt TEXT NOT NULL,
        hint TEXT NOT NULL,
        points INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Ensure uniqueness for ON CONFLICT (task_index)
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_treasure_hunt_tasks_task_index
      ON treasure_hunt_tasks (task_index)
    `);
    
    console.log("✅ treasure_hunt_tasks table ready!");
    
  } catch (error) {
    console.error("❌ Error setting up treasure_hunt_tasks table:", error);
    throw error;
  }
}

async function initializeTreasureHunt() {
  try {
    console.log("Starting Treasure Hunt Setup...");
    await connectDb();
    console.log("🔍 Database URL:", process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 50)}...` : "NOT SET");
    console.log("🔍 NODE_ENV:", process.env.NODE_ENV);
    
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
    
    // Verify what's actually in the database
    console.log("\n🔍 Verifying database contents...");
    const verifyResult = await pool.query("SELECT id, task_index, title FROM treasure_hunt_tasks ORDER BY task_index");
    console.log("📊 Tasks in database:", verifyResult.rows);
    
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