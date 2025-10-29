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

export const BANKR_INBOX_ID = "062b31e55329b63c5eb6889e89893ac40a5680e97b2bd2444ae98cb0af72fa9b";

export const DEFAULT_GROUP_MEMBER_COUNT = 3;

// Dynamic groups - AI-detected topic-based communities
export const DYNAMIC_GROUPS = {
  base: {
    keywords: ['base', 'coinbase', 'onbase', 'coinbase main event', 'base ecosystem'],
    friendlyName: 'Base @ DevConnect',
    description: 'Connect with Base builders and community',
    groupName: 'Base @ DevConnect',
  },
  xmtp: {
    keywords: ['xmtp', 'messaging', 'communication', 'decentralized chat'],
    friendlyName: 'XMTP Community',
    description: 'Join XMTP developers and users',
    groupName: 'XMTP @ DevConnect',
  },
  side_events: {
    keywords: ['party', 'afterparty', 'side event', 'social', 'networking', 'meetup'],
    friendlyName: 'Side Events @ DevConnect',
    description: 'Connect for social events and parties',
    groupName: 'Side Events @ DevConnect'
  },
  defi: {
    keywords: ['defi', 'aave', 'lending', 'yield farming', 'uniswap', 'protocol'],
    friendlyName: 'DeFi Builders @ DevConnect',
    description: 'Join DeFi protocol discussions',
    groupName: 'DeFi Builders @ DevConnect'
  },
  creators: {
    keywords: ['creator', 'content', 'media', 'youtube', 'podcast', 'content creation'],
    friendlyName: 'Creators @ DevConnect',
    description: 'Content creators and media builders',
    groupName: 'Creators @ DevConnect'
  },
  futbol: {
    keywords: ['futbol', 'soccer', 'football', 'match', 'game', 'pickup', 'pickup game', 'pickup games', 'sports', 'playing'],
    friendlyName: 'Futbol @ DevConnect',
    description: 'Connect with fellow soccer enthusiasts',
    groupName: 'Futbol @ DevConnect'
  },
  running: {
    keywords: ['running', 'marathon', '5k', 'jogging', 'fitness'],
    friendlyName: 'Running @ DevConnect',
    description: 'Join our running and fitness community',
    groupName: 'Running @ DevConnect'
  },
  networking: {
    keywords: ['networking', 'business', 'career', 'job', 'professional'],
    friendlyName: 'Networking @ DevConnect',
    description: 'Professional networking and career discussions',
    groupName: 'Networking @ DevConnect'
  },
  startups: {
    keywords: ['vc', 'venture capital', 'fundraising', 'investor', 'startup', 'funding'],
    friendlyName: 'Startups @ DevConnect',
    description: 'Connect with VCs and entrepreneurs',
    groupName: 'Startups @ DevConnect'
  },
  rocky_community: {
    keywords: ['ai', 'agent', 'agents', 'ai agent', 'chatbot', 'bot', 'llm', 'gpt', 'openai', 'rocky'],
    friendlyName: 'Rocky Community',
    description: 'Join AI and agent enthusiasts',
    groupName: 'Rocky Community'
  }
} as const;

export type DynamicGroupKey = keyof typeof DYNAMIC_GROUPS;