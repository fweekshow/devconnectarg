import { ConversationEntry } from "./interfaces";

export class ConversationMemoryService {
  private static conversationHistory = new Map<string, ConversationEntry[]>();
  private static readonly MAX_HISTORY = 3; // Keep only last 3 exchanges
  private static readonly EXPIRY_MS = 60 * 60 * 1000; // 1 hour

  static add(
    senderInboxId: string,
    userMessage: string,
    botResponse: string
  ): void {
    const history = this.conversationHistory.get(senderInboxId) || [];

    history.push({
      userMessage,
      botResponse,
      timestamp: new Date(),
    });

    // Keep only the last MAX_HISTORY exchanges
    if (history.length > this.MAX_HISTORY) {
      history.shift();
    }

    this.conversationHistory.set(senderInboxId, history);
  }

  static getContext(senderInboxId: string): string {
    const history = this.conversationHistory.get(senderInboxId) || [];

    if (history.length === 0) return "";

    const contextLines = history.map(
      (entry) => `User: ${entry.userMessage}\nBot: ${entry.botResponse}`
    );

    return `Recent conversation context:\n${contextLines.join("\n")}\nCurrent message:\n`;
  }

  static cleanup(): void {
    const cutoff = new Date(Date.now() - this.EXPIRY_MS);

    for (const [inboxId, history] of this.conversationHistory.entries()) {
      const recent = history.filter((entry) => entry.timestamp > cutoff);

      if (recent.length === 0) {
        this.conversationHistory.delete(inboxId);
      } else {
        this.conversationHistory.set(inboxId, recent);
      }
    }
  }

  static getHistory(senderInboxId: string): ConversationEntry[] {
    return this.conversationHistory.get(senderInboxId) || [];
  }

  static clearAll(): void {
    this.conversationHistory.clear();
  }
}
