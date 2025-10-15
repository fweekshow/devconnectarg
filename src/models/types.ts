export interface Reminder {
    id: number;
    inbox_id: string;
    conversation_id: string;
    target_time: string; // ISO string
    message: string;
    sent: boolean | number; // PostgreSQL boolean, SQLite 0/1 compatibility
    created_at: string; // ISO string
  }

export type ScheduleType = 'session' | 'workshop' | 'activity' | 'break' | 'meal' | 'social' | 'other';
export type ScheduleStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface Schedule {
    id: number;
    title: string;
    description: string;
    start_time: string;
    end_time: string; 
    location?: string;
    type: ScheduleType;
    speaker?: string;
    capacity?: number;
    status: ScheduleStatus;
    relevance?: number;
    registration_required: boolean;
    registration_url?: string;
    tags?: string[];
    created_at: string; 
    updated_at: string; 
  }