import pool from "../config/db.js";

export async function createGroupsTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        group_id TEXT UNIQUE NOT NULL,
        group_name TEXT NOT NULL,
        group_type TEXT NOT NULL CHECK (group_type IN ('activity','sidebar')),
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        member_count INTEGER DEFAULT 0,
        last_activity_at TIMESTAMP,
        description TEXT,
        original_group_id TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        total_messages INTEGER DEFAULT 0,
        total_mentioned_messages INTEGER DEFAULT 0,
        total_leaves INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);
  } catch (error) {
    console.error("Error creating groups table:", error);
  }
}

export async function insertGroupDetails(params: {
  groupId: string;
  groupName?: string;
  groupType?: 'activity' | 'sidebar';
  createdBy?: string;
  memberCount?: number;
  description?: string;
  originalGroupId?: string;
  totalMessages?: number;
  totalMentionedMessages?: number;
  totalLeaves?: number;
  metadata?: Record<string, any> | null;
}): Promise<void> {
  const {
    groupId,
    groupName,
    groupType,
    createdBy,
    memberCount,
    description,
    originalGroupId,
    totalMessages,
    totalMentionedMessages,
    totalLeaves,
    metadata,
  } = params;

  try {
    await pool.query(
      `INSERT INTO groups (
         group_id, group_name, group_type, created_by, created_at,
         member_count, last_activity_at, description, original_group_id,
         is_active, total_messages, total_mentioned_messages, total_leaves, metadata
       ) VALUES (
         $1, $2, $3, $4, NOW(),
         $5, NOW(), $6, $7,
         TRUE, $8, $9, $10, $11::jsonb
       )`,
      [
        groupId,
        groupName || groupId,
        groupType || 'activity',
        createdBy || null,
        typeof memberCount === 'number' ? memberCount : 0,
        description || null,
        originalGroupId || null,
        typeof totalMessages === 'number' ? totalMessages : 0,
        typeof totalMentionedMessages === 'number' ? totalMentionedMessages : 0,
        typeof totalLeaves === 'number' ? totalLeaves : 0,
        JSON.stringify(metadata || {}),
      ]
    );
  } catch (error) {
    console.error("Error inserting group details:", error);
  }
}

export async function checkGroupExists(groupId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM groups WHERE group_id = $1)`,
    [groupId]
  );
  return result.rows[0].exists;
}

export async function incrementGroupMemberJoin(groupId: string): Promise<void> {
    // Update existing group’s member count
    await pool.query(
        `UPDATE groups
        SET member_count = member_count + 1,
            last_activity_at = NOW()
        WHERE group_id = $1`,
        [groupId]
    );
}

export async function incrementGroupMemberLeave(groupId: string): Promise<void> {
  await pool.query(
    `UPDATE groups
     SET member_count = GREATEST(member_count - 1, 0),
         total_leaves = total_leaves + 1,
         last_activity_at = NOW()
     WHERE group_id = $1`,
    [groupId]
  );
}

export async function incrementGroupMessage(groupId: string): Promise<void> {
    await pool.query(
        `UPDATE groups
        SET total_messages = total_messages + 1,
            last_activity_at = NOW()
        WHERE group_id = $1`,
        [groupId]
    );
}

export async function incrementGroupMentionedMessage(groupId: string): Promise<void> {
    await pool.query(
        `UPDATE groups
        SET total_mentioned_messages = total_mentioned_messages + 1,
            last_activity_at = NOW()
        WHERE group_id = $1`,
        [groupId] 
    );
}