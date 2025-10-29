import { tool } from "@langchain/core/tools";

import { ReminderService } from "@/services/reminders/index.js";
import {
  CancelAllRemindersSchema,
  CancelReminderSchema,
  FetchAllPendingRemindersSchema,
  FetchCurrentDateTimeSchema,
  SetReminderSchema,
} from "@/services/reminders/schemas/index.js";

export const fetchAllPendingReminders = tool(
  ReminderService.fetchAllPendingReminders,
  {
    name: "FetchAllPendingReminders",
    description:
      "Fetch all pending reminders for a given inbox and display them in user's timezone with SF time reference.",
    schema: FetchAllPendingRemindersSchema,
  }
);

export const cancelPendingReminder = tool(
  ReminderService.cancelPendingReminder,
  {
    name: "CancelReminder",
    description:
      "Cancels a specific pending reminder using its ID (number). Returns a confirmation message if successful or a not-found message otherwise.",
    schema: CancelReminderSchema,
  }
);

export const cancelAllReminders = tool(ReminderService.cancelAllReminders, {
  name: "CancelAllReminders",
  description:
    "Cancels all pending reminders for the specified inbox and returns a message indicating how many reminders were cancelled.",
  schema: CancelAllRemindersSchema,
});

export const setReminder = tool(ReminderService.setReminder, {
  name: "SetReminder",
  description:
    "Set a reminder for a specific time. Time can be specified in user's local timezone and will be converted appropriately.",
  schema: SetReminderSchema,
});

export const fetchCurrentDateTime = tool(ReminderService.fetchCurrentDateTime, {
  name: "FetchCurrentDateTime",
  description:
    "Fetch the current date and time in both user's timezone and event timezone (Eastern). Useful for timestamping events, setting reminders, and showing time context.",
  schema: FetchCurrentDateTimeSchema,
});
