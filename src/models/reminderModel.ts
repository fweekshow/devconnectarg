import { DateTime } from "luxon";
import pool from "../config/db.js";
import { Reminder } from "./types";

export async function createReminderTable() {
  try {
    await pool.query(`
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
  } catch (error) {
    console.error("Error creating reminders table:", error);
  }
}

export async function getReminders(): Promise<Reminder[]> {
  const result = await pool.query(
    `SELECT * FROM reminders ORDER BY created_at ASC`
  );
  return result.rows as Reminder[];
}

export async function insertReminder(
  inboxId: string,
  conversationId: string,
  targetTime: string,
  message: string,
): Promise<number> {
  const result = await pool.query(
    `INSERT INTO reminders (inbox_id, conversation_id, target_time, message)
     VALUES ($1, $2, $3::timestamp, $4)
     RETURNING id`,
    [inboxId, conversationId, targetTime, message]
  );
  return result.rows[0].id;
}

export async function listPendingReminders(): Promise<Reminder[]> {
  const result = await pool.query(
    `SELECT id, inbox_id, conversation_id,
            to_char(target_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS target_time,
            message, sent,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
     FROM reminders
     WHERE sent = FALSE
     ORDER BY target_time ASC`
  );
  return result.rows;
}

export async function listAllPendingForInbox(inboxId: string): Promise<Reminder[]> {
  const result = await pool.query(
    `SELECT id, inbox_id, conversation_id,
            to_char(target_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS target_time,
            message, sent,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
     FROM reminders
     WHERE inbox_id = $1 AND sent = FALSE
     ORDER BY target_time ASC`,
    [inboxId]
  );
  return result.rows;
}

export async function markReminderSent(id: number): Promise<void> {
  await pool.query(`UPDATE reminders SET sent = TRUE WHERE id = $1`, [id]);
}

export async function cancelReminder(id: number): Promise<boolean> {
  const result = await pool.query(`DELETE FROM reminders WHERE id = $1`, [id]);
  return result.rowCount ? result.rowCount > 0 : false;
}

export async function cancelAllRemindersForInbox(inboxId: string): Promise<number> {
  const result = await pool.query(
    `DELETE FROM reminders WHERE inbox_id = $1 AND sent = FALSE`,
    [inboxId]
  );
  return result.rowCount || 0;
}

export async function getDueReminders(): Promise<Reminder[]> {
  const now = DateTime.now().toUTC().toISO();
  const result = await pool.query(
    `SELECT id, inbox_id, conversation_id,
            to_char(target_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS target_time,
            message, sent,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
     FROM reminders
     WHERE sent = FALSE AND target_time <= $1::timestamp
     ORDER BY target_time ASC`,
    [now]
  );
  return result.rows;
}