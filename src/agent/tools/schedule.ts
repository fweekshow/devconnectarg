import { tool } from "@langchain/core/tools";
import { eventDate } from "@/constants";
import { z } from "zod";

// DevConnect 2025 Schedule Data - Buenos Aires, Argentina
// Source: https://devconnect.org/calendar

export const SPEAKERS_DATA = {
  // Major organizers and presenters
  "Staking Rewards": {
    title: "Staking Summit",
    bio: "Leading the Staking Summit event",
  },
  "SEED Gov": {
    title: "Governance Day",
    bio: "Organizing Governance Day tracks",
  },
  "Web3 Privacy Now": {
    title: "Ethereum Cypherpunk Congress",
    bio: "Privacy-focused Ethereum event",
  },
  "Ethereum Foundation": {
    title: "ETH Day & DevConnect",
    bio: "Main organizers of DevConnect and ETH Day",
  },
  BuidlGuidl: {
    title: "Builder Bootcamp",
    bio: "Running beginner to advanced builder workshops",
  },
  PSE: {
    title: "Privacy & Scaling Explorations",
    bio: "Leading zkID and zkTLS Day events",
  },
  Bankless: {
    title: "The Bankless Summit",
    bio: "Media and education platform for Ethereum",
  },
  EthStaker: {
    title: "Staking Gathering",
    bio: "Community-focused staking education",
  },
  "Aave Labs": {
    title: "DeFi Events",
    bio: "Organizing DeFi Day del Sur and rAave",
  },
  Gitcoin: {
    title: "Schelling Point",
    bio: "Public goods and coordination discussions",
  },
  ETHGlobal: {
    title: "Hackathon",
    bio: "Running the main ETHGlobal hackathon",
  },
  Aztec: {
    title: "NoirCon3",
    bio: "Privacy-focused smart contract development",
  },
  WalletConnect: { title: "WalletCon", bio: "Wallet infrastructure and UX" },
};

