import pool from "../config/db.js";

// TREASURE HUNT CONFIGURATION
export const TREASURE_HUNT_CONFIG = {
  totalGroups: 20,
  totalTasks: 10,
  maxMembersPerGroup: 10,
  minConfidenceThreshold: 60, // 60% confidence required for validation
};

// Task definitions - 10 challenges for the treasure hunt
export const TREASURE_HUNT_TASKS = [
  {
    index: 0,
    title: "The Hand of God",
    description: "In the streets of Buenos Aires, find the mural of the man who touched the sky with his left foot. The artist who painted the impossible goal.",
    validationPrompt: "Does this image show a mural, painting, or street art depicting Diego Maradona? Look for artwork featuring the famous Argentine footballer.",
    hint: "Look for street art honoring the greatest footballer Argentina ever produced!",
    points: 10,
  },
];

// Treasure hunt group IDs
export const TREASURE_HUNT_GROUP_IDS: string[] = [
  // Test group
  "8b2d7fa9abf1190436f59131c6e2ec90",
  // Remaining 19 groups to be added
  // "group_id_2",
  // "group_id_3",
  // ... up to 20
];

/**
 * Check if a group is a treasure hunt group
 */
export function isTreasureHuntGroup(groupId: string): boolean {
  return TREASURE_HUNT_GROUP_IDS.includes(groupId);
}

/**
 * Assign user to a treasure hunt group
 * Finds the least-full group and adds the user
 */
export async function assignToTreasureHuntGroup(userInboxId: string): Promise<{
  success: boolean;
  groupId?: string;
  message: string;
}> {
  try {
    // Get current group member counts
    const groupCounts = await pool.query(`
      SELECT group_id, COUNT(*) as member_count
      FROM treasure_hunt_members
      GROUP BY group_id
      ORDER BY member_count ASC
    `);

    // Find the group with the least members
    let targetGroupId = TREASURE_HUNT_GROUP_IDS[0]; // Default to first group
    
    if (groupCounts.rows.length > 0) {
      const minCount = Math.min(...groupCounts.rows.map(row => row.member_count));
      const availableGroups = groupCounts.rows.filter(row => row.member_count === minCount);
      targetGroupId = availableGroups[0].group_id;
    }

    // Check if group is at capacity
    const currentCount = groupCounts.rows.find(row => row.group_id === targetGroupId)?.member_count || 0;
    if (currentCount >= TREASURE_HUNT_CONFIG.maxMembersPerGroup) {
      return {
        success: false,
        message: "All treasure hunt groups are currently full. Please try again later."
      };
    }

    // Add user to the group
    await pool.query(`
      INSERT INTO treasure_hunt_members (user_inbox_id, group_id, joined_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_inbox_id) DO UPDATE
      SET group_id = $2, joined_at = NOW()
    `, [userInboxId, targetGroupId]);

    return {
      success: true,
      groupId: targetGroupId,
      message: `Welcome to Treasure Hunt Group ${targetGroupId}! You've been assigned to the group with the least members.`
    };

  } catch (error) {
    console.error("Error assigning user to treasure hunt group:", error);
    return {
      success: false,
      message: "Failed to assign you to a treasure hunt group. Please try again."
    };
  }
}

/**
 * Get user's treasure hunt group
 */
export async function getUserTreasureHuntGroup(userInboxId: string): Promise<{
  groupId?: string;
  members?: any[];
  userProgress?: any;
}> {
  try {
    const result = await pool.query(`
      SELECT 
        thm.group_id,
        thm.joined_at,
        array_agg(
          json_build_object(
            'inbox_id', u.inbox_id,
            'wallet_address', u.wallet_address,
            'joined_at', thm.joined_at
          )
        ) as members
      FROM treasure_hunt_members thm
      LEFT JOIN users u ON u.inbox_id = thm.user_inbox_id
      WHERE thm.group_id = (
        SELECT group_id FROM treasure_hunt_members WHERE user_inbox_id = $1
      )
      GROUP BY thm.group_id, thm.joined_at
    `, [userInboxId]);

    if (result.rows.length === 0) {
      return {};
    }

    // Get user's progress
    const progressResult = await pool.query(`
      SELECT * FROM treasure_hunt_progress
      WHERE user_inbox_id = $1
    `, [userInboxId]);

    return {
      groupId: result.rows[0].group_id,
      members: result.rows[0].members,
      userProgress: progressResult.rows[0] || null
    };

  } catch (error) {
    console.error("Error getting user treasure hunt group:", error);
    return {};
  }
}

/**
 * Record task completion
 */
export async function recordTaskCompletion(
  userInboxId: string, 
  taskIndex: number, 
  points: number
): Promise<{ success: boolean; message: string }> {
  try {
    await pool.query(`
      INSERT INTO treasure_hunt_progress (user_inbox_id, completed_tasks, total_points, last_updated)
      VALUES ($1, ARRAY[$2], $3, NOW())
      ON CONFLICT (user_inbox_id) DO UPDATE
      SET 
        completed_tasks = array_append(completed_tasks, $2),
        total_points = total_points + $3,
        last_updated = NOW()
      WHERE NOT (completed_tasks @> ARRAY[$2])
    `, [userInboxId, taskIndex, points]);

    return {
      success: true,
      message: `Task ${taskIndex + 1} completed! You earned ${points} points.`
    };

  } catch (error) {
    console.error("Error recording task completion:", error);
    return {
      success: false,
      message: "Failed to record task completion. Please try again."
    };
  }
}

/**
 * Get treasure hunt leaderboard
 */
export async function getTreasureHuntLeaderboard(): Promise<{
  individual: any[];
  groups: any[];
}> {
  try {
    // Individual leaderboard
    const individualResult = await pool.query(`
      SELECT 
        u.inbox_id,
        u.wallet_address,
        thp.total_points,
        array_length(thp.completed_tasks, 1) as tasks_completed
      FROM treasure_hunt_progress thp
      JOIN users u ON u.inbox_id = thp.user_inbox_id
      ORDER BY thp.total_points DESC, thp.last_updated ASC
      LIMIT 50
    `);

    // Group leaderboard
    const groupResult = await pool.query(`
      SELECT 
        thm.group_id,
        COUNT(thm.user_inbox_id) as member_count,
        COALESCE(SUM(thp.total_points), 0) as total_points,
        COALESCE(AVG(thp.total_points), 0) as avg_points
      FROM treasure_hunt_members thm
      LEFT JOIN treasure_hunt_progress thp ON thp.user_inbox_id = thm.user_inbox_id
      GROUP BY thm.group_id
      ORDER BY total_points DESC, avg_points DESC
    `);

    return {
      individual: individualResult.rows,
      groups: groupResult.rows
    };

  } catch (error) {
    console.error("Error getting treasure hunt leaderboard:", error);
    return { individual: [], groups: [] };
  }
}
