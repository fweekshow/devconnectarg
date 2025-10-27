import { EXPIRY_MS, MAX_HISTORY } from "@/constants";
import { ConversationEntry } from "./interfaces";

export class ConversationMemoryService {
  private static conversationHistory = new Map<string, ConversationEntry[]>();

  static add(
    senderInboxId: string,
    userMessage: string,
    botResponse: string
  ): void {
    const history = ConversationMemoryService.conversationHistory.get(senderInboxId) || [];

    history.push({
      userMessage,
      botResponse,
      timestamp: new Date(),
    });

    // Keep only the last MAX_HISTORY exchanges
    if (history.length > MAX_HISTORY) {
      history.shift();
    }

    ConversationMemoryService.conversationHistory.set(senderInboxId, history);
  }

  static getContext(senderInboxId: string): string {
    const history = ConversationMemoryService.conversationHistory.get(senderInboxId) || [];

    if (history.length === 0) return "";

    const contextLines = history.map(
      (entry) => `User: ${entry.userMessage}\nBot: ${entry.botResponse}`
    );

    return `Recent conversation context:\n${contextLines.join("\n")}\nCurrent message:\n`;
  }

  static cleanup(): void {
    const cutoff = new Date(Date.now() - EXPIRY_MS);

    for (const [inboxId, history] of ConversationMemoryService.conversationHistory.entries()) {
      const recent = history.filter((entry) => entry.timestamp > cutoff);

      if (recent.length === 0) {
        ConversationMemoryService.conversationHistory.delete(inboxId);
      } else {
        ConversationMemoryService.conversationHistory.set(inboxId, recent);
      }
    }
  }

  static getHistory(senderInboxId: string): ConversationEntry[] {
    return ConversationMemoryService.conversationHistory.get(senderInboxId) || [];
  }

  static clearAll(): void {
    ConversationMemoryService.conversationHistory.clear();
  }
}
