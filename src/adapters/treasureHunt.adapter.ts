import { db } from "@/config/index.js";
import {
  TreasureHuntInsertParams,
  TreasureHuntTask,
  TreasureHuntTaskInsertParams,
  UserCurrentTaskResult,
} from "@/models/index.js";

const serializeTask = (row: any): TreasureHuntTask => {
  return {
    id: row.id,
    huntId: row.hunt_id,
    title: row.title,
    description: row.description,
    validationPrompt: row.validation_prompt,
    hint: row.hint,
    points: row.points,
    startTime: row.start_time,
    endTime: row.end_time,
    category: row.category,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
};
export class TreasureHuntAdapter {
  static async createTable(): Promise<void> {
    await TreasureHuntAdapter.createTreasureHuntTable();
    await TreasureHuntAdapter.createTreasureHuntTaskTable();
    await TreasureHuntAdapter.createUserTreasureHuntTable();
    await TreasureHuntAdapter.createUserTaskProgressTable();
    await TreasureHuntAdapter.createUpdateTimestampTrigger();
    await TreasureHuntAdapter.createIndexes();
  }

  private static async createTreasureHuntTable(): Promise<void> {
    await db.query(`
      CREATE TABLE IF NOT EXISTS treasure_hunt (
        id SERIAL PRIMARY KEY,
        hunt_date DATE NOT NULL UNIQUE,
        title TEXT,
        total_tasks INT DEFAULT 0,
        created_at TIMESTAMP  DEFAULT now(),
        updated_at TIMESTAMP  DEFAULT now()
      )
    `);
  }

  private static async createTreasureHuntTaskTable(): Promise<void> {
    await db.query(`
      CREATE TABLE IF NOT EXISTS treasure_hunt_task (
        id SERIAL PRIMARY KEY,
        hunt_id INT NOT NULL REFERENCES treasure_hunt(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        validation_prompt TEXT,
        hint TEXT,
        points INT DEFAULT 0,
        start_time TIMESTAMPTZ ,
        end_time TIMESTAMPTZ ,
        category VARCHAR(32),
        metadata JSONB DEFAULT '{}'::JSONB,
        created_at TIMESTAMP DEFAULT now()
      )
    `);
  }

  private static async createUserTreasureHuntTable(): Promise<void> {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_treasure_hunt (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(128) NOT NULL,
        sender_inbox_id VARCHAR(128) NOT NULL,
        hunt_id INT NOT NULL REFERENCES treasure_hunt(id) ON DELETE CASCADE,
        current_task_id INT REFERENCES treasure_hunt_task(id),
        stats JSONB DEFAULT '{}'::JSONB,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        CONSTRAINT unique_user_hunt UNIQUE(wallet_address, hunt_id)
      )
    `);
  }

  private static async createUserTaskProgressTable(): Promise<void> {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_task_progress (
        id SERIAL PRIMARY KEY,
        user_hunt_id INT NOT NULL REFERENCES user_treasure_hunt(id) ON DELETE CASCADE,
        task_id INT NOT NULL REFERENCES treasure_hunt_task(id) ON DELETE CASCADE,
        status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending','completed','skipped')),
        points_earned INT DEFAULT 0,
        completed_at TIMESTAMP,
        CONSTRAINT unique_user_task UNIQUE(user_hunt_id, task_id)
      )
    `);
  }

  private static async createUpdateTimestampTrigger(): Promise<void> {
    await db.query(`
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await db.query(`
      DROP TRIGGER IF EXISTS trg_update_treasure_hunt_updated_at ON treasure_hunt;
      CREATE TRIGGER trg_update_treasure_hunt_updated_at
      BEFORE UPDATE ON treasure_hunt
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    await db.query(`
      DROP TRIGGER IF EXISTS trg_update_user_treasure_hunt_updated_at ON user_treasure_hunt;
      CREATE TRIGGER trg_update_user_treasure_hunt_updated_at
      BEFORE UPDATE ON user_treasure_hunt
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);
  }

  private static async createIndexes(): Promise<void> {
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_treasure_hunt_wallet_hunt ON user_treasure_hunt (wallet_address, hunt_id);
      CREATE INDEX IF NOT EXISTS idx_user_treasure_hunt_hunt_id ON user_treasure_hunt (hunt_id);
      CREATE INDEX IF NOT EXISTS idx_user_treasure_hunt_wallet_address ON user_treasure_hunt (wallet_address);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_task_progress_user_hunt_id ON user_task_progress (user_hunt_id);
      CREATE INDEX IF NOT EXISTS idx_user_task_progress_task_id ON user_task_progress (task_id);
      CREATE INDEX IF NOT EXISTS idx_user_task_progress_status ON user_task_progress (status);
      CREATE INDEX IF NOT EXISTS idx_user_task_progress_completed_at ON user_task_progress (completed_at);
    `);
  }

  static async dropTables(): Promise<void> {
    try {
      await db.query("BEGIN");

      await db.query(`DROP TABLE IF EXISTS user_task_progress CASCADE;`);
      await db.query(`DROP TABLE IF EXISTS user_treasure_hunt CASCADE;`);
      await db.query(`DROP TABLE IF EXISTS treasure_hunt_task CASCADE;`);
      await db.query(`DROP TABLE IF EXISTS treasure_hunt CASCADE;`);

      await db.query("COMMIT");
      console.log("✅ All treasure hunt tables dropped successfully.");
    } catch (err) {
      await db.query("ROLLBACK");
      console.error("❌ Failed to drop treasure hunt tables:", err);
      throw err;
    }
  }

  static async addTasks({
    huntData,
    tasks,
  }: {
    huntData: TreasureHuntInsertParams;
    tasks: TreasureHuntTaskInsertParams[];
  }): Promise<void> {
    try {
      await db.query("BEGIN");
      const huntDate = huntData.huntDate
        ? huntData.huntDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      const title = huntData.title;

      const { rows } = await db.query(
        `INSERT INTO treasure_hunt (hunt_date, title, total_tasks)
         VALUES ($1, $2, $3)
         ON CONFLICT (hunt_date)
         DO UPDATE SET title = EXCLUDED.title, updated_at = now()
         RETURNING id`,
        [huntDate, title || null, tasks.length]
      );

      const huntId = rows[0]?.id;
      if (!huntId)
        throw new Error("Failed to create or fetch treasure_hunt record.");

      for (const task of tasks) {
        const {
          title,
          description,
          validationPrompt,
          hint,
          points,
          startTime,
          endTime,
          category,
          metadata = {},
        } = task;
        await db.query(
          `INSERT INTO treasure_hunt_task
           (hunt_id, title, description, validation_prompt, hint, points, start_time, end_time, category, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            huntId,
            title,
            description || null,
            validationPrompt || null,
            hint || null,
            points || 0,
            startTime || null,
            endTime || null,
            category || null,
            metadata,
          ]
        );
      }

      await db.query(
        `UPDATE treasure_hunt
         SET total_tasks = (SELECT COUNT(*) FROM treasure_hunt_task WHERE hunt_id = $1)
         WHERE id = $1`,
        [huntId]
      );

      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  }

  static async getAllTasks(): Promise<TreasureHuntTask[]> {
    const { rows } = await db.query(`SELECT * FROM treasure_hunt_task;`);
    return rows.map(serializeTask);
  }

  static async getTasksByHuntId(huntId: number): Promise<TreasureHuntTask[]> {
    const { rows } = await db.query(
      `SELECT * FROM treasure_hunt_task WHERE hunt_id = $1 ORDER BY id`,
      [huntId]
    );
    return rows.map(serializeTask);
  }

  static async getTasksByDate(huntDate: string): Promise<TreasureHuntTask[]> {
    const { rows } = await db.query(
      `
      SELECT t.* FROM treasure_hunt_task t
      JOIN treasure_hunt h ON t.hunt_id = h.id
      WHERE h.hunt_date = $1
      ORDER BY t.id
    `,
      [huntDate]
    );
    return rows.map(serializeTask);
  }

  static async deleteTasks(huntId: number): Promise<void> {
    await db.query(`DELETE FROM treasure_hunt_task WHERE hunt_id = $1`, [
      huntId,
    ]);
  }

  static async getUserCurrentTask(
    senderInboxId: string,
    huntDate: string = new Date().toISOString().slice(0, 10)
  ): Promise<UserCurrentTaskResult | null> {
    const { rows } = await db.query(
      `
      SELECT uth.id as user_hunt_id, uth.current_task_id, h.id as hunt_id
      FROM user_treasure_hunt uth
      JOIN treasure_hunt h ON h.id = uth.hunt_id
      WHERE uth.sender_inbox_id = $1 AND h.hunt_date = $2
    `,
      [senderInboxId, huntDate]
    );

    if (!rows[0] || !rows[0].current_task_id) return null;

    const taskId = rows[0].current_task_id;
    const huntId = rows[0].hunt_id;
    const userHuntId = rows[0].user_hunt_id;

    const { rows: taskRows } = await db.query(
      `SELECT * FROM treasure_hunt_task WHERE id = $1`,
      [taskId]
    );
    if (!taskRows[0]) return { userHuntId, currentTask: null, huntId };

    return { userHuntId, currentTask: serializeTask(taskRows[0]), huntId };
  }

  private static async initializeCurrentTask(
    userHuntId: number,
    huntId: number,
    afterTaskId?: number
  ): Promise<number | null> {
    const params: any[] = [huntId];
    let query = `
      SELECT id FROM treasure_hunt_task
      WHERE hunt_id = $1
    `;

    if (afterTaskId) {
      query += ` AND id > $2 ORDER BY id ASC LIMIT 1`;
      params.push(afterTaskId);
    } else {
      query += ` ORDER BY id ASC LIMIT 1`;
    }

    const { rows } = await db.query(query, params);
    const nextTaskId = rows[0]?.id || null;

    await db.query(
      `UPDATE user_treasure_hunt SET current_task_id = $1 WHERE id = $2`,
      [nextTaskId, userHuntId]
    );

    return nextTaskId;
  }

  static async initializeCurrentTaskForToday(
    senderInboxId: string,
    walletAddress: string,
    huntDate?: string,
    afterTaskId?: number
  ): Promise<number | null> {
    const effectiveDate = huntDate
      ? huntDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const { rows } = await db.query(
      `
      SELECT uth.id as user_hunt_id, uth.current_task_id, h.id as hunt_id
      FROM user_treasure_hunt uth
      JOIN treasure_hunt h ON h.id = uth.hunt_id
      WHERE uth.sender_inbox_id = $1 AND h.hunt_date = $2
    `,
      [senderInboxId, effectiveDate]
    );

    if (!rows[0]) {
      const ensured = await TreasureHuntAdapter.ensureUserHunt(
        senderInboxId,
        walletAddress,
        effectiveDate
      );
      if (!ensured) return null;
      return TreasureHuntAdapter.initializeCurrentTask(
        ensured.userHuntId,
        ensured.huntId,
        afterTaskId
      );
    }
    const userHuntId = rows[0].user_hunt_id as number;
    const huntId = rows[0].hunt_id as number;
    const currentTaskId = rows[0].current_task_id as number | null;

    if (currentTaskId && afterTaskId === undefined) return currentTaskId;

    return TreasureHuntAdapter.initializeCurrentTask(
      userHuntId,
      huntId,
      afterTaskId
    );
  }

  private static async ensureUserHunt(
    senderInboxId: string,
    walletAddress: string,
    huntDate: string
  ): Promise<{ userHuntId: number; huntId: number } | null> {
    const normalizedDate = huntDate.slice(0, 10);

    const { rows: huntRows } = await db.query(
      `SELECT id FROM treasure_hunt WHERE hunt_date = $1`,
      [normalizedDate]
    );
    const huntId = huntRows[0]?.id as number | undefined;
    if (!huntId) return null;

    const { rows: existingBySender } = await db.query(
      `SELECT id FROM user_treasure_hunt WHERE sender_inbox_id = $1 AND hunt_id = $2`,
      [senderInboxId, huntId]
    );
    if (existingBySender[0]) {
      return { userHuntId: existingBySender[0].id as number, huntId };
    }

    const { rows: insertRows } = await db.query(
      `
      INSERT INTO user_treasure_hunt (wallet_address, sender_inbox_id, hunt_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
      [walletAddress, senderInboxId, huntId]
    );
    return { userHuntId: insertRows[0].id as number, huntId };
  }

  static async submitCurrentTask(
    senderInboxId: string,
    huntDate?: string
  ): Promise<void> {
    try {
      await db.query("BEGIN");

      const currentData = await this.getUserCurrentTask(
        senderInboxId,
        huntDate
      );
      if (!currentData || !currentData.currentTask)
        throw new Error("No current task found.");

      const { userHuntId, currentTask, huntId } = currentData;

      const { points: pointsEarned, category } =
        await TreasureHuntAdapter.getTaskPointsAndCategory(currentTask.id);

      await TreasureHuntAdapter.upsertUserTaskProgress(
        userHuntId,
        currentTask.id,
        "completed",
        pointsEarned
      );

      const { rows: userHuntRows } = await db.query(
        `SELECT stats FROM user_treasure_hunt WHERE id = $1`,
        [userHuntId]
      );
      let stats = userHuntRows[0]?.stats || {};
      stats = TreasureHuntAdapter.updateStats(
        stats,
        category,
        currentTask.id,
        "completed",
        pointsEarned
      );

      await TreasureHuntAdapter.initializeCurrentTask(
        userHuntId,
        huntId,
        currentTask.id
      );

      await db.query(`UPDATE user_treasure_hunt SET stats = $1 WHERE id = $2`, [
        stats,
        userHuntId,
      ]);

      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  }

  static async skipCurrentTask(
    senderInboxId: string,
    huntDate?: string
  ): Promise<void> {
    try {
      await db.query("BEGIN");

      const currentData = await this.getUserCurrentTask(
        senderInboxId,
        huntDate
      );
      if (!currentData || !currentData.currentTask)
        throw new Error("No current task found.");

      const { userHuntId, currentTask, huntId } = currentData;

      await TreasureHuntAdapter.upsertUserTaskProgress(
        userHuntId,
        currentTask.id,
        "skipped",
        0
      );

      const { rows: userHuntRows } = await db.query(
        `SELECT stats FROM user_treasure_hunt WHERE id = $1`,
        [userHuntId]
      );
      let stats = userHuntRows[0]?.stats || {};
      const category = currentTask.category || "unknown";
      stats = TreasureHuntAdapter.updateStats(
        stats,
        category,
        currentTask.id,
        "skipped",
        0
      );

      await TreasureHuntAdapter.initializeCurrentTask(
        userHuntId,
        huntId,
        currentTask.id
      );

      await db.query(`UPDATE user_treasure_hunt SET stats = $1 WHERE id = $2`, [
        stats,
        userHuntId,
      ]);

      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  }

  static isTaskValid(task: TreasureHuntTask): boolean {
    const now = new Date();
    const startTime = task.startTime ? new Date(task.startTime) : null;
    const endTime = task.endTime ? new Date(task.endTime) : null;

    console.log("🕒 Task Validation Check:");
    console.log(`   Current time: ${now.toISOString()} (${now.toLocaleString()})`);
    console.log(`   Task start:   ${startTime?.toISOString()} (${startTime?.toLocaleString()})`);
    console.log(`   Task end:     ${endTime?.toISOString()} (${endTime?.toLocaleString()})`);
    
    if (startTime && now < startTime) {
      console.log("❌ Task not valid yet — starts in the future.");
      return false;
    }

    if (endTime && now > endTime) {
      console.log("❌ Task expired — ended in the past.");
      return false;
    }

    console.log("✅ Task is currently valid and active.");
    return true;
  }

  static async calculateUserStatsForToday(
    senderInboxId: string,
    huntDate?: string
  ): Promise<Record<string, any>> {
    const effectiveDate = huntDate
      ? huntDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const { rows } = await db.query(
      `
      SELECT uth.stats
      FROM user_treasure_hunt uth
      JOIN treasure_hunt h ON h.id = uth.hunt_id
      WHERE uth.sender_inbox_id = $1 AND h.hunt_date = $2
    `,
      [senderInboxId, effectiveDate]
    );

    const stats = rows[0]?.stats || null;
    if (stats && typeof stats === "object") return stats;

    return {
      totalPoints: 0,
      totalCompleted: 0,
      totalSkipped: 0,
      categories: {},
    };
  }

  static async areAllTasksCompletedForToday(
    senderInboxId: string,
    huntDate?: string
  ): Promise<boolean> {
    const effectiveDate = huntDate
      ? huntDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const { rows } = await db.query(
      `
      SELECT uth.id as user_hunt_id, h.id as hunt_id, h.total_tasks
      FROM user_treasure_hunt uth
      JOIN treasure_hunt h ON h.id = uth.hunt_id
      WHERE uth.sender_inbox_id = $1 AND h.hunt_date = $2
    `,
      [senderInboxId, effectiveDate]
    );
    const header = rows[0];
    if (!header) return false;

    const userHuntId = header.user_hunt_id as number;
    const huntId = header.hunt_id as number;
    const totalTasks: number =
      typeof header.total_tasks === "number" ? header.total_tasks : 0;

    const total = totalTasks || (
      (
        await db.query(
          `SELECT COUNT(*)::int AS cnt FROM treasure_hunt_task WHERE hunt_id = $1`,
          [huntId]
        )
      ).rows[0]?.cnt || 0
    );
    if (total === 0) return false;

    const { rows: progressRows } = await db.query(
      `
      SELECT COUNT(*)::int AS cnt
      FROM user_task_progress
      WHERE user_hunt_id = $1 AND status IN ('completed','skipped')
    `,
      [userHuntId]
    );
    const done = progressRows[0]?.cnt || 0;

    return done >= total;
  }

  static async getTotalTasksForDate(huntDate?: string): Promise<number> {
    const effectiveDate = huntDate
      ? huntDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const { rows } = await db.query(
      `SELECT id, total_tasks FROM treasure_hunt WHERE hunt_date = $1`,
      [effectiveDate]
    );
    const hunt = rows[0];
    if (!hunt) return 0;

    return hunt.total_tasks;
  }

  private static async upsertUserTaskProgress(
    userHuntId: number,
    taskId: number,
    status: "pending" | "completed" | "skipped",
    pointsEarned: number
  ): Promise<void> {
    await db.query(
      `
      INSERT INTO user_task_progress (user_hunt_id, task_id, status, points_earned, completed_at)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (user_hunt_id, task_id) DO UPDATE
      SET status = EXCLUDED.status,
          points_earned = EXCLUDED.points_earned,
          completed_at = COALESCE(EXCLUDED.completed_at, user_task_progress.completed_at)
    `,
      [userHuntId, taskId, status, pointsEarned]
    );
  }

  private static async getTaskPointsAndCategory(
    taskId: number
  ): Promise<{ points: number; category: string }> {
    const { rows } = await db.query(
      `SELECT points, category FROM treasure_hunt_task WHERE id = $1`,
      [taskId]
    );
    return {
      points: rows[0]?.points || 0,
      category: rows[0]?.category || "unknown",
    };
  }

  private static updateStats(
    stats: Record<string, any>,
    category: string,
    taskId: number,
    action: "completed" | "skipped",
    pointsEarned: number
  ): Record<string, any> {
    const normalized = stats || {};
    normalized.totalPoints =
      (normalized.totalPoints || 0) +
      (action === "completed" ? pointsEarned : 0);
    normalized.totalCompleted =
      (normalized.totalCompleted || 0) + (action === "completed" ? 1 : 0);
    normalized.totalSkipped =
      (normalized.totalSkipped || 0) + (action === "skipped" ? 1 : 0);

    if (!normalized.categories) normalized.categories = {};
    if (!normalized.categories[category])
      normalized.categories[category] = {
        completedTasks: [],
        count: 0,
        skipped: 0,
        points: 0,
      };

    normalized.categories[category].count += 1;
    if (action === "skipped") {
      normalized.categories[category].skipped += 1;
    } else {
      normalized.categories[category].completedTasks.push(taskId);
      normalized.categories[category].points += pointsEarned;
    }

    return normalized;
  }
}
