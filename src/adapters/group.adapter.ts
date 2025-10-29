import { db } from "@/config/index.js";
import { GroupInsertParams } from "@/models/index.js";

export class GroupAdapter {
  static async createTable(): Promise<void> {
    try {
      await db.query(`
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
      console.log("Groups table created or already exists.");
    } catch (error) {
      console.error("Error creating groups table:", error);
    }
  }

  static async insertGroupDetails(params: GroupInsertParams): Promise<void> {
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
      await db.query(
        `INSERT INTO groups (
           group_id, group_name, group_type, created_by, created_at,
           member_count, last_activity_at, description, original_group_id,
           is_active, total_messages, total_mentioned_messages, total_leaves, metadata
         ) VALUES (
           $1, $2, $3, $4, NOW(),
           $5, NOW(), $6, $7,
           TRUE, $8, $9, $10, $11::jsonb
         )
         ON CONFLICT (group_id) DO NOTHING;`,
        [
          groupId,
          groupName || groupId,
          groupType || "activity",
          createdBy || null,
          memberCount ?? 0,
          description || null,
          originalGroupId || null,
          totalMessages ?? 0,
          totalMentionedMessages ?? 0,
          totalLeaves ?? 0,
          JSON.stringify(metadata || {}),
        ]
      );
    } catch (error) {
      console.error("Error inserting group details:", error);
    }
  }

  static async checkGroupExists(groupId: string): Promise<boolean> {
    try {
      const result = await db.query(
        `SELECT EXISTS(SELECT 1 FROM groups WHERE group_id = $1)`,
        [groupId]
      );
      return result.rows[0].exists;
    } catch (error) {
      console.error("Error checking group existence:", error);
      return false;
    }
  }

  static async incrementGroupMemberJoin(groupId: string): Promise<void> {
    try {
      await db.query(
        `UPDATE groups
         SET member_count = member_count + 1,
             last_activity_at = NOW()
         WHERE group_id = $1`,
        [groupId]
      );
    } catch (error) {
      console.error("Error incrementing member join:", error);
    }
  }

  static async incrementGroupMemberLeave(groupId: string): Promise<void> {
    try {
      await db.query(
        `UPDATE groups
         SET member_count = GREATEST(member_count - 1, 0),
             total_leaves = total_leaves + 1,
             last_activity_at = NOW()
         WHERE group_id = $1`,
        [groupId]
      );
    } catch (error) {
      console.error("Error incrementing member leave:", error);
    }
  }

  static async incrementGroupMessage(groupId: string): Promise<void> {
    try {
      await db.query(
        `UPDATE groups
         SET total_messages = total_messages + 1,
             last_activity_at = NOW()
         WHERE group_id = $1`,
        [groupId]
      );
    } catch (error) {
      console.error("Error incrementing group message:", error);
    }
  }

  static async incrementGroupMentionedMessage(groupId: string): Promise<void> {
    try {
      await db.query(
        `UPDATE groups
         SET total_mentioned_messages = total_mentioned_messages + 1,
             last_activity_at = NOW()
         WHERE group_id = $1`,
        [groupId]
      );
    } catch (error) {
      console.error("Error incrementing mentioned message:", error);
    }
  }
}
