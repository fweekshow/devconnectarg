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

pool.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err: any) => console.error("PostgreSQL Connection error:", err));


export default pool;
