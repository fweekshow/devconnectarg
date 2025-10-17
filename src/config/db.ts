import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not found in .env file");
}

// Create a connection pool using the DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function connectDb(): Promise<void> {
  try {
    const client = await pool.connect();
    client.release();
    console.log("Connected to PostgreSQL");
  } catch (err) {
    console.error("PostgreSQL Connection error:", err);
    throw err;
  }
}

export default pool;
