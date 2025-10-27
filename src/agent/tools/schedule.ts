import { ScheduleService } from "@/services/schedule";
import {
  GetFullScheduleSchema,
  GetSpecificDayScheduleSchema,
  GetDayActivitiesSchema,
  GetActivityTimeSchema,
  GetNightActivitiesSchema,
  GetSpeakerInfoSchema,
} from "@/services/schedule/schemas";
import { tool } from "@langchain/core/tools";


export const getFullSchedule = tool(ScheduleService.getFullSchedule, {
  name: "GetFullSchedule",
  description:
    "Use this tool to get schedule data for DevConnect 2025 (Nov 15-23, 2025). Returns schedule data that the AI will search through to answer the user's question. Use searchAllDays=true when user asks about: SPECIFIC EVENTS/ACTIVITIES by name (like 'When is Staking Summit'), TOP/BIGGEST/BEST events across all days (like 'biggest events', 'top events'), or recommendations across multiple days. Use day parameter when user asks about a SPECIFIC DAY (like 'Monday schedule', 'What's on Tuesday'). Leave both empty for today's schedule.",
  schema: GetFullScheduleSchema,
});

export const getSpeakerInfo = tool(ScheduleService.getSpeakerInfo, {
  name: "GetSpeakerInfo",
  description:
    "Get information about a specific speaker at DevConnect 2025. Use when someone asks about speakers, their backgrounds, or who is presenting.",
  schema: GetSpeakerInfoSchema,
});

export const getSpecificDaySchedule = tool(
  ScheduleService.getSpecificDaySchedule,
  {
    name: "GetSpecificDaySchedule",
    description:
      "CRITICAL: Use this tool for specific day schedule questions like 'What's the schedule for Monday?', 'Monday schedule', 'Tuesday schedule', 'show me Monday', etc. Parameter: day (string) - The day to get schedule for (e.g., 'saturday_nov15', 'monday_nov17', etc.)",
    schema: GetSpecificDayScheduleSchema,
  }
);

export const getDayActivities = tool(ScheduleService.getDayActivities, {
  name: "GetDayActivities",
  description: "use this tool when someone is asking for day activities",
  schema: GetDayActivitiesSchema,
});

export const getActivityTime = tool(ScheduleService.getActivityTime, {
  name: "GetActivityTime",
  description:
    "Use when someone asks about timing for a specific activity like 'What time is pickleball?', 'When is yoga?', 'What time?'. Parameters: activity (string) - the activity they're asking about, day (optional string) - Monday or Tuesday",
  schema: GetActivityTimeSchema,
});

export const getNightActivities = tool(ScheduleService.getNightActivities, {
  name: "GetNightActivities",
  description:
    "use this schedule tool when someone is asking for night activities",
  schema: GetNightActivitiesSchema,
});
