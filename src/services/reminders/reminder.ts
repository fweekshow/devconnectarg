import { DateTime } from "luxon";

import { ReminderAdapter, UserAdapter } from "@/adapters";
import { EVENT_TZ } from "@/constants";

import {
  FetchAllPendingRemindersParams,
  CancelReminderParams,
  CancelAllRemindersParams,
  SetReminderParams,
  FetchCurrentDateTimeParams,
} from "./interfaces";
import {
  FetchAllPendingRemindersSchema,
  CancelReminderSchema,
  CancelAllRemindersSchema,
  SetReminderSchema,
  FetchCurrentDateTimeSchema,
} from "./schemas";

export class ReminderService {
  static async fetchAllPendingReminders(
    params: FetchAllPendingRemindersParams
  ) {
    try {
      const { inboxId, userTimezone } =
        FetchAllPendingRemindersSchema.parse(params);

      const reminders = await ReminderAdapter.listAllPendingForInbox(inboxId);
      if (reminders.length === 0) return "No pending reminders.";

      const timezone =
        userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      const reminderList = reminders
        .map((r) => {
          const utcTime = DateTime.fromISO(r.targetTime, { zone: "utc" });
          const userTime = utcTime.setZone(timezone);
          const eventTime = utcTime.setZone(EVENT_TZ);

          return `#${r.id} — Your time: ${userTime.toFormat("EEE, MMM d h:mm a")} | Event time: ${eventTime.toFormat("EEE, MMM d h:mm a")} — ${r.message}`;
        })
        .join("\n");

      return `Pending reminders (timezone: ${timezone}):\n${reminderList}`;
    } catch (err) {
      console.error("Error fetching pending reminders:", err);
      return `Failed to fetch reminders: ${err}`;
    }
  }

  static async cancelPendingReminder(params: CancelReminderParams) {
    try {
      const { reminderId } = CancelReminderSchema.parse(params);

      const cancelled = await ReminderAdapter.cancelReminder(reminderId);
      return cancelled
        ? `Cancelled reminder #${reminderId}.`
        : `Reminder #${reminderId} not found.`;
    } catch (err) {
      console.error("Error cancelling reminder:", err);
      return `Failed to cancel reminder: ${err}`;
    }
  }

  static async cancelAllReminders(params: CancelAllRemindersParams) {
    try {
      const { inboxId } = CancelAllRemindersSchema.parse(params);

      const count = await ReminderAdapter.cancelAllRemindersForInbox(inboxId);
      return `Cancelled ${count} reminder${count !== 1 ? "s" : ""}.`;
    } catch (err) {
      console.error("Error cancelling all reminders:", err);
      return `Failed to cancel all reminders: ${err}`;
    }
  }

  static async setReminder(params: SetReminderParams) {
    try {
      const { inboxId, conversationId, targetTime, message, userTimezone } =
        SetReminderSchema.parse(params);

      const timezone =
        userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      let targetDateTime = DateTime.fromISO(targetTime, { zone: timezone });

      if (!targetDateTime.isValid) {
        return `Sorry, I couldn't understand the time. Please use formats like:
      - "in 2 minutes to call mom"
      - "tomorrow at 2pm to have lunch"
      - "today at 3:30pm to attend meeting"`;
      }

      const now = DateTime.now().setZone(timezone);
      if (targetDateTime <= now) {
        return `The reminder time must be in the future. 
Current time in your timezone: ${now.toFormat("EEEE, MMMM d, yyyy 'at' h:mm a")} (${timezone})`;
      }

      const utcDateTime = targetDateTime.toUTC();

      const reminderId = await ReminderAdapter.insertReminder({
        inboxId,
        conversationId,
        targetTime: utcDateTime.toISO()!,
        message,
      });

      const eventTime = targetDateTime.setZone(EVENT_TZ);

      try {
        await UserAdapter.incrementRemindersCreated(inboxId);
      } catch (e) {
        console.error("reminders_created increment failed:", e);
      }

      return `✅ Reminder set! 
ID: ${reminderId}
Your time: ${targetDateTime.toFormat("EEEE, MMMM d, yyyy 'at' h:mm a")} (${timezone})
Event time: ${eventTime.toFormat("EEEE, MMMM d, yyyy 'at' h:mm a")} (${EVENT_TZ})
Message: ${message}`;
    } catch (err) {
      console.error("Error setting reminder:", err);
      return `Failed to set reminder: ${err}`;
    }
  }

  static fetchCurrentDateTime(params: FetchCurrentDateTimeParams) {
    try {
      const { userTimezone } = FetchCurrentDateTimeSchema.parse(params);

      const now = new Date();
      const timezone =
        userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      // User's local time
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

      // Also get event time for reference : Event time (Eastern Time)
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
    } catch (err) {
      console.error("Error fetching current date/time:", err);
      return `Failed to fetch current date/time: ${err}`;
    }
  }
}
