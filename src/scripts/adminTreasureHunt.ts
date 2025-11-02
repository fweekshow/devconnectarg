#!/usr/bin/env tsx

import { TreasureHuntAdapter } from "@/adapters/index.js";
import { connectDb, ENV } from "@/config/index.js";

// Set up mock treasure hunt times for testing
const today = new Date();

// Helper to create Argentina time for today
const createArgentinaTime = (hour: number, minute: number) => {
  const d = new Date();
  // Create time in Argentina timezone (UTC-3)
  d.setHours(hour, minute, 0, 0);
  return d;
};

const toISOString = (date: Date) => {
  return date.toISOString();
};

const addHours = (date: Date, hours: number) => {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
};

const addMinutes = (date: Date, minutes: number) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
};

const TEMP_TREASURE_HUNT_TASKS = [
  {
    title: "Find JesseXBT at A0x Demo",
    description:
      "Find JesseXBT at the A0x Demo at the XMTP Stage! A0x is demoing at 10am on Wednesday 11/19. Look for an artistic blue and yellow logo - the AI twin of Jesse Pollak.",
    validationPrompt:
      "Does this image show an artistic blue and yellow geometric or cubist-style logo/portrait? Look for geometric patterns forming a face or figure in blue and yellow tones.",
    hint: "XMTP Stage, Wednesday 11/19 at 10am. Look for the blue and yellow geometric art!",
    points: 10,
    category: "xmtp",
    startTime: toISOString(createArgentinaTime(21, 20)), // 9:20 PM Argentina
    endTime: toISOString(createArgentinaTime(21, 50)), // 9:50 PM Argentina
    // Grace period: 9:05 PM - 10:05 PM
  },
  {
    title: "The Hand of God",
    description:
      "In the streets of Buenos Aires, find the mural of the man who touched the sky with his left foot. The artist who painted the impossible goal.",
    validationPrompt:
      "Does this image show a mural depicting Diego Maradona? Look for artwork featuring the famous Argentine footballer.",
    hint: "Look for street art honoring the greatest footballer Argentina ever produced!",
    points: 10,
    category: "base",
    startTime: toISOString(createArgentinaTime(22, 20)), // 10:20 PM Argentina
    endTime: toISOString(createArgentinaTime(22, 50)), // 10:50 PM Argentina
    // Grace period: 10:05 PM - 11:05 PM (no overlap!)
  },
  {
    title: "Find a Spoon",
    description: "Take a photo of a spoon",
    validationPrompt:
      "Does this image clearly show a spoon? Respond YES or NO.",
    hint: "Right next to the forks!",
    points: 10,
    category: "base",
    startTime: toISOString(createArgentinaTime(23, 20)), // 11:20 PM Argentina
    endTime: toISOString(createArgentinaTime(23, 50)), // 11:50 PM Argentina
    // Grace period: 11:05 PM - 12:05 AM (no overlap!)
  },
  {
    title: "Find a Fork",
    description: "Take a photo of a fork",
    validationPrompt: "Does this image clearly show a fork? Respond YES or NO.",
    hint: "Right next to the spoons!",
    points: 10,
    category: "xmtp",
    startTime: toISOString(addMinutes(createArgentinaTime(23, 50), 30)), // 12:20 AM Argentina (next day)
    endTime: toISOString(addMinutes(createArgentinaTime(23, 50), 60)), // 12:50 AM Argentina (next day)
    // Grace period: 12:05 AM - 1:05 AM (no overlap!)
  },
  {
    title: "Find a Cup",
    description: "Take a photo of a cup or mug",
    validationPrompt:
      "Does this image clearly show a cup or mug? Respond YES or NO.",
    hint: "Perfect for coffee or tea!",
    points: 10,
    category: "base",
    startTime: toISOString(addMinutes(createArgentinaTime(23, 50), 90)), // 1:20 AM Argentina (next day)
    endTime: toISOString(addMinutes(createArgentinaTime(23, 50), 120)), // 1:50 AM Argentina (next day)
    // Grace period: 1:05 AM - 2:05 AM (no overlap!)
  },
];

async function initializeTreasureHunt() {
  try {
    console.log("Starting Treasure Hunt Setup...");
    await connectDb();

    console.log(
      "🔍 Database URL:",
      ENV.DATABASE_URL ? `${ENV.DATABASE_URL.substring(0, 50)}...` : "NOT SET"
    );
    console.log("🔍 NODE_ENV:", ENV.NODE_ENV);
    console.log(`🕒 Script running at: ${today.toISOString()} (UTC)`);
    console.log(`🕒 Script running at: ${today.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })} (Argentina)`);
    console.log(`🕒 First task will start at: ${toISOString(today)}`);
    
    // Drop and recreate tables to refresh task times
    console.log("Dropping existing treasure hunt tables...");
    await TreasureHuntAdapter.dropTables();
    
    // Create tables first
    console.log("Creating treasure hunt tables...");
    await TreasureHuntAdapter.createTable();

    console.log("Adding treasure hunt tasks...");

    // Insert all tasks

    await TreasureHuntAdapter.addTasks({
      huntData: {
        title: "Day 2",
        huntDate: today.toISOString(),
      },
      tasks: TEMP_TREASURE_HUNT_TASKS,
    });

    // Groups will be added later when needed

    // Verify what's actually in the database
    console.log("\n🔍 Verifying database contents...");
    const verifyResult = await TreasureHuntAdapter.getAllTasks();
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
