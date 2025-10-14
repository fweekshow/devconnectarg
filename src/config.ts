// Environment variables (support both Agent SDK and legacy formats)
export const WALLET_KEY = process.env.XMTP_WALLET_KEY || process.env.WALLET_KEY;
export const DB_ENCRYPTION_KEY = process.env.XMTP_DB_ENCRYPTION_KEY || process.env.DB_ENCRYPTION_KEY;
export const XMTP_ENV = process.env.XMTP_ENV;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const DEFAULT_MODEL = process.env.DEFAULT_MODEL;

// Configurable settings
export const MENTION_HANDLES = process.env.MENTION_HANDLES || "devconnectarg.base.eth, @devconnectarg";
export const DEBUG_LOGS = process.env.DEBUG_LOGS === "true" && process.env.NODE_ENV !== "production";
export const SHOW_SENDER_ADDRESS = process.env.SHOW_SENDER_ADDRESS === "true";

//RSVP Backend Base Url
export const BASE_URL = process.env.BASE_URL;

// Neynar API Configuration
export const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

// Coinbase OnchainKit API Configuration
export const PUBLIC_ONCHAINKIT_API_KEY = process.env.PUBLIC_ONCHAINKIT_API_KEY;

// Agent Access Control - No passcode required


