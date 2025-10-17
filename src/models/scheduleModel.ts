import { DateTime } from "luxon";
import pool from "../config/db.js";
import { Schedule, ScheduleType, ScheduleStatus } from "./types";

export async function createScheduleTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        location TEXT,
        type TEXT NOT NULL CHECK (type IN ('session', 'workshop', 'activity', 'break', 'meal', 'social', 'other')),
        category TEXT,
        speaker TEXT,
        capacity INTEGER,
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
        relevance INTEGER DEFAULT 0,
        registration_required BOOLEAN DEFAULT FALSE,
        registration_url TEXT,
        tags TEXT[],
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Schedule tables created successfully");
  } catch (error) {
    console.error("Error creating schedule tables:", error);
  }
}

// Insert new schedule item
export async function insertSchedule(
  title: string,
  description: string,
  startTime: string,
  endTime: string,
  location?: string,
  type: ScheduleType = 'other',
  category?: string,
  speaker?: string,
  capacity?: number,
  status: ScheduleStatus = 'scheduled',
  relevance: number = 0,
  registrationRequired: boolean = false,
  registrationUrl?: string,
  tags?: string[],
  metadata?: any
): Promise<number> {
  const result = await pool.query(
    `INSERT INTO schedules (title, description, start_time, end_time, location, type, category, speaker, capacity, status, relevance, registration_required, registration_url, tags, metadata)
     VALUES ($1, $2, $3::timestamp, $4::timestamp, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING id`,
    [title, description, startTime, endTime, location || null, type, category || null, speaker || null, capacity || null, status, relevance, registrationRequired, registrationUrl || null, tags || null, metadata || {}]
  );

  return result.rows[0].id;
}
