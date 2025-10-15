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
} from "@/models/reminderModel.js";
import { Reminder } from "@/models/types.js";


export const fetchAllPendingReminders = tool(
  async ({ inboxId, userTimezone }: { inboxId: string; userTimezone?: string }) => {
    try {
      const reminders = await listAllPendingForInbox(inboxId);
      if (reminders.length === 0) {
        return "No pending reminders.";
      }
      // Auto-detect user timezone if not provided
      const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const reminderList = reminders
        .map((r: Reminder) => {
          // Parse the stored UTC time and convert to user's timezone
          const utcTime = DateTime.fromISO(r.target_time, { zone: 'utc' });
          const userTime = utcTime.setZone(timezone);
          const eventTime = utcTime.setZone(EVENT_TZ);
          
          return `#${r.id} — Your time: ${userTime.toFormat("EEE, MMM d h:mm a")} | Event time: ${eventTime.toFormat("EEE, MMM d h:mm a")} — ${r.message}`;
        })
        .join("\n");
      return `Pending reminders (timezone: ${timezone}):\n${reminderList}`;
    } catch (error: any) {
      console.error("Error fetching pending reminders:", error);
      return `Failed to fetch reminders: ${error.message}`;
    }
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
  async ({ reminderId }: { reminderId: number }) => {
    try {
      const cancelled = await cancelReminder(reminderId);
      return cancelled
        ? `Cancelled reminder #${reminderId}.`
        : `Reminder #${reminderId} not found.`;
    } catch (error: any) {
      console.error("Error cancelling reminder:", error);
      return `Failed to cancel reminder: ${error.message}`;
    }
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
  async ({ inboxId }: { inboxId: string }) => {
    try {
      const count = await cancelAllRemindersForInbox(inboxId);
      return `Cancelled ${count} reminder${count !== 1 ? "s" : ""}.`;
    } catch (error: any) {
      console.error("Error cancelling all reminders:", error);
      return `Failed to cancel all reminders: ${error.message}`;
    }
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
  async ({
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
      
      const reminderId = await insertReminder(
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
