import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string, value?: string): string {
  if (!value) throw new Error(`${name} is required in .env`);
  return value;
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
  DATABASE_URL: requireEnv("DATABASE_URL", process.env.DATABASE_URL),

  // Wallet / Agent SDK
  WALLET_KEY: process.env.XMTP_WALLET_KEY || process.env.WALLET_KEY,
  DB_ENCRYPTION_KEY:
    process.env.XMTP_DB_ENCRYPTION_KEY || process.env.DB_ENCRYPTION_KEY,
  XMTP_ENV: process.env.XMTP_ENV,

  // OpenAI API Keys
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  DEFAULT_MODEL: process.env.DEFAULT_MODEL || "gpt-3.5-turbo",

  // Neynar API Configuration
  NEYNAR_API_KEY: process.env.NEYNAR_API_KEY,

  // Coinbase OnchainKit API Configuration
  PUBLIC_ONCHAINKIT_API_KEY: process.env.PUBLIC_ONCHAINKIT_API_KEY,

  // Configurable settings
  MENTION_HANDLES:
    process.env.MENTION_HANDLES || "devconnectarg.base.eth, @devconnectarg",
  DEBUG_LOGS:
    process.env.DEBUG_LOGS === "true" && process.env.NODE_ENV !== "production",
  SHOW_SENDER_ADDRESS: process.env.SHOW_SENDER_ADDRESS === "true",

  //RSVP Backend Base Url
  BASE_URL: process.env.BASE_URL,
};
