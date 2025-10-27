export interface TreasureHuntTaskParams {
  taskIndex: number;
  title: string;
  description: string;
  validationPrompt: string;
  hint?: string | null;
  points: number;
}

export interface TreasureHuntTask {
  id: number;
  taskIndex: number;
  title: string;
}