export const SCHEDULE_DATA = {
  saturday_nov15: {
    title: "Saturday Nov 15 — Pre-Events Day 1",
    events: [
      "All Day: Staking Summit (Nov 15-16) - Organized by Staking Rewards. Tickets Required. 2000 capacity. Mixed Format. All Welcome.",
      "10:00 AM - 6:00 PM: Governance Day Devconnect BA 2025 (Day 1: Main) - Organized by SEED Gov. Tickets Required. 400 capacity. Talks. All Welcome.",
    ],
  },
  sunday_nov16: {
    title: "Sunday Nov 16 — Pre-Events Day 2",
    events: [
      "All Day: Staking Summit (continues) - Day 2 of the Staking Summit.",
      "All Day: Ethereum Cypherpunk Congress 2 - Organized by Web3 Privacy Now. Tickets Required. 1500 capacity. Mixed Format. All Welcome.",
      "10:00 AM - 4:00 PM: Governance Day Devconnect BA 2025 (Day 2: Research Track) - Organized by SEED Gov. Tickets Required. 70 capacity. Workshop. Intermediate.",
      "2:00 PM - 8:00 PM: Wondercon - Organized by Wonderland. Talks. Expert level.",
    ],
  },
  monday_nov17: {
    title: "Monday Nov 17 — ETH Day & DevConnect Cube Opening",
    events: [
      "All Day: Devconnect Cube Opens (Nov 17-22) - Ethereum World's Fair & Coworking Space at La Rural. Organized by Ethereum Foundation. Included in Ticket. 3000+ capacity. Social. All Welcome.",
      "All Day: ETH Day - Ethereum Day & Devconnect Opening Ceremony. Organized by Devconnect Team. Included in Ticket. Mixed Format. All Welcome.",
      "2:00 PM - 8:00 PM: Builder Nights Buenos Aires - Organized by MetaMask, Linea, Ledger, Brevis, P2P, Pharos, Chainlink and more. Tickets Required. 300 capacity. Talks. All Welcome.",
    ],
  },
  tuesday_nov18: {
    title: "Tuesday Nov 18 — Full Day of Events",
    events: [
      "9:00 AM - 6:00 PM: zkID and Client-Side Proving Day - Organized by PSE. Signup Required. 150 capacity. Mixed Format. Intermediate.",
      "9:00 AM - 6:00 PM: trustless://eil - Organized by EF Account & Chain Abstraction Team. Signup Required. Talks. Intermediate.",
      "10:00 AM - 5:30 PM: BuidlGuidl's Builder Bootcamp: Beginner to Advanced (Nov 18-21, daily) - Included in Ticket. Mixed Format. All Welcome.",
      "10:00 AM - 6:00 PM: The Bankless Summit - Organized by Bankless. Talks. All Welcome.",
      "10:00 AM - 8:00 PM: SENSEI MAGIC - Organized by SenseiNode. Mixed Format. All Welcome.",
      "11:00 AM - 6:00 PM: Money Rails - Organized by Polygon. Signup Required. 500 capacity. Mixed Format. All Welcome.",
      "All Day: ETHCON ARGENTINA 2025 - Organized by ETHCON Core Team. Signup Required. 4000 capacity. Presentation. All Welcome.",
      "All Day: Web3Design - UX Unconference - Organized by Web3Design. Details Soon. Mixed Format. All Welcome.",
      "All Day: EthStaker's Staking Gathering - Organized by EthStaker. Tickets Required. Mixed Format. All Welcome.",
      "All Day: Food Connect - Organized by Web3 Growth. Tickets Required. 600 capacity. Social. All Welcome.",
      "All Day: Solidity Summit - Organized by Vishwa Mehta. Signup Required. 350 capacity. Talks. Expert.",
    ],
  },
  wednesday_nov19: {
    title: "Wednesday Nov 19 — University Tracks & Specialized Events",
    events: [
      "6:30 AM - 8:00 AM: University Track - Champagnat - Universidad de Champagnat. Included in Ticket. 180 capacity. Mixed Format. Beginner.",
      "8:00 AM - 10:00 AM: University Track - UTN - Included in Ticket. 180 capacity. Mixed Format. Beginner.",
      "9:00 AM - 9:00 AM (2 days): Ethereum Argentina Hackathon: Tierra de Buidlērs (Nov 19-20) - Organized by Buidlērs Tech. Included in Ticket. Hackathon. Intermediate.",
      "9:00 AM - 12:00 PM: Gov3 Summit - Organized by Gov3 Summit. Tickets Required. 70 capacity. Talks. Expert.",
      "9:00 AM - 6:00 PM: trustless://interop.landscape - Organized by EF Account & Chain Abstraction Team. Signup Required. Mixed Format. Intermediate.",
      "9:00 AM - 8:00 PM: Encryption Day - Organized by Fhenix. Tickets Required. 350 capacity. Mixed Format. All Welcome.",
      "10:00 AM - 5:00 PM: zkTLS Day - Organized by PSE. Signup Required. 150 capacity. Mixed Format. All Welcome.",
      "11:00 AM - 1:00 PM: University Track - UCEMA - Included in Ticket. Mixed Format. Beginner.",
      "2:00 PM - 6:00 PM: Crecimiento Startup Worldcup - Organized by Crecimiento. Signup Required. 500 capacity. Mixed Format. All Welcome.",
      "All Day: d/acc devconnect Argentina - Organized by d/acc. Details Soon. Mixed Format. All Welcome.",
      "All Day: DuneCon25 - Organized by Dune. Tickets Required. Mixed Format. Expert.",
      "All Day: DeFi Day del Sur - Organized by Aave Labs. Talks. All Welcome.",
      "All Day: Funding the Commons: Buenos Aires 2025 - Organized by Funding the Commons. Mixed Format. All Welcome.",
      "Workshop: StoryCheck: automating verification of front-end docs of EVM dApps - Organized by Ivelin Ivanov. 20 capacity. All Welcome.",
    ],
  },
  thursday_nov20: {
    title: "Thursday Nov 20 — DeFi, Governance & Dev Tools",
    events: [
      "6:00 AM - 2:00 PM: EthClient Summit - Organized by EF + EthStaker. Mixed Format. Intermediate.",
      "8:00 AM - 10:00 AM: University Track - Austral/IAE (Nov 20-22, daily) - Included in Ticket. 180 capacity. Mixed Format. Beginner.",
      "9:00 AM - 7:00 PM: DeFi Security Summit (Nov 20-21, 2 days) - Signup Required. 1000 capacity. Mixed Format. Intermediate.",
      "9:00 AM - 6:00 PM: Crecimiento Regulation Day - Organized by Crecimiento. Signup Required. 500 capacity. Mixed Format. All Welcome.",
      "9:00 AM - 6:00 PM: Zero to Dapp at Devconnect - Organized by Remix IDE. Signup Required. Workshop. All Welcome.",
      "10:00 AM - 4:00 PM: Schelling Point - Organized by Gitcoin. Mixed Format. All Welcome.",
      "10:00 AM - 4:00 PM: NoirCon3 - Organized by Aztec. Workshop. All Welcome.",
      "All Day: rAave Buenos Aires (Nov 20-21) - Organized by Aave Labs. Social. All Welcome.",
      "All Day: Agentic Zero - Organized by Agentic Zero. Signup Required. Talks. All Welcome.",
      "All Day: WalletCon - Organized by WalletConnect. Tickets Required. Talks. All Welcome.",
      "All Day: Scaling DeFi w/ kpk's Treasury Network - Organized by kpk (formerly karpatkey). Mixed Format. All Welcome.",
      "All Day: Pragma Buenos Aires - Organized by ETHGlobal. Talks. All Welcome.",
    ],
  },
  friday_nov21: {
    title: "Friday Nov 21 — ETHGlobal Begins & Final Events",
    events: [
      "All Day: ETHGlobal Hackathon Begins (Nov 21-23) - Organized by ETHGlobal. Hackathon. Beginner. All Welcome.",
      "All Day: Decentraland Music Festival LIVE Party at DevConnect (Nov 21-22) - Organized by Decentraland + DCL Regenesis Labs. Social. All Welcome.",
      "10:00 AM - 5:00 PM: DeFi Today - Organized by Ethereum Foundation. Signup Required. 500 capacity. Mixed Format. Beginner.",
      "11:00 AM - 1:00 PM: University Track - Fundación Blockchain - Included in Ticket. 180 capacity. Mixed Format. Beginner.",
      "All Day: Institutional Ethereum by Ethereum Foundation - Details Soon. Mixed Format. All Welcome.",
    ],
  },
  saturday_nov22: {
    title: "Saturday Nov 22 — Final DevConnect Cube Day",
    events: [
      "4:00 AM - 4:00 PM: Waku P2P Privacy Hacker Lounge - Organized by Waku.org / Logos.co. Tickets Required. 150 capacity. Mixed Format. All Welcome.",
      "8:00 AM - 10:00 AM: University Track - Di Tella Club Blockchain - Included in Ticket. 180 capacity. Mixed Format. Beginner.",
      "10:00 AM - 6:00 PM: Ethproofs Day - Organized by Ethereum Foundation. Included in Ticket. 252 capacity. Mixed Format. All Welcome.",
      "11:00 AM - 1:00 PM: University Track - Trama (ITBA) - Included in Ticket. 180 capacity. Mixed Format. Beginner.",
      "2:15 PM - 6:00 PM: ETH/ACC DEMO DAY - Organized by Odisea Labs. Included in Ticket. 500 capacity. Mixed Format. All Welcome.",
      "All Day: Bridge Atlas - Organized by Summer of Protocols. Signup Required. 100 capacity. Workshop. All Welcome.",
    ],
  },
  sunday_nov23: {
    title: "Sunday Nov 23 — ETHGlobal Continues",
    events: [
      "All Day: ETHGlobal Hackathon (Final Day) - Hackathon continues. Check ETHGlobal for specific schedule.",
    ],
  },
};

