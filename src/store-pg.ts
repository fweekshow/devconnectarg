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

    // User analytics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS verified_users (
        id SERIAL PRIMARY KEY,
        "inboxId" TEXT UNIQUE NOT NULL,
        "walletAddress" TEXT,
        "verifiedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "lastActiveAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Engagement metrics
        "totalMessages" INTEGER DEFAULT 0,
        "quickActionClicks" INTEGER DEFAULT 0,
        "naturalLanguageQueries" INTEGER DEFAULT 0,
        "commandsUsed" INTEGER DEFAULT 0,
        
        -- Feature usage
        "remindersCreated" INTEGER DEFAULT 0,
        "groupsJoined" INTEGER DEFAULT 0,
        "scheduleQueries" INTEGER DEFAULT 0,
        "broadcastsReceived" INTEGER DEFAULT 0,
        
        -- Activity tracking
        "firstSeenAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "lastMessageAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "sessionCount" INTEGER DEFAULT 1,
        
        -- User preferences
        "preferredTimezone" TEXT,
        "favoriteFeature" TEXT,
        
        -- Metadata
        "metadata" JSONB DEFAULT '{}'::jsonb
      )
    `);

    // Groups analytics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        "groupId" TEXT UNIQUE NOT NULL,
        "groupName" TEXT NOT NULL,
        "groupType" TEXT NOT NULL, -- 'activity', 'sidebar', 'base_global', 'custom'
        "createdBy" TEXT, -- inboxId of creator (null for pre-configured groups)
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "memberCount" INTEGER DEFAULT 0,
        "lastActivityAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Group metadata
        "description" TEXT,
        "originalGroupId" TEXT, -- For sidebars, the group they split from
        "isActive" BOOLEAN DEFAULT TRUE,
        
        -- Stats
        "totalMessages" INTEGER DEFAULT 0,
        "totalJoins" INTEGER DEFAULT 0,
        "totalLeaves" INTEGER DEFAULT 0,
        
        -- Metadata
        "metadata" JSONB DEFAULT '{}'::jsonb
      )
    `);

    // Create index for group lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_groups_type 
      ON groups("groupType", "isActive")
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_groups_activity 
      ON groups("lastActivityAt") WHERE "isActive" = TRUE
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

// ========== ANALYTICS TRACKING FUNCTIONS ==========

