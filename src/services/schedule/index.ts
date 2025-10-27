import {
  GetFullScheduleParams,
  GetSpecificDayScheduleParams,
  GetDayActivitiesParams,
  GetActivityTimeParams,
  GetNightActivitiesParams,
  GetSpeakerInfoParams,
} from "./interfaces";

import {
  GetFullScheduleSchema,
  GetSpecificDayScheduleSchema,
  GetDayActivitiesSchema,
  GetActivityTimeSchema,
  GetNightActivitiesSchema,
  GetSpeakerInfoSchema,
} from "./schemas";

import {
  eventDate,
  INVALID_DAY_MESSAGE,
  SCHEDULE_DATA,
  SPEAKERS_DATA,
} from "@/constants";

export class ScheduleService {
    
  private static readonly dayMap: Record<number, string> = {
    15: "saturday_nov15",
    16: "sunday_nov16",
    17: "monday_nov17",
    18: "tuesday_nov18",
    19: "wednesday_nov19",
    20: "thursday_nov20",
    21: "friday_nov21",
    22: "saturday_nov22",
    23: "sunday_nov23",
  };

  static getFullSchedule(params: GetFullScheduleParams) {
    try {
      const parsed = GetFullScheduleSchema.parse(params);
      const { day, searchAllDays } = parsed;
      console.log("🔄 Getting full schedule...", { day, searchAllDays });

      if (searchAllDays) {
        console.log(
          "🔍 Returning complete schedule for all days for AI to search"
        );
        return JSON.stringify(SCHEDULE_DATA);
      }

      if (day) {
        const dayKey = day.toLowerCase();
        if (dayKey in SCHEDULE_DATA) {
          return JSON.stringify(
            SCHEDULE_DATA[dayKey as keyof typeof SCHEDULE_DATA]
          );
        }
      }

      const now = eventDate();
      const dayOfMonth = now.day;

      const currentDay = ScheduleService.dayMap[dayOfMonth] || "monday_nov17";

      console.log(
        `🔍 Current date: ${now.toFormat("yyyy-MM-dd HH:mm")} ET (day ${dayOfMonth}), determined day: ${currentDay}`
      );

      return JSON.stringify(
        SCHEDULE_DATA[currentDay as keyof typeof SCHEDULE_DATA]
      );
    } catch (err) {
      console.error("❌ Error in getFullSchedule:", err);
      return `⚠️ Failed to get full schedule: ${err}`;
    }
  }

  static getSpecificDaySchedule(params: GetSpecificDayScheduleParams) {
    try {
      const parsed = GetSpecificDayScheduleSchema.parse(params);
      const { day } = parsed;
      console.log("🔄 Getting specific day schedule...", day);

      const dayKey = day.toLowerCase();
      const scheduleData = SCHEDULE_DATA[dayKey as keyof typeof SCHEDULE_DATA];

      if (!scheduleData) {
        return INVALID_DAY_MESSAGE;
      }

      let result = `Here's the schedule for ${scheduleData.title}:\n\n`;
      scheduleData.events.forEach((event) => {
        if (event.trim()) {
          result += `- ${event}\n`;
        }
      });

      const scheduleDataWithActivities = scheduleData as any;
      if (
        scheduleDataWithActivities.dayActivities &&
        scheduleDataWithActivities.nightActivities
      ) {
        result += `\nWant to know more? Ask me about "Day Activities" or "Night Activities" for ${dayKey === "monday" ? "Monday" : "Tuesday"}!`;
      }
      return result;
    } catch (err) {
      console.error("❌ Error in getSpecificDaySchedule:", err);
      return `⚠️ Failed to get specific day schedule: ${err}`;
    }
  }

  static getDayActivities(params: GetDayActivitiesParams) {
    try {
      const parsed = GetDayActivitiesSchema.parse(params);
      const { day, activity } = parsed;
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
        const matchingActivity = scheduleData.dayActivities.find(
          (item: string) => item.toLowerCase().includes(lowerActivity)
        );
        if (matchingActivity) {
          result += `\n🎯 You asked about ${activity}! It's scheduled: ${matchingActivity}`;
        }
      }

      result += `\nLots to choose from! Let me know if you want details about any specific activity.`;

      return result;
    } catch (err) {
      console.error("❌ Error in getDayActivities:", err);
      return `⚠️ Failed to get day activities: ${err}`;
    }
  }

  static getActivityTime(params: GetActivityTimeParams) {
    try {
      const parsed = GetActivityTimeSchema.parse(params);
      const { activity, day } = parsed;

      console.log("🔄 Getting activity time...", activity, day);

      let searchDay = day?.toLowerCase();
      if (!searchDay) {
        const now = eventDate();
        const dayOfMonth = now.day;
        searchDay = ScheduleService.dayMap[dayOfMonth] || "monday_nov17";

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

      const allActivities = [
        ...(scheduleData.dayActivities || []),
        ...(scheduleData.nightActivities || []),
      ];

      const foundActivity = allActivities.find((item: string) =>
        item.toLowerCase().includes(activityLower)
      );

      if (foundActivity) {
        return `🎯 ${activity} schedule: ${foundActivity}`;
      }

      return `I couldn't find specific timing for "${activity}". Try asking about day activities or night activities for ${searchDay === "monday" ? "Monday" : "Tuesday"}!`;
    } catch (error: any) {
      console.error("❌ Error in getActivityTime:", error);
      return `⚠️ Failed to get activity time: ${error.message || error}`;
    }
  }

  static getNightActivities(params: GetNightActivitiesParams) {
    try {
      const parsed = GetNightActivitiesSchema.parse(params);
      const { day } = parsed;

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
    } catch (err) {
      {
        console.error("❌ Error in getNightActivities:", err);
        return `⚠️ Failed to get night activities: ${err}`;
      }
    }
  }

  static getSpeakerInfo(params: GetSpeakerInfoParams) {
    try {
      const parsed = GetSpeakerInfoSchema.parse(params);
      const { speakerName } = parsed;
      console.log("🔄 Getting speaker info...", speakerName);

      const speaker = SPEAKERS_DATA[speakerName as keyof typeof SPEAKERS_DATA];

      if (!speaker) {
        return `Speaker "${speakerName}" not found. Available speakers: ${Object.keys(SPEAKERS_DATA).join(", ")}`;
      }

      return `${speakerName} - ${speaker.title}\n\n${speaker.bio}`;
    } catch (err) {
      console.error("❌ Error in getSpeakerInfo:", err);
      return `⚠️ Failed to get speaker info: ${err}`;
    }
  }
}
