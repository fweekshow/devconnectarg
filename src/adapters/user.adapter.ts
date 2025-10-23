import { db } from "@/config";
import { UserInsertParams } from "@/models";

export class UserAdapter {
  static async createTable(): Promise<void> {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          inbox_id TEXT UNIQUE NOT NULL,
          wallet_address TEXT,
          total_messages INTEGER DEFAULT 0,
          reminders_created INTEGER DEFAULT 0,
          first_seen_at TIMESTAMP DEFAULT NOW(),
          last_message_at TIMESTAMP DEFAULT NOW(),
          action_clicks JSONB DEFAULT '{}'::jsonb
        );
      `);
      console.log("Users table created or already exists.");
    } catch (error) {
      console.error("Error creating users table:", error);
    }
  }

  static async incrementActionClick(
    inboxId: string,
    actionKey: string
  ): Promise<void> {
    try {
      await db.query(
        `UPDATE users
         SET action_clicks = COALESCE(action_clicks, '{}'::jsonb)
           || jsonb_build_object($2::text, COALESCE((action_clicks->>$2)::int, 0) + 1)
         WHERE inbox_id = $1`,
        [inboxId, actionKey]
      );
    } catch (error) {
      console.error("Error incrementing action click:", error);
    }
  }

  static async incrementRemindersCreated(inboxId: string): Promise<void> {
    try {
      await db.query(
        `UPDATE users
         SET reminders_created = reminders_created + 1
         WHERE inbox_id = $1`,
        [inboxId]
      );
    } catch (error) {
      console.error("Error incrementing reminders created:", error);
    }
  }

  static async incrementMessageCount(params: UserInsertParams): Promise<void> {
    const { inboxId, walletAddress } = params;

    try {
      await db.query(
        `INSERT INTO users (inbox_id, wallet_address, total_messages)
         VALUES ($1, $2, 1)
         ON CONFLICT (inbox_id) DO UPDATE
         SET total_messages = users.total_messages + 1,
             last_message_at = NOW()`,
        [inboxId, walletAddress || null]
      );
    } catch (error) {
      console.error("Error incrementing message count:", error);
    }
  }
}
