export type ScheduleType =
  | "session"
  | "workshop"
  | "activity"
  | "break"
  | "meal"
  | "social"
  | "other";
export type ScheduleStatus = "scheduled" | "live" | "completed" | "cancelled";

export interface ScheduleInsertParams {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  type?: ScheduleType;
  category?: string;
  speaker?: string;
  capacity?: number;
  status?: ScheduleStatus;
  relevance?: number;
  registrationRequired?: boolean;
  registrationUrl?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface Schedule extends ScheduleInsertParams {
  id: number;
  createdAt: string;
  updatedAt: string;
}
