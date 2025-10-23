export type GroupType = "activity" | "sidebar";

export interface GroupInsertParams {
  groupId: string;
  groupName?: string;
  groupType?: GroupType;
  createdBy?: string;
  memberCount?: number;
  description?: string;
  originalGroupId?: string;
  totalMessages?: number;
  totalMentionedMessages?: number;
  totalLeaves?: number;
  metadata?: Record<string, any> | null;
}

export interface Group extends GroupInsertParams {
  id: number;
}
