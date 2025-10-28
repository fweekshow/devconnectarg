import { db } from "@/config";
import { TreasureHuntTask, TreasureHuntTaskParams } from "@/models";

export class TreasureHuntAdapter {
  static async createTable(): Promise<void> {
    try {
      await db.query(`
      CREATE TABLE IF NOT EXISTS treasure_hunt_tasks (
        id SERIAL PRIMARY KEY,
        task_index INTEGER UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        validation_prompt TEXT NOT NULL,
        hint TEXT NOT NULL,
        points INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

      // Ensure uniqueness for ON CONFLICT (task_index)
      await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_treasure_hunt_tasks_task_index
      ON treasure_hunt_tasks (task_index)
    `);
      console.log("TreasureHunt table created or already exists.");
    } catch (err) {
      console.error("Error creating treasurehunt table:", err);
    }
  }

  static async insertTaskDetails(
    params: TreasureHuntTaskParams
  ): Promise<void> {
    const { taskIndex, title, description, validationPrompt, hint, points } =
      params;

    try {
      await db.query(
        `
        INSERT INTO treasure_hunt_tasks (
          task_index,
          title,
          description,
          validation_prompt,
          hint,
          points
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (task_index) DO UPDATE
        SET title = EXCLUDED.title,
            description = EXCLUDED.description,
            validation_prompt = EXCLUDED.validation_prompt,
            hint = EXCLUDED.hint,
            points = EXCLUDED.points;
        `,
        [taskIndex, title, description, validationPrompt, hint ?? null, points]
      );

      console.log(`Added: ${title} (Task ${taskIndex + 1})`);
    } catch (err) {
      console.error(`❌ Failed to add: ${title}`, err);
    }
  }

  static async getTasks(): Promise<TreasureHuntTask[]> {
    const result = await db.query(
      "SELECT * FROM treasure_hunt_tasks ORDER BY task_index"
    );

    return result.rows.map((task) => ({
      id: task.id,
      taskIndex: task.task_index,
      title: task.title,
      description: task.description,
      validationPrompt: task.validation_prompt,
      hint: task.hint,
      points: task.points,
    }));
  }
}
