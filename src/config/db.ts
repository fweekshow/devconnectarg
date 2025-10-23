import { Pool } from "pg";
import { ENV } from "./env.js";

class Database {
  private static instance: Pool;

  static get pool(): Pool {
    if (!Database.instance) {
      Database.instance = new Pool({
        connectionString: ENV.DATABASE_URL,
        ssl:
          ENV.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      });
    }
    return Database.instance;
  }

  static async connect(): Promise<void> {
    try {
      const client = await Database.pool.connect();
      client.release();
      console.log("Connected to PostgreSQL");
    } catch (err) {
      console.error("PostgreSQL connection error:", err);
      throw err;
    }
  }

  static async close(): Promise<void> {
    try {
      await Database.pool.end();
      console.log("PostgreSQL pool closed");
    } catch (err) {
      console.error("Error closing PostgreSQL pool:", err);
    }
  }
}

export const db = Database.pool;
export const connectDb = Database.connect;
export const closeDb = Database.close;
