export interface FetchAllPendingRemindersParams {
  inboxId: string;
  userTimezone?: string;
}

export interface CancelReminderParams {
  reminderId: number;
}

export interface CancelAllRemindersParams {
  inboxId: string;
}

export interface SetReminderParams {
  inboxId: string;
  conversationId: string;
  targetTime: string;
  message: string;
  userTimezone?: string;
}
