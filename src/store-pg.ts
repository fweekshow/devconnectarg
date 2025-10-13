import pkg from 'pg';
const { Pool } = pkg;
import { DateTime } from "luxon";

let pool: pkg.Pool | null = null;

export interface Reminder {
  id: number;
  inboxId: string;
  conversationId: string;
  targetTime: string; // ISO string
  message: string;
  sent: boolean | number; // PostgreSQL boolean, SQLite 0/1 compatibility
  createdAt: string; // ISO string
}

export async function openRemindersDb(): Promise<void> {
  // Use DATABASE_URL from Railway environment
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required for PostgreSQL");
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // Test connection
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    throw error;
  }

  // Create tables
  await createTables();
}

async function createTables(): Promise<void> {
  if (!pool) throw new Error("Database pool not initialized");

  const client = await pool.connect();
  
  try {
    // Create reminders table with proper schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        "inboxId" TEXT NOT NULL,
        "conversationId" TEXT NOT NULL,
        "targetTime" TIMESTAMP NOT NULL,
        message TEXT NOT NULL,
        sent BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reminders_inbox_sent 
      ON reminders("inboxId", sent) WHERE sent = FALSE
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reminders_target_time 
      ON reminders("targetTime") WHERE sent = FALSE
    `);

    // User verification table
    await client.query(`
      CREATE TABLE IF NOT EXISTS verified_users (
        id SERIAL PRIMARY KEY,
        "inboxId" TEXT UNIQUE NOT NULL,
        "walletAddress" TEXT,
        "verifiedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "lastActiveAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ PostgreSQL tables created/verified');
  } finally {
    client.release();
  }
}

export async function insertReminder(
  inboxId: string,
  conversationId: string,
  targetTime: string,
  message: string,
): Promise<number> {
  if (!pool) throw new Error("Database pool not initialized");

  const result = await pool.query(
    `INSERT INTO reminders ("inboxId", "conversationId", "targetTime", message)
     VALUES ($1, $2, $3::timestamp, $4)
     RETURNING id`,
    [inboxId, conversationId, targetTime, message]
  );

  return result.rows[0].id;
}

export async function listPendingReminders(): Promise<Reminder[]> {
  if (!pool) throw new Error("Database pool not initialized");

  const result = await pool.query(
    `SELECT id, "inboxId", "conversationId", 
            to_char("targetTime", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "targetTime",
            message, sent,
            to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
     FROM reminders 
     WHERE sent = FALSE 
     ORDER BY "targetTime" ASC`
  );

  return result.rows;
}

export async function listAllPendingForInbox(inboxId: string): Promise<Reminder[]> {
  if (!pool) throw new Error("Database pool not initialized");

  const result = await pool.query(
    `SELECT id, "inboxId", "conversationId",
            to_char("targetTime", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "targetTime",
            message, sent,
            to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
     FROM reminders 
     WHERE "inboxId" = $1 AND sent = FALSE 
     ORDER BY "targetTime" ASC`,
    [inboxId]
  );

  return result.rows;
}

export async function markReminderSent(id: number): Promise<void> {
  if (!pool) throw new Error("Database pool not initialized");

  await pool.query(
    `UPDATE reminders SET sent = TRUE WHERE id = $1`,
    [id]
  );
}

export async function cancelReminder(id: number): Promise<boolean> {
  if (!pool) throw new Error("Database pool not initialized");

  const result = await pool.query(
    `DELETE FROM reminders WHERE id = $1`,
    [id]
  );

  return result.rowCount ? result.rowCount > 0 : false;
}

export async function cancelAllRemindersForInbox(inboxId: string): Promise<number> {
  if (!pool) throw new Error("Database pool not initialized");

  const result = await pool.query(
    `DELETE FROM reminders WHERE "inboxId" = $1 AND sent = FALSE`,
    [inboxId]
  );

  return result.rowCount || 0;
}

export async function getDueReminders(): Promise<Reminder[]> {
  if (!pool) throw new Error("Database pool not initialized");

  // Use UTC for comparison since reminders are stored in UTC
  const now = DateTime.now().toUTC().toISO();

  const result = await pool.query(
    `SELECT id, "inboxId", "conversationId",
            to_char("targetTime", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "targetTime",
            message, sent,
            to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
     FROM reminders 
     WHERE sent = FALSE AND "targetTime" <= $1::timestamp
     ORDER BY "targetTime" ASC`,
    [now]
  );

  return result.rows;
}

// Initialize database
export async function initDb(): Promise<void> {
  console.log(`📋 Initializing PostgreSQL database...`);
  await openRemindersDb();
}

// User verification functions
export async function isUserVerified(inboxId: string): Promise<boolean> {
  if (!pool) throw new Error("Database pool not initialized");

  const result = await pool.query(
    `SELECT id FROM verified_users WHERE "inboxId" = $1`,
    [inboxId]
  );

  return result.rows.length > 0;
}

export async function verifyUser(inboxId: string, walletAddress?: string): Promise<void> {
  if (!pool) throw new Error("Database pool not initialized");

  await pool.query(
    `INSERT INTO verified_users ("inboxId", "walletAddress", "verifiedAt", "lastActiveAt")
     VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("inboxId") 
     DO UPDATE SET "walletAddress" = $2, "verifiedAt" = CURRENT_TIMESTAMP, "lastActiveAt" = CURRENT_TIMESTAMP`,
    [inboxId, walletAddress || null]
  );
}

export async function updateUserActivity(inboxId: string): Promise<void> {
  if (!pool) throw new Error("Database pool not initialized");

  await pool.query(
    `UPDATE verified_users SET "lastActiveAt" = CURRENT_TIMESTAMP WHERE "inboxId" = $1`,
    [inboxId]
  );
}

export async function getVerifiedUsersCount(): Promise<number> {
  if (!pool) throw new Error("Database pool not initialized");

  const result = await pool.query(
    `SELECT COUNT(*) as count FROM verified_users`
  );

  return parseInt(result.rows[0].count);
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ PostgreSQL connection closed');
  }
}

// API endpoint helper for miniapp - get reminders by wallet address
export async function getRemindersByWalletAddress(walletAddress: string): Promise<Reminder[]> {
  if (!pool) throw new Error("Database pool not initialized");

  // First get inboxId from wallet address
  const userResult = await pool.query(
    `SELECT "inboxId" FROM verified_users WHERE LOWER("walletAddress") = LOWER($1)`,
    [walletAddress]
  );

  if (userResult.rows.length === 0) {
    return [];
  }

  const inboxId = userResult.rows[0].inboxId;

  // Get all reminders for this inbox (both pending and sent for history)
  const result = await pool.query(
    `SELECT id, "inboxId", "conversationId",
            to_char("targetTime", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "targetTime",
            message, sent,
            to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
     FROM reminders 
     WHERE "inboxId" = $1 
     ORDER BY "targetTime" DESC
     LIMIT 50`,
    [inboxId]
  );

  return result.rows;
}

