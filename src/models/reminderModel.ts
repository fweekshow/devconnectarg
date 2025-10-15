import { DateTime } from "luxon";
import pool from "../config/db.js";
import { Reminder, User } from "./types";

export async function createTables() {
  try {

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminders_pg (
        id SERIAL PRIMARY KEY,
        inbox_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        target_time TIMESTAMP NOT NULL,
        message TEXT NOT NULL,
        sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
}

export async function getReminders(): Promise<Reminder[]> {
  const result = await pool.query("SELECT * FROM reminders_pg ORDER BY created_at ASC;");
  return result.rows as Reminder[];
}

// 🟢 Insert new reminder
export async function insertReminder(
  inboxId: string,
  conversationId: string,
  targetTime: string,
  message: string,
): Promise<number> {
  const result = await pool.query(
    `INSERT INTO reminders_pg (inbox_id, conversation_id, target_time, message)
     VALUES ($1, $2, $3::timestamp, $4)
     RETURNING id`,
    [inboxId, conversationId, targetTime, message]
  );

  return result.rows[0].id;
}

// 🟢 List all pending reminders
export async function listPendingReminders(): Promise<Reminder[]> {
  const result = await pool.query(
    `SELECT id, inbox_id, conversation_id,
            to_char(target_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS target_time,
            message, sent,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
     FROM reminders_pg
     WHERE sent = FALSE
     ORDER BY target_time ASC`
  );
  return result.rows;
}

// 🟢 List pending reminders for a specific inbox
export async function listAllPendingForInbox(inboxId: string): Promise<Reminder[]> {
  const result = await pool.query(
    `SELECT id, inbox_id, conversation_id,
            to_char(target_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS target_time,
            message, sent,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
     FROM reminders_pg
     WHERE inbox_id = $1 AND sent = FALSE
     ORDER BY target_time ASC`,
    [inboxId]
  );
  return result.rows;
}

// 🟢 Mark reminder as sent
export async function markReminderSent(id: number): Promise<void> {
  await pool.query(`UPDATE reminders_pg SET sent = TRUE WHERE id = $1`, [id]);
}

// 🟢 Cancel a specific reminder
export async function cancelReminder(id: number): Promise<boolean> {
  const result = await pool.query(`DELETE FROM reminders_pg WHERE id = $1`, [id]);
  return result.rowCount && result.rowCount >= 0 ? true : false;
}

// 🟢 Cancel all pending reminders for an inbox
export async function cancelAllRemindersForInbox(inboxId: string): Promise<number> {
  const result = await pool.query(
    `DELETE FROM reminders_pg WHERE inbox_id = $1 AND sent = FALSE`,
    [inboxId]
  );
  return result.rowCount || 0;
}

// 🟢 Get all due reminders (targetTime <= now)
export async function getDueReminders(): Promise<Reminder[]> {
  const now = DateTime.now().toUTC().toISO();

  const result = await pool.query(
    `SELECT id, inbox_id, conversation_id,
            to_char(target_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS target_time,
            message, sent,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
     FROM reminders_pg
     WHERE sent = FALSE AND target_time <= $1::timestamp
     ORDER BY target_time ASC`,
    [now]
  );
  return result.rows;
}