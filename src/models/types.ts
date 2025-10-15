export interface Reminder {
    id: number;
    inbox_id: string;
    conversation_id: string;
    target_time: string; // ISO string
    message: string;
    sent: boolean | number; // PostgreSQL boolean, SQLite 0/1 compatibility
    created_at: string; // ISO string
  }