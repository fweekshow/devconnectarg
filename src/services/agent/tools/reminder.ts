import { tool } from "@langchain/core/tools";
import { DateTime } from "luxon";
import { Chrono } from "chrono-node";
import { z } from "zod";
import { EVENT_TZ } from "@/constant.js";
import {
  cancelAllRemindersForInbox,
  cancelReminder,
  insertReminder,
  listAllPendingForInbox,
} from "@/store.js";


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

export const fetchAllPendingReminders = tool(
  ({ inboxId, userTimezone }: { inboxId: string; userTimezone?: string }) => {
    const reminders = listAllPendingForInbox(inboxId);
    if (reminders.length === 0) {
      return "No pending reminders.";
    }
    
    // Auto-detect user timezone if not provided
    const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const reminderList = reminders
      .map((r) => {
        // Parse the stored UTC time and convert to user's timezone
        const utcTime = DateTime.fromISO(r.targetTime, { zone: 'utc' });
        const userTime = utcTime.setZone(timezone);
        const eventTime = utcTime.setZone(EVENT_TZ);
        
        return `#${r.id} — Your time: ${userTime.toFormat("EEE, MMM d h:mm a")} | Event time: ${eventTime.toFormat("EEE, MMM d h:mm a")} — ${r.message}`;
      })
      .join("\n");
    return `Pending reminders (timezone: ${timezone}):\n${reminderList}`;
  },
  {
    name: "FetchAllPendingReminders",
    description: "Fetch all pending reminders for a given inbox and display them in user's timezone with SF time reference.",
    schema: z.object({
      inboxId: z.string().describe("Chat inbox ID where reminders are set"),
      userTimezone: z.string().optional().describe("User's timezone (auto-detected if not provided)"),
    }),
  },
);

export const cancelPendingReminder = tool(
  ({ reminderId }: { reminderId: number }) => {
    const cancelled = cancelReminder(reminderId);
    return cancelled
      ? `Cancelled reminder #${reminderId}.`
      : `Reminder #${reminderId} not found.`;
  },
  {
    name: "CancelReminder",
    description:
      "Cancels a specific pending reminder using its ID (number). Returns a confirmation message if successful or a not-found message otherwise.",
    schema: z.object({
      reminderId: z.number().describe("ID of the reminder to be cancelled"),
    }),
  },
);

export const cancelAllReminders = tool(
  ({ inboxId }: { inboxId: string }) => {
    const count = cancelAllRemindersForInbox(inboxId);
    return `Cancelled ${count} reminder${count !== 1 ? "s" : ""}.`;
  },
  {
    name: "CancelAllReminders",
    description:
      "Cancels all pending reminders for the specified inbox and returns a message indicating how many reminders were cancelled.",
    schema: z.object({
      inboxId: z.string().describe("Chat inbox ID where reminders are set"),
    }),
  },
);

export const setReminder = tool(
  ({
    inboxId,
    conversationId,
    targetTime,
    message,
    userTimezone,
  }: {
    inboxId: string;
    conversationId: string;
    targetTime: string;
    message: string;
    userTimezone?: string;
  }) => {
    try {
      // Auto-detect user timezone if not provided
      const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Parse the target time in user's timezone first
      let targetDateTime = DateTime.fromISO(targetTime, { zone: timezone });
      
      if (!targetDateTime || !targetDateTime.isValid) {
        return `Sorry, I couldn't understand the time. Please use formats like:
      - "in 2 minutes to call mom"
      - "tomorrow at 2pm to have lunch"
      - "today at 3:30pm to attend meeting"`;
      }

      // Check if the time is in the future
      const now = DateTime.now().setZone(timezone);
      if (targetDateTime <= now) {
        return `The reminder time must be in the future. 
Current time in your timezone: ${now.toFormat("EEEE, MMMM d, yyyy 'at' h:mm a")} (${timezone})`;
      }

      // Store the reminder in UTC for consistency
      const utcDateTime = targetDateTime.toUTC();
      
      const reminderId = insertReminder(
        inboxId,
        conversationId,
        utcDateTime.toISO()!,
        message,
      );

      // Show confirmation in both user's timezone and event time
      const eventTime = targetDateTime.setZone(EVENT_TZ);
      
      return `✅ Reminder set! 
ID: ${reminderId}
Your time: ${targetDateTime.toFormat("EEEE, MMMM d, yyyy 'at' h:mm a")} (${timezone})
Event time: ${eventTime.toFormat("EEEE, MMMM d, yyyy 'at' h:mm a")} (${EVENT_TZ})
Message: ${message}`;
    } catch (error) {
      console.error("Error setting reminder:", error);
      return "Failed to set reminder. Please check your date format and try again.";
    }
  },
  {
    name: "SetReminder",
    description: "Set a reminder for a specific time. Time can be specified in user's local timezone and will be converted appropriately.",
    schema: z.object({
      inboxId: z.string().describe("Chat inbox ID where the reminder was requested"),
      conversationId: z.string().describe("Conversation ID where the reminder should be sent"),
      targetTime: z.string().describe("Target time (supports various formats: ISO, YYYY-MM-DD HH:mm, or natural language)"),
      message: z.string().describe("Reminder message to be sent"),
      userTimezone: z.string().optional().describe("User's timezone (auto-detected if not provided)"),
    }),
  },
);