// Removed fetchBasecampScheduleDetails - using more specific tools instead

export const getFullSchedule = tool(
  async ({ day, searchAllDays }: { day?: string; searchAllDays?: boolean }) => {
    console.log("🔄 Getting full schedule...", { day, searchAllDays });

    // If user is asking about a specific event (not a specific day), return ALL days so AI can search
    if (searchAllDays) {
      console.log(
        "🔍 Returning complete schedule for all days for AI to search"
      );
      return JSON.stringify(SCHEDULE_DATA);
    }

    // If specific day requested, return that day's schedule
    if (day) {
      const dayKey = day.toLowerCase();
      if (dayKey in SCHEDULE_DATA) {
        return JSON.stringify(
          SCHEDULE_DATA[dayKey as keyof typeof SCHEDULE_DATA]
        );
      }
    }

    // If no day specified, determine current day based on actual event dates
    const now = eventDate();
    const dayOfMonth = now.day;

    // Map actual DevConnect event dates (November 15-23, 2025)
    let currentDay = "monday_nov17"; // fallback
    if (dayOfMonth === 15) currentDay = "saturday_nov15";
    else if (dayOfMonth === 16) currentDay = "sunday_nov16";
    else if (dayOfMonth === 17) currentDay = "monday_nov17";
    else if (dayOfMonth === 18) currentDay = "tuesday_nov18";
    else if (dayOfMonth === 19) currentDay = "wednesday_nov19";
    else if (dayOfMonth === 20) currentDay = "thursday_nov20";
    else if (dayOfMonth === 21) currentDay = "friday_nov21";
    else if (dayOfMonth === 22) currentDay = "saturday_nov22";
    else if (dayOfMonth === 23) currentDay = "sunday_nov23";

    console.log(
      `🔍 Current date: ${now.toFormat("yyyy-MM-dd HH:mm")} ET (day ${dayOfMonth}), determined day: ${currentDay}`
    );

    // Return current day's schedule - AI will semantically search through it
    return JSON.stringify(
      SCHEDULE_DATA[currentDay as keyof typeof SCHEDULE_DATA]
    );
  },
  {
    name: "GetFullSchedule",
    description:
      "Use this tool to get schedule data for DevConnect 2025 (Nov 15-23, 2025). Returns schedule data that the AI will search through to answer the user's question. Use searchAllDays=true when user asks about: SPECIFIC EVENTS/ACTIVITIES by name (like 'When is Staking Summit'), TOP/BIGGEST/BEST events across all days (like 'biggest events', 'top events'), or recommendations across multiple days. Use day parameter when user asks about a SPECIFIC DAY (like 'Monday schedule', 'What's on Tuesday'). Leave both empty for today's schedule.",
    schema: z.object({
      day: z
        .string()
        .optional()
        .describe(
          "Specific day: 'saturday_nov15', 'sunday_nov16', 'monday_nov17', 'tuesday_nov18', 'wednesday_nov19', 'thursday_nov20', 'friday_nov21', 'saturday_nov22', 'sunday_nov23'. Only use when user asks about a specific day."
        ),
      searchAllDays: z
        .boolean()
        .optional()
        .describe(
          "Set to true when user asks about: 1) Specific event/activity by name (not a specific day), 2) Top/biggest/best events across all days, 3) Recommendations that should consider all days. This returns all days so AI can search across the entire event schedule."
        ),
    }),
  }
);

