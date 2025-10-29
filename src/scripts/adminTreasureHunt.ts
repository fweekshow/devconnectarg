#!/usr/bin/env tsx

import { TreasureHuntAdapter } from "@/adapters/index.js";
import { connectDb, ENV } from "@/config/index.js";
import { TREASURE_HUNT_TASKS } from "@/constants/index.js";

async function initializeTreasureHunt() {
  try {
    console.log("Starting Treasure Hunt Setup...");
    await connectDb();

    console.log(
      "🔍 Database URL:",
      ENV.DATABASE_URL
        ? `${ENV.DATABASE_URL.substring(0, 50)}...`
        : "NOT SET"
    );
    console.log("🔍 NODE_ENV:", ENV.NODE_ENV);

    // Create tables first
    console.log("Creating treasure hunt tables...");
    await TreasureHuntAdapter.createTable();

    console.log("Adding treasure hunt tasks...");

    // Insert all tasks
    for (const task of TREASURE_HUNT_TASKS) {
      await TreasureHuntAdapter.insertTaskDetails(task);
    }

    // Groups will be added later when needed

    // Verify what's actually in the database
    console.log("\n🔍 Verifying database contents...");
    const verifyResult = await TreasureHuntAdapter.getTasks();
    console.log("📊 Tasks in database:", verifyResult);

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