export async function trackMessage(inboxId: string, messageType: 'text' | 'quick_action' | 'command' | 'ai_query'): Promise<void> {
  if (!pool) return;
  
  try {
    // Increment the appropriate counter
    let updateField = 'totalMessages';
    if (messageType === 'quick_action') updateField = 'quickActionClicks';
    else if (messageType === 'command') updateField = 'commandsUsed';
    else if (messageType === 'ai_query') updateField = 'naturalLanguageQueries';
    
    await pool.query(
      `INSERT INTO verified_users ("inboxId", "${updateField}", "lastMessageAt", "totalMessages")
       VALUES ($1, 1, CURRENT_TIMESTAMP, 1)
       ON CONFLICT ("inboxId") 
       DO UPDATE SET 
         "${updateField}" = verified_users."${updateField}" + 1,
         "totalMessages" = verified_users."totalMessages" + 1,
         "lastMessageAt" = CURRENT_TIMESTAMP`,
      [inboxId]
    );
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

export async function trackFeatureUsage(inboxId: string, feature: 'reminder' | 'group' | 'schedule' | 'broadcast'): Promise<void> {
  if (!pool) return;
  
  try {
    let updateField = '';
    if (feature === 'reminder') updateField = 'remindersCreated';
    else if (feature === 'group') updateField = 'groupsJoined';
    else if (feature === 'schedule') updateField = 'scheduleQueries';
    else if (feature === 'broadcast') updateField = 'broadcastsReceived';
    
    if (!updateField) return;
    
    await pool.query(
      `UPDATE verified_users 
       SET "${updateField}" = "${updateField}" + 1,
           "lastActiveAt" = CURRENT_TIMESTAMP
       WHERE "inboxId" = $1`,
      [inboxId]
    );
  } catch (error) {
    console.error('Feature tracking error:', error);
  }
}

export async function setUserPreference(inboxId: string, timezone?: string, favoriteFeature?: string): Promise<void> {
  if (!pool) return;
  
  try {
    const updates: string[] = [];
    const values: any[] = [inboxId];
    let paramCount = 1;
    
    if (timezone) {
      paramCount++;
      updates.push(`"preferredTimezone" = $${paramCount}`);
      values.push(timezone);
    }
    
    if (favoriteFeature) {
      paramCount++;
      updates.push(`"favoriteFeature" = $${paramCount}`);
      values.push(favoriteFeature);
    }
    
    if (updates.length === 0) return;
    
    await pool.query(
      `UPDATE verified_users SET ${updates.join(', ')} WHERE "inboxId" = $1`,
      values
    );
  } catch (error) {
    console.error('Preference update error:', error);
  }
}

export async function getUserAnalytics(inboxId: string): Promise<any> {
  if (!pool) throw new Error("Database pool not initialized");
  
  const result = await pool.query(
    `SELECT 
       "totalMessages", "quickActionClicks", "naturalLanguageQueries", "commandsUsed",
       "remindersCreated", "groupsJoined", "scheduleQueries", "broadcastsReceived",
       "sessionCount", "preferredTimezone", "favoriteFeature",
       to_char("firstSeenAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "firstSeenAt",
       to_char("lastMessageAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastMessageAt",
       to_char("lastActiveAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastActiveAt"
     FROM verified_users 
     WHERE "inboxId" = $1`,
    [inboxId]
  );
  
  return result.rows[0] || null;
}

export async function getAnalyticsSummary(): Promise<any> {
  if (!pool) throw new Error("Database pool not initialized");
  
  const result = await pool.query(`
    SELECT 
      COUNT(*) as "totalUsers",
      SUM("totalMessages") as "totalMessages",
      SUM("quickActionClicks") as "totalQuickActions",
      SUM("naturalLanguageQueries") as "totalAIQueries",
      SUM("remindersCreated") as "totalReminders",
      SUM("groupsJoined") as "totalGroupJoins",
      AVG("totalMessages") as "avgMessagesPerUser"
    FROM verified_users
  `);
  
  return result.rows[0];
}

// ========== GROUP MANAGEMENT FUNCTIONS ==========

export async function registerGroup(
  groupId: string,
  groupName: string,
  groupType: 'activity' | 'sidebar' | 'base_global' | 'custom',
  createdBy?: string,
  description?: string,
  originalGroupId?: string
): Promise<void> {
  if (!pool) return;
  
  try {
    await pool.query(
      `INSERT INTO groups ("groupId", "groupName", "groupType", "createdBy", "description", "originalGroupId")
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT ("groupId") 
       DO UPDATE SET 
         "groupName" = $2,
         "description" = $5,
         "lastActivityAt" = CURRENT_TIMESTAMP`,
      [groupId, groupName, groupType, createdBy || null, description || null, originalGroupId || null]
    );
  } catch (error) {
    console.error('Group registration error:', error);
  }
}

export async function trackGroupMemberJoin(groupId: string, memberInboxId?: string): Promise<void> {
  if (!pool) return;
  
  try {
    await pool.query(
      `UPDATE groups 
       SET "memberCount" = "memberCount" + 1,
           "totalJoins" = "totalJoins" + 1,
           "lastActivityAt" = CURRENT_TIMESTAMP
       WHERE "groupId" = $1`,
      [groupId]
    );
    
    // Also track in user analytics if memberInboxId provided
    if (memberInboxId) {
      await trackFeatureUsage(memberInboxId, 'group');
    }
  } catch (error) {
    console.error('Group join tracking error:', error);
  }
}

export async function trackGroupMemberLeave(groupId: string): Promise<void> {
  if (!pool) return;
  
  try {
    await pool.query(
      `UPDATE groups 
       SET "memberCount" = GREATEST("memberCount" - 1, 0),
           "totalLeaves" = "totalLeaves" + 1,
           "lastActivityAt" = CURRENT_TIMESTAMP
       WHERE "groupId" = $1`,
      [groupId]
    );
  } catch (error) {
    console.error('Group leave tracking error:', error);
  }
}

export async function trackGroupMessage(groupId: string): Promise<void> {
  if (!pool) return;
  
  try {
    await pool.query(
      `UPDATE groups 
       SET "totalMessages" = "totalMessages" + 1,
           "lastActivityAt" = CURRENT_TIMESTAMP
       WHERE "groupId" = $1`,
      [groupId]
    );
  } catch (error) {
    console.error('Group message tracking error:', error);
  }
}

export async function setGroupActive(groupId: string, isActive: boolean): Promise<void> {
  if (!pool) return;
  
  try {
    await pool.query(
      `UPDATE groups SET "isActive" = $2 WHERE "groupId" = $1`,
      [groupId, isActive]
    );
  } catch (error) {
    console.error('Group active status error:', error);
  }
}

export async function getGroupStats(groupId: string): Promise<any> {
  if (!pool) throw new Error("Database pool not initialized");
  
  const result = await pool.query(
    `SELECT 
       "groupName", "groupType", "memberCount", "totalMessages", 
       "totalJoins", "totalLeaves", "isActive", "description",
       to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
       to_char("lastActivityAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastActivityAt"
     FROM groups 
     WHERE "groupId" = $1`,
    [groupId]
  );
  
  return result.rows[0] || null;
}

export async function getAllGroups(groupType?: string, activeOnly: boolean = true): Promise<any[]> {
  if (!pool) throw new Error("Database pool not initialized");
  
  let query = `
    SELECT 
      "groupId", "groupName", "groupType", "memberCount", "totalMessages",
      "totalJoins", "isActive", "description",
      to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
      to_char("lastActivityAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastActivityAt"
    FROM groups 
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (activeOnly) {
    query += ` AND "isActive" = TRUE`;
  }
  
  if (groupType) {
    params.push(groupType);
    query += ` AND "groupType" = $${params.length}`;
  }
  
  query += ` ORDER BY "lastActivityAt" DESC`;
  
  const result = await pool.query(query, params);
  return result.rows;
}

export async function getGroupAnalytics(): Promise<any> {
  if (!pool) throw new Error("Database pool not initialized");
  
  const result = await pool.query(`
    SELECT 
      COUNT(*) as "totalGroups",
      COUNT(*) FILTER (WHERE "isActive" = TRUE) as "activeGroups",
      SUM("memberCount") as "totalMembers",
      SUM("totalMessages") as "totalGroupMessages",
      SUM("totalJoins") as "totalJoins",
      AVG("memberCount") as "avgMembersPerGroup",
      COUNT(*) FILTER (WHERE "groupType" = 'activity') as "activityGroups",
      COUNT(*) FILTER (WHERE "groupType" = 'sidebar') as "sidebarGroups",
      COUNT(*) FILTER (WHERE "groupType" = 'base_global') as "baseGlobalGroups"
    FROM groups
  `);
  
  return result.rows[0];
}

