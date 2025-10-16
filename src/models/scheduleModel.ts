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
  tags?: string[]
): Promise<number> {
  const result = await pool.query(
    `INSERT INTO schedules (title, description, start_time, end_time, location, type, category, speaker, capacity, status, relevance, registration_required, registration_url, tags)
     VALUES ($1, $2, $3::timestamp, $4::timestamp, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id`,
    [title, description, startTime, endTime, location || null, type, category || null, speaker || null, capacity || null, status, relevance, registrationRequired, registrationUrl || null, tags || null]
  );

  return result.rows[0].id;
}

// Get all active schedules
export async function getAllActiveSchedules(): Promise<Schedule[]> {
  const result = await pool.query(
    `SELECT id, title, description,
            to_char(start_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS start_time,
            to_char(end_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS end_time,
            location, type, category, speaker, capacity, status, relevance, registration_required, registration_url, tags,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
            to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
     FROM schedules
     WHERE status != 'cancelled'
     ORDER BY start_time ASC`
  );
  return result.rows;
}

// Get schedules by type
export async function getSchedulesByType(type: ScheduleType): Promise<Schedule[]> {
  const result = await pool.query(
    `SELECT id, title, description,
            to_char(start_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS start_time,
            to_char(end_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS end_time,
            location, type, category, speaker, capacity, status, relevance, registration_required, registration_url, tags,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
            to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
     FROM schedules
     WHERE type = $1 AND status != 'cancelled'
     ORDER BY start_time ASC`,
    [type]
  );
  return result.rows;
}

// Get schedules for a specific date
export async function getSchedulesByDate(date: string): Promise<Schedule[]> {
  const startOfDay = DateTime.fromISO(date).startOf('day').toISO();
  const endOfDay = DateTime.fromISO(date).endOf('day').toISO();

  const result = await pool.query(
    `SELECT id, title, description,
            to_char(start_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS start_time,
            to_char(end_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS end_time,
            location, type, category, speaker, capacity, status, relevance, registration_required, registration_url, tags,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
            to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
     FROM schedules
     WHERE start_time >= $1::timestamp AND start_time <= $2::timestamp AND status != 'cancelled'
     ORDER BY start_time ASC`,
    [startOfDay, endOfDay]
  );
  return result.rows;
}

// Get schedules for a date range
export async function getSchedulesByDateRange(startDate: string, endDate: string): Promise<Schedule[]> {
  const result = await pool.query(
    `SELECT id, title, description,
            to_char(start_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS start_time,
            to_char(end_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS end_time,
            location, type, category, speaker, capacity, status, relevance, registration_required, registration_url, tags,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
            to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
     FROM schedules
     WHERE start_time >= $1::timestamp AND start_time <= $2::timestamp AND status != 'cancelled'
     ORDER BY start_time ASC`,
    [startDate, endDate]
  );
  return result.rows;
}

// Get upcoming schedules (next N hours)
export async function getUpcomingSchedules(hours: number = 24): Promise<Schedule[]> {
  const now = DateTime.now().toUTC().toISO();
  const futureTime = DateTime.now().toUTC().plus({ hours }).toISO();

  const result = await pool.query(
    `SELECT id, title, description,
            to_char(start_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS start_time,
            to_char(end_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS end_time,
            location, type, category, speaker, capacity, status, relevance, registration_required, registration_url, tags,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
            to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
     FROM schedules
     WHERE start_time >= $1::timestamp AND start_time <= $2::timestamp AND status != 'cancelled'
     ORDER BY start_time ASC`,
    [now, futureTime]
  );
  return result.rows;
}