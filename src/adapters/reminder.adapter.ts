import { db } from "@/config/index.js";
import { Reminder, ReminderInsertParams } from "@/models/index.js";
import { DateTime } from "luxon";

const serializeReminder = (row: any): Reminder => {
  return {
    id: row.id,
    inboxId: row.inbox_id,
    conversationId: row.conversation_id,
    targetTime: row.target_time,
    message: row.message,
    sent: row.sent,
    createdAt: row.created_at,
  };
};

export class ReminderAdapter {
  static async createTable(): Promise<void> {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS reminders (
          id SERIAL PRIMARY KEY,
          inbox_id TEXT NOT NULL,
          conversation_id TEXT NOT NULL,
          target_time TIMESTAMP NOT NULL,
          message TEXT NOT NULL,
          sent BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log("Reminders table created or already exists.");
    } catch (error) {
      console.error("Error creating reminders table:", error);
    }
  }

  static async getReminders(): Promise<Reminder[]> {
    const result = await db.query(
      `SELECT * FROM reminders ORDER BY created_at ASC`
    );
    return result.rows.map(serializeReminder);
  }

  static async insertReminder(params: ReminderInsertParams): Promise<number> {
    const { inboxId, conversationId, targetTime, message } = params;
    const result = await db.query(
      `INSERT INTO reminders (inbox_id, conversation_id, target_time, message)
       VALUES ($1, $2, $3::timestamp, $4)
       RETURNING id`,
      [inboxId, conversationId, targetTime, message]
    );
    return result.rows[0].id;
  }

  static async listPendingReminders(): Promise<Reminder[]> {
    const result = await db.query(
      `SELECT id, inbox_id, conversation_id,
            to_char(target_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS target_time,
            message, sent,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
     FROM reminders
     WHERE sent = FALSE
     ORDER BY target_time ASC`
    );
    return result.rows.map(serializeReminder);
  }

  static async listAllPendingForInbox(inboxId: string): Promise<Reminder[]> {
    const result = await db.query(
      `SELECT id, inbox_id, conversation_id,
            to_char(target_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS target_time,
            message, sent,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
     FROM reminders
     WHERE inbox_id = $1 AND sent = FALSE
     ORDER BY target_time ASC`,
      [inboxId]
    );
    return result.rows.map(serializeReminder);
  }

  static async markReminderSent(id: number): Promise<void> {
    await db.query(`UPDATE reminders SET sent = TRUE WHERE id = $1`, [id]);
  }

  static async cancelReminder(id: number): Promise<boolean> {
    const result = await db.query(`DELETE FROM reminders WHERE id = $1`, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  static async cancelAllRemindersForInbox(inboxId: string): Promise<number> {
    const result = await db.query(
      `DELETE FROM reminders WHERE inbox_id = $1 AND sent = FALSE`,
      [inboxId]
    );
    return result.rowCount || 0;
  }

  static async getDueReminders(): Promise<Reminder[]> {
    const now = DateTime.now().toUTC().toISO();
    const result = await db.query(
      `SELECT id, inbox_id, conversation_id,
            to_char(target_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS target_time,
            message, sent,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
     FROM reminders
     WHERE sent = FALSE AND target_time <= $1::timestamp
     ORDER BY target_time ASC`,
      [now]
    );
    return result.rows.map(serializeReminder);
  }
}
