import { fetchAllPendingReminders, cancelAllReminders, cancelPendingReminder, setReminder } from "@/services/agent/tools/reminder/reminder.js";
import { tool } from "@langchain/core/tools";
import { DateTime } from "luxon";
import { Chrono } from "chrono-node";
import { z } from "zod";
import { EVENT_TZ } from "@/constant.js";
  
export function parseReminderText(input: string, timezone: string) {
    const text = input.trim();
    const chrono = new Chrono();
    const parsed = chrono.parse(text, new Date(), { forwardDate: true });
  
    if (parsed.length > 0) {
      const first = parsed[0];
      const parsedDate = DateTime.fromJSDate(first.start.date(), { zone: timezone });
  
      // Extract message by removing the parsed time expression
      const timeText = text.substring(first.index, first.index + first.text.length);
      const message = text.replace(timeText, "").replace(/^to\s*/i, "").trim() || "Reminder";
  
      return { targetTime: parsedDate.toISO(), message };
    }
  
    // Fallback: handle "in X minutes/hours/days" manually
    const fallback = parseSimpleRelativeTime(text, timezone);
    if (fallback) return fallback;
  
    return { targetTime: null, message: "" };
  }
  
  function parseSimpleRelativeTime(text: string, timezone: string) {
    const now = DateTime.now().setZone(timezone);
    const lower = text.toLowerCase();
  
    let targetDateTime: DateTime | null = null;
  
    const minutes = lower.match(/in\s+(\d+)\s+minutes?/);
    const hours = lower.match(/in\s+(\d+)\s+hours?/);
    const days = lower.match(/in\s+(\d+)\s+days?/);
  
    if (minutes) targetDateTime = now.plus({ minutes: +minutes[1] });
    else if (hours) targetDateTime = now.plus({ hours: +hours[1] });
    else if (days) targetDateTime = now.plus({ days: +days[1] });
  
    if (targetDateTime) {
      const message = lower.replace(/in\s+\d+\s+(minutes?|hours?|days?)/, "").replace(/^to\s*/, "").trim() || "Reminder";
      return { targetTime: targetDateTime.toISO(), message };
    }
  
    return null;
  }
  
  export const fetchCurrentDateTime = tool(
    ({ userTimezone }: { userTimezone?: string }) => {
      const now = new Date();
      const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Get time in user's timezone
      const userTime = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZoneName: "short",
      }).format(now);
      
      // Also get event time for reference
      const eventTime = new Intl.DateTimeFormat("en-US", {
        timeZone: EVENT_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit", 
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short",
      }).format(now);
      
      return `Current time:
  Your timezone (${timezone}): ${userTime}
  Event timezone (${EVENT_TZ}): ${eventTime}
  
  NOTE: All event times are in Eastern Time. When setting reminders, specify times in your local timezone and I'll convert them appropriately.`;
    },
    {
      name: "FetchCurrentDateTime",
      description:
        "Fetch the current date and time in both user's timezone and event timezone (Eastern). Useful for timestamping events, setting reminders, and showing time context.",
      schema: z.object({
        userTimezone: z.string().optional().describe("User's timezone (auto-detected if not provided)"),
      }),
    },
  );
  
  