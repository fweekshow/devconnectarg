import { DateTime } from "luxon";

// DevConnect 2025 - Buenos Aires, Argentina
// Main venue: La Rural (Devconnect Cube / World's Fair)

// URLs and handles
export const BASECAMP_URL = "https://devconnect.org/calendar";
export const X_HANDLE = "@efdevconnect";

// Timezone - Buenos Aires, Argentina
export const EVENT_TZ = "America/Argentina/Buenos_Aires";

//Default Reply
export const DEFAULT_REPLY =
  "Oops! I didn't understand your query. Could you please rephrase or provide more details?😅";

// Event dates (November 15-23, 2025)
export const EVENT_DATES = {
  // Pre-event days
  saturday_nov15: DateTime.fromObject(
    { year: 2025, month: 11, day: 15 },
    { zone: EVENT_TZ },
  ),
  sunday_nov16: DateTime.fromObject(
    { year: 2025, month: 11, day: 16 },
    { zone: EVENT_TZ },
  ),
  // Main DevConnect Cube days (La Rural World's Fair)
  monday_nov17: DateTime.fromObject(
    { year: 2025, month: 11, day: 17 },
    { zone: EVENT_TZ },
  ),
  tuesday_nov18: DateTime.fromObject(
    { year: 2025, month: 11, day: 18 },
    { zone: EVENT_TZ },
  ),
  wednesday_nov19: DateTime.fromObject(
    { year: 2025, month: 11, day: 19 },
    { zone: EVENT_TZ },
  ),
  thursday_nov20: DateTime.fromObject(
    { year: 2025, month: 11, day: 20 },
    { zone: EVENT_TZ },
  ),
  friday_nov21: DateTime.fromObject(
    { year: 2025, month: 11, day: 21 },
    { zone: EVENT_TZ },
  ),
  saturday_nov22: DateTime.fromObject(
    { year: 2025, month: 11, day: 22 },
    { zone: EVENT_TZ },
  ),
  sunday_nov23: DateTime.fromObject(
    { year: 2025, month: 11, day: 23 },
    { zone: EVENT_TZ },
  ),
};

// Helper function to get current event timezone date
export const eventDate = () => DateTime.now().setZone(EVENT_TZ);

// Helper function to get event date for a day
export const eventDateFor = (day: string) => {
  const normalized = day.toLowerCase().replace(/[^a-z]/g, "");
  return EVENT_DATES[normalized as keyof typeof EVENT_DATES];
};

export const STAFF_WALLETS = [
  "0x22209CFC1397832f32160239C902B10A624cAB1A".toLowerCase(), // Mateo
];

// TODO: ADD DEVCONNECT 2025 GROUP KEYWORDS HERE
// Group-related keywords for activity detection and group joining
// Example: "staking_summit", "governance_day", "eth_day", etc.
export const GROUP_KEYWORDS: string[] = [
  // Add DevConnect event keywords here when available
];

// export const AUTHORIZED_BASENAMES = [
//     // Add more basenames here for additional authorized users
//     // "alice.base.eth",
//     // "bob.base.eth",
//   ];