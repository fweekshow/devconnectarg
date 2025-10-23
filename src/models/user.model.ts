export interface UserInsertParams {
  inboxId: string;
  walletAddress?: string;
}

export interface User extends UserInsertParams {
  id: number;
  totalMessages: number;
  remindersCreated: number;
  firstSeenAt: string;
  lastMessageAt: string;
  actionClicks: Record<string, number>;
}