export const getSpeakerInfo = tool(
  async ({ speakerName }: { speakerName: string }) => {
    console.log("🔄 Getting speaker info...", speakerName);

    const speaker = SPEAKERS_DATA[speakerName as keyof typeof SPEAKERS_DATA];

    if (!speaker) {
      return `Speaker "${speakerName}" not found. Available speakers: ${Object.keys(SPEAKERS_DATA).join(", ")}`;
    }

    return `${speakerName} - ${speaker.title}\n\n${speaker.bio}`;
  },
  {
    name: "GetSpeakerInfo",
    description:
      "Get information about a specific speaker at DevConnect 2025. Use when someone asks about speakers, their backgrounds, or who is presenting.",
    schema: z.object({
      speakerName: z
        .string()
        .describe("The name of the speaker to get information about"),
    }),
  }
);

export const getSpecificDaySchedule = tool(
  ({ day }: { day: string }) => {
    console.log("🔄 Getting specific day schedule...", day);
    const dayKey = day.toLowerCase();
    const scheduleData = SCHEDULE_DATA[dayKey as keyof typeof SCHEDULE_DATA];

    if (!scheduleData) {
      return `Invalid day. DevConnect 2025 runs November 15-23, 2025. Available days are:
- Saturday (November 15) - Pre-events Day 1
- Sunday (November 16) - Pre-events Day 2
- Monday (November 17) - ETH Day & DevConnect Cube Opening
- Tuesday-Saturday (November 18-22) - Main DevConnect Cube events
- Sunday (November 23) - ETHGlobal continues`;
    }

    let result = `Here's the schedule for ${scheduleData.title}:\n\n`;
    scheduleData.events.forEach((event) => {
      if (event.trim()) {
        // Skip empty lines
        result += `- ${event}\n`;
      }
    });

    // Add natural prompts for day/night activities on Monday and Tuesday
    const scheduleDataWithActivities = scheduleData as any;
    if (
      scheduleDataWithActivities.dayActivities &&
      scheduleDataWithActivities.nightActivities
    ) {
      result += `\nWant to know more? Ask me about "Day Activities" or "Night Activities" for ${dayKey === "monday" ? "Monday" : "Tuesday"}!`;
    }

    return result;
  },
  {
    name: "GetSpecificDaySchedule",
    description:
      "CRITICAL: Use this tool for specific day schedule questions like 'What's the schedule for Monday?', 'Monday schedule', 'Tuesday schedule', 'show me Monday', etc. Parameter: day (string) - The day to get schedule for (e.g., 'saturday_nov15', 'monday_nov17', etc.)",
    schema: z.object({
      day: z
        .string()
        .describe(
          "The day to get schedule for (e.g., 'saturday_nov15', 'monday_nov17', etc.)"
        ),
    }),
  }
);

