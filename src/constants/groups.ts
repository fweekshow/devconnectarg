// TODO: ADD DEVCONNECT 2025 GROUP KEYWORDS HERE
// Group-related keywords for activity detection and group joining
// Example: "staking_summit", "governance_day", "eth_day", etc.
export const GROUP_KEYWORDS: string[] = [
  // Add DevConnect event keywords here when available
];

export const ACTIVITY_GROUPS: Record<string, string> = {
  ethcon_argentina: "6df533dc160bfdf8f9df6e859a4d05ef",
  staking_summit: "f83c9ea8f01a5a76c0038c487e0747fd",
  builder_nights: "66ffd36862150171d9940e4200e5a2a1",
  xmtp_devconnect: "XMTP @ DevConnect",
  eth_devconnect: "ETH @ DevConnect",
  base_devconnect: "Base @ DevConnect",
} as const;

export const ACTIVITY_NAMES: Record<string, string> = {
  ethcon_argentina: "🇦🇷 ETHCON Argentina 2025",
  staking_summit: "⛰️ Staking Summit",
  builder_nights: "🔨 Builder Nights Buenos Aires",
  xmtp_devconnect: "XMTP @ DevConnect",
  eth_devconnect: "ETH @ DevConnect",
  base_devconnect: "Base @ DevConnect",
} as const;

export const ACTIVITY_GROUP_MAP = {
  ethcon_argentina: "join_ethcon_argentina",
  staking_summit: "join_staking_summit",
  builder_nights: "join_builder_nights",
} as const;
