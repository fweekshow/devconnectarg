export interface ReminderInsertParams {
  inboxId: string;
  conversationId: string;
  targetTime: string;
  message: string;
}

export interface Reminder extends ReminderInsertParams {
  id: number;
  sent: boolean;
  createdAt: string;
}
