import { DateTime } from "luxon";

export const EVENT_TZ = "America/Argentina/Buenos_Aires";

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
