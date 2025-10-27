import { z } from "zod";

export const GetFullScheduleSchema = z.object({
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
});

export const GetSpecificDayScheduleSchema = z.object({
  day: z
    .string()
    .describe(
      "The day to get schedule for (e.g., 'saturday_nov15', 'monday_nov17', etc.)"
    ),
});

export const GetDayActivitiesSchema = z.object({
  day: z.string().describe("The day to get day activities"),
  activity: z.string().describe("The activity they're asking about"),
});

export const GetActivityTimeSchema = z.object({
  activity: z
    .string()
    .describe("The DevConnect event or activity they're asking about"),
  day: z.string().describe("The day to get activity time"),
});

export const GetNightActivitiesSchema = z.object({
  day: z.string().describe("The day to get night activities"),
});
