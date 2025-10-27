import { z } from "zod";

export const FetchAllPendingRemindersSchema = z.object({
  inboxId: z.string().describe("Chat inbox ID where reminders are set"),
  userTimezone: z
    .string()
    .optional()
    .describe("User's timezone (auto-detected if not provided)"),
});

export const CancelReminderSchema = z.object({
  reminderId: z.number().describe("ID of the reminder to be cancelled"),
});

export const CancelAllRemindersSchema = z.object({
  inboxId: z.string().describe("Chat inbox ID where reminders are set"),
});

export const SetReminderSchema = z.object({
  inboxId: z
    .string()
    .describe("Chat inbox ID where the reminder was requested"),
  conversationId: z
    .string()
    .describe("Conversation ID where the reminder should be sent"),
  targetTime: z
    .string()
    .describe(
      "Target time (supports various formats: ISO, YYYY-MM-DD HH:mm, or natural language)"
    ),
  message: z.string().describe("Reminder message to be sent"),
  userTimezone: z
    .string()
    .optional()
    .describe("User's timezone (auto-detected if not provided)"),
});
