import { MENTION_HANDLES } from "./config.js";

// Create regex for detecting mentions
const createMentionRegex = (): RegExp => {
  const mentionAlternatives = MENTION_HANDLES.split(",")
    .map((h) => h.trim())
    .join("|");
  return new RegExp(`(^|\\s)@\\s*(?:${mentionAlternatives})\\b`, "i");
};

const mentionRegex = createMentionRegex();

// Check if a message mentions the agent
export const isMentioned = (text: string): boolean => mentionRegex.test(text);

// Remove mention from text content
export const removeMention = (text: string): string =>
  text.replace(mentionRegex, " ").trim();
