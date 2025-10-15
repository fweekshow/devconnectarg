#!/usr/bin/env tsx

import { DateTime } from "luxon";
import { 
  insertSchedule, 
  createScheduleTables,
  getAllActiveSchedules,

} from "../../models/scheduleModel.js";
import { ScheduleType, ScheduleStatus } from "../../models/types.js";

// Sample DevConnect 2025 schedule data
const devConnectSchedule = [
  // Day 1 - November 13, 2025
  {
    title: "DevConnect 2025 Opening Ceremony",
    description: "Welcome to DevConnect 2025! Join us for the official opening ceremony with keynote speakers and event overview.",
    startTime: "2025-11-13T09:00:00Z",
    endTime: "2025-11-13T10:30:00Z",
    location: "Main Hall",
    type: "session" as ScheduleType,
    speaker: "Jesse Pollak",
    capacity: 1000,
    status: "scheduled" as ScheduleStatus,
    registrationRequired: true,
    registrationUrl: "https://devconnect.org/opening",
    tags: ["opening", "keynote", "ceremony"]
  },
  {
    title: "Base Ecosystem Overview",
    description: "Deep dive into the Base ecosystem, its growth, and future roadmap.",
    startTime: "2025-11-13T11:00:00Z",
    endTime: "2025-11-13T12:00:00Z",
    location: "Hall A",
    type: "session" as ScheduleType,
    speaker: "Shan Aggarwal",
    capacity: 500,
    status: "scheduled" as ScheduleStatus,
    registrationRequired: false,
    tags: ["base", "ecosystem", "overview"]
  },
  {
    title: "Lunch Break",
    description: "Networking lunch with fellow attendees",
    startTime: "2025-11-13T12:00:00Z",
    endTime: "2025-11-13T13:30:00Z",
    location: "Dining Hall",
    type: "meal" as ScheduleType,
    registrationRequired: false,
    tags: ["lunch", "networking"]
  },
  {
    title: "Builder Workshop: Smart Contract Development",
    description: "Hands-on workshop for building and deploying smart contracts on Base.",
    startTime: "2025-11-13T14:00:00Z",
    endTime: "2025-11-13T16:00:00Z",
    location: "Workshop Room 1",
    type: "workshop" as ScheduleType,
    speaker: "Alex Smith",
    registrationRequired: true,
    registrationUrl: "https://devconnect.org/workshop-builder",
    tags: ["workshop", "smart-contracts", "development"]
  },
  {
    title: "Coffee Break",
    description: "Coffee and networking break",
    startTime: "2025-11-13T16:00:00Z",
    endTime: "2025-11-13T16:30:00Z",
    location: "Lobby",
    type: "break" as ScheduleType,
    registrationRequired: false,
    tags: ["coffee", "networking"]
  },
  {
    title: "Base App Showcase",
    description: "Latest features and updates in Base App",
    startTime: "2025-11-13T16:30:00Z",
    endTime: "2025-11-13T17:30:00Z",
    location: "Hall B",
    type: "session" as ScheduleType,
    speaker: "Sarah Johnson",
    registrationRequired: false,
    tags: ["base-app", "showcase", "features"]
  },
  {
    title: "Networking Reception",
    description: "Evening networking reception with drinks and appetizers",
    startTime: "2025-11-13T18:00:00Z",
    endTime: "2025-11-13T20:00:00Z",
    location: "Rooftop Terrace",
    type: "social" as ScheduleType,
    registrationRequired: false,
    tags: ["networking", "reception", "social"]
  },

  // Day 2 - November 14, 2025
  {
    title: "Morning Yoga Session",
    description: "Start your day with a relaxing yoga session",
    startTime: "2025-11-14T07:00:00Z",
    endTime: "2025-11-14T08:00:00Z",
    location: "Garden Pavilion",
    type: "activity" as ScheduleType,
    registrationRequired: true,
    registrationUrl: "https://devconnect.org/yoga",
    tags: ["yoga", "wellness", "morning"]
  },
  {
    title: "DeFi Innovation Panel",
    description: "Panel discussion on the latest DeFi innovations and trends",
    startTime: "2025-11-14T09:00:00Z",
    endTime: "2025-11-14T10:30:00Z",
    location: "Main Hall",
    type: "session" as ScheduleType,
    speaker: "Panel: 4 speakers",
    registrationRequired: false,
    tags: ["defi", "panel", "innovation"]
  },
  {
    title: "Breakfast",
    description: "Continental breakfast",
    startTime: "2025-11-14T08:00:00Z",
    endTime: "2025-11-14T09:00:00Z",
    location: "Dining Hall",
    type: "meal" as ScheduleType,
    registrationRequired: false,
    tags: ["breakfast", "meal"]
  },
  {
    title: "NFT Workshop: Creating Digital Art",
    description: "Learn to create and mint NFTs on Base",
    startTime: "2025-11-14T11:00:00Z",
    endTime: "2025-11-14T13:00:00Z",
    location: "Workshop Room 2",
    type: "workshop" as ScheduleType,
    speaker: "Maria Garcia",
    registrationRequired: true,
    registrationUrl: "https://devconnect.org/workshop-nft",
    tags: ["nft", "workshop", "art", "digital"]
  },
  {
    title: "Lunch Break",
    description: "Lunch and networking",
    startTime: "2025-11-14T13:00:00Z",
    endTime: "2025-11-14T14:30:00Z",
    location: "Dining Hall",
    type: "meal" as ScheduleType,
    registrationRequired: false,
    tags: ["lunch", "networking"]
  },
  {
    title: "Governance Deep Dive",
    description: "Understanding governance mechanisms in decentralized systems",
    startTime: "2025-11-14T15:00:00Z",
    endTime: "2025-11-14T16:30:00Z",
    location: "Hall A",
    type: "session" as ScheduleType,
    speaker: "Dr. Michael Chen",
    registrationRequired: false,
    tags: ["governance", "decentralization", "deep-dive"]
  },
  {
    title: "Coffee Break",
    description: "Coffee and networking break",
    startTime: "2025-11-14T16:30:00Z",
    endTime: "2025-11-14T17:00:00Z",
    location: "Lobby",
    type: "break" as ScheduleType,
    registrationRequired: false,
    tags: ["coffee", "networking"]
  },
  {
    title: "Builder Nights Buenos Aires",
    description: "Evening social event for builders and developers",
    startTime: "2025-11-14T18:00:00Z",
    endTime: "2025-11-14T22:00:00Z",
    location: "Downtown Buenos Aires",
    type: "social" as ScheduleType,
    registrationRequired: true,
    registrationUrl: "https://devconnect.org/builder-nights",
    tags: ["builder-nights", "social", "networking", "evening"]
  },

  // Day 3 - November 15, 2025
  {
    title: "ETH Day Opening",
    description: "Special ETH Day programming and announcements",
    startTime: "2025-11-15T09:00:00Z",
    endTime: "2025-11-15T10:00:00Z",
    location: "Main Hall",
    type: "session" as ScheduleType,
    speaker: "Vitalik Buterin",
    registrationRequired: false,
    tags: ["eth-day", "opening", "vitalik"]
  },
  {
    title: "Ethereum Roadmap Update",
    description: "Latest updates on Ethereum's development roadmap",
    startTime: "2025-11-15T10:30:00Z",
    endTime: "2025-11-15T12:00:00Z",
    location: "Main Hall",
    type: "session" as ScheduleType,
    speaker: "Ethereum Foundation Team",
    registrationRequired: false,
    tags: ["ethereum", "roadmap", "updates"]
  },
  {
    title: "Lunch Break",
    description: "Lunch and networking",
    startTime: "2025-11-15T12:00:00Z",
    endTime: "2025-11-15T13:30:00Z",
    location: "Dining Hall",
    type: "meal" as ScheduleType,
    registrationRequired: false,
    tags: ["lunch", "networking"]
  },
  {
    title: "Layer 2 Solutions Panel",
    description: "Discussion on various Layer 2 solutions and their trade-offs",
    startTime: "2025-11-15T14:00:00Z",
    endTime: "2025-11-15T15:30:00Z",
    location: "Hall A",
    type: "session" as ScheduleType,
    speaker: "Panel: 5 speakers",
    registrationRequired: false,
    tags: ["layer2", "panel", "solutions"]
  },
  {
    title: "Coffee Break",
    description: "Coffee and networking break",
    startTime: "2025-11-15T15:30:00Z",
    endTime: "2025-11-15T16:00:00Z",
    location: "Lobby",
    type: "break" as ScheduleType,
    registrationRequired: false,
    tags: ["coffee", "networking"]
  },
  {
    title: "Closing Ceremony",
    description: "DevConnect 2025 closing ceremony and wrap-up",
    startTime: "2025-11-15T16:00:00Z",
    endTime: "2025-11-15T17:30:00Z",
    location: "Main Hall",
    type: "session" as ScheduleType,
    speaker: "DevConnect Team",
    registrationRequired: false,
    tags: ["closing", "ceremony", "wrap-up"]
  }
];

async function initializeSchedule() {
  try {
    console.log("Starting DevConnect 2025 Schedule Setup...");
    
    // Create tables first
    console.log("Creating schedule tables...");
    await createScheduleTables();
    
    // Check if schedule already exists
    const existingSchedules = await getAllActiveSchedules();
    console.log(`Found ${existingSchedules.length} existing schedules in database.`);

    
    console.log("Adding DevConnect 2025 schedule...");
    
    // Insert all schedule items
    for (const schedule of devConnectSchedule) {
      try {
        const id = await insertSchedule(
          schedule.title,
          schedule.description,
          schedule.startTime,
          schedule.endTime,
          schedule.location,
          schedule.type,
          schedule.speaker,
          schedule.capacity || 0,
          schedule.status || 'scheduled',
          schedule.registrationRequired,
          schedule.registrationUrl,
          schedule.tags
        );
        console.log(`Added: ${schedule.title} (ID: ${id})`);
      } catch (error) {
        console.error(` Failed to add: ${schedule.title}`, error);
      }
    }
    
    console.log("\n DevConnect 2025 schedule setup completed successfully!");
    
  } catch (error) {
    console.error(" Error setting up schedule:", error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  await initializeSchedule();
}

main().catch(console.error);