export const getDayActivities = tool(
  ({ day, activity }: { day: string; activity?: string }) => {
    console.log("🔄 Getting day activities...", day, activity);
    const dayKey = day.toLowerCase();
    const scheduleData = SCHEDULE_DATA[
      dayKey as keyof typeof SCHEDULE_DATA
    ] as any;

    if (!scheduleData || !scheduleData.dayActivities) {
      return `Day activities information will be available based on the DevConnect schedule. Please check the full schedule for event-specific activities.`;
    }

    let result = `☀️ Here are the Day Activities for ${scheduleData.title}:\n\n`;
    scheduleData.dayActivities.forEach((activityItem: string) => {
      result += `- ${activityItem}\n`;
    });

    // If they asked about a specific activity, highlight it
    if (activity) {
      const lowerActivity = activity.toLowerCase();
      const matchingActivity = scheduleData.dayActivities.find((item: string) =>
        item.toLowerCase().includes(lowerActivity)
      );
      if (matchingActivity) {
        result += `\n🎯 You asked about ${activity}! It's scheduled: ${matchingActivity}`;
      }
    }

    result += `\nLots to choose from! Let me know if you want details about any specific activity.`;

    return result;
  },
  {
    name: "GetDayActivities",
    description: "use this tool when someone is asking for day activities",
    schema: z.object({
      day: z.string().describe("The day to get day activities"),
      activity: z.string().describe("The activity they're asking about"),
    }),
  }
);

