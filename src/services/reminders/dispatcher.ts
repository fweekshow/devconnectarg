import type { Client } from "@xmtp/node-sdk";

import { ReminderAdapter } from "@/adapters";

export class ReminderDispatcherImpl {
  private intervalId: NodeJS.Timeout | null = null;
  private client: Client<any> | null = null;

  start(client: Client<any>): void {
    this.client = client;
    this.intervalId = setInterval(async () => {
      await this.processDueReminders();
    }, 30_000); // Check every 30 seconds
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.client = null;
  }

  private async processDueReminders(): Promise<void> {
    if (!this.client) return;

    try {
      const dueReminders = await ReminderAdapter.getDueReminders();

      for (const reminder of dueReminders) {
        await this.sendReminder(reminder);
        await ReminderAdapter.markReminderSent(reminder.id);
      }
    } catch (error) {
      console.error("Error processing due reminders:", error);
    }
  }

  private async sendReminder(reminder: any): Promise<void> {
    if (!this.client) return;

    try {
      // Send reminder only to the specific conversation where it was requested
      // This fixes the privacy issue where reminders were sent to all user conversations
      const conversation = await this.client.conversations.getConversationById(
        reminder.conversation_id
      );

      if (conversation) {
        const reminderMessage = `⏰ Reminder: ${reminder.message}`;
        await conversation.send(reminderMessage);
        console.log(
          `Sent reminder #${reminder.id} to conversation ${reminder.conversation_id}`
        );
      } else {
        console.error(
          `Could not find conversation ${reminder.conversation_id} for reminder #${reminder.id}`
        );
      }
    } catch (error) {
      console.error(`Failed to send reminder #${reminder.id}:`, error);
    }
  }
}
