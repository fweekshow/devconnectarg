export interface TreasureHuntInsertParams {
  huntDate?: string;
  title: string;
}

export interface TreasureHuntTask {
  id: number;
  huntId: number;
  title: string;
  description: string;
  validationPrompt: string;
  hint: string;
  points: number;
  startTime: string;
  endTime: string;
  category: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface TreasureHuntTaskInsertParams {
  title: string;
  description: string;
  validationPrompt: string;
  hint: string;
  points: number;
  startTime: string;
  endTime: string;
  category: string;
  metadata?: Record<string, any>;
}

export interface UserCurrentTaskResult {
  userHuntId: number;
  currentTask: TreasureHuntTask | null;
  huntId: number;
}