export const getActivityTime = tool(
  async ({ activity, day }: { activity: string; day?: string }) => {
    console.log("🔄 Getting activity time...", activity, day);

    // If no day specified, determine current day based on actual event dates
    let searchDay = day?.toLowerCase();
    if (!searchDay) {
      const now = eventDate();
      const dayOfMonth = now.day;

      // Map actual DevConnect event dates (November 15-23, 2025)
      if (dayOfMonth === 15) searchDay = "saturday_nov15";
      else if (dayOfMonth === 16) searchDay = "sunday_nov16";
      else if (dayOfMonth === 17) searchDay = "monday_nov17";
      else if (dayOfMonth === 18) searchDay = "tuesday_nov18";
      else if (dayOfMonth === 19) searchDay = "wednesday_nov19";
      else if (dayOfMonth === 20) searchDay = "thursday_nov20";
      else if (dayOfMonth === 21) searchDay = "friday_nov21";
      else if (dayOfMonth === 22) searchDay = "saturday_nov22";
      else if (dayOfMonth === 23) searchDay = "sunday_nov23";
      else searchDay = "monday_nov17"; // fallback

      console.log(
        `🔍 Current date: ${now.toFormat("yyyy-MM-dd HH:mm")} ET (day ${dayOfMonth}), determined day: ${searchDay}`
      );
    }

    const scheduleData = SCHEDULE_DATA[
      searchDay as keyof typeof SCHEDULE_DATA
    ] as any;

    if (!scheduleData) {
      return `Please specify which day you're asking about: Monday or Tuesday.`;
    }

    const activityLower = activity.toLowerCase();
    let foundActivity = "";

    // Search in day activities
    if (scheduleData.dayActivities) {
      const dayMatch = scheduleData.dayActivities.find((item: string) =>
        item.toLowerCase().includes(activityLower)
      );
      if (dayMatch) foundActivity = dayMatch;
    }

    // Search in night activities
    if (!foundActivity && scheduleData.nightActivities) {
      const nightMatch = scheduleData.nightActivities.find((item: string) =>
        item.toLowerCase().includes(activityLower)
      );
      if (nightMatch) foundActivity = nightMatch;
    }

    if (foundActivity) {
      return `🎯 ${activity} schedule: ${foundActivity}`;
    }

    return `I couldn't find specific timing for "${activity}". Try asking about day activities or night activities for ${searchDay === "monday" ? "Monday" : "Tuesday"}!`;
  },
  {
    name: "GetActivityTime",
    description:
      "Use when someone asks about timing for a specific activity like 'What time is pickleball?', 'When is yoga?', 'What time?'. Parameters: activity (string) - the activity they're asking about, day (optional string) - Monday or Tuesday",
    schema: z.object({
      activity: z
        .string()
        .describe("The DevConnect event or activity they're asking about"),
      day: z.string().describe("The day to get activity time"),
    }),
  }
);

export const getNightActivities = tool(
  ({ day }: { day: string }) => {
    console.log("🔄 Getting night activities...", day);
    const dayKey = day.toLowerCase();
    const scheduleData = SCHEDULE_DATA[
      dayKey as keyof typeof SCHEDULE_DATA
    ] as any;

    if (!scheduleData || !scheduleData.nightActivities) {
      return `Night activities information will be available based on the DevConnect schedule. Please check the full schedule for event-specific activities.`;
    }

    let result = `🌙 Here are the Night Activities for ${scheduleData.title}:\n\n`;
    scheduleData.nightActivities.forEach((activity: string) => {
      result += `- ${activity}\n`;
    });

    result += `\nPerfect way to wind down the day! Ask me about any of these if you want more info.`;

    return result;
  },
  {
    name: "GetNightActivities",
    description:
      "use this schedule tool when someone is asking for night activities",
    schema: z.object({
      day: z.string().describe("The day to get night activities"),
    }),
  }
);
