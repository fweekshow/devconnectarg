import OpenAI from "openai";
import type { Client } from "@xmtp/node-sdk";

// Store the client reference for group management
let dynamicGroupClient: Client<any> | null = null;

export function setDynamicGroupClient(client: Client<any>) {
  dynamicGroupClient = client;
}

// Group configuration mapping topics to their metadata and actual group IDs/names
export const TOPIC_GROUPS = {
  base: {
    keywords: ['base', 'coinbase', 'onbase', 'coinbase main event', 'base ecosystem'],
    friendlyName: 'Base @ DevConnect',
    description: 'Connect with Base builders and community',
    groupName: 'Base @ DevConnect', // Existing group
    useExistingFunction: 'addMemberToBaseGlobalEvents' // Use existing function
  },
  xmtp: {
    keywords: ['xmtp', 'messaging', 'communication', 'decentralized chat'],
    friendlyName: 'XMTP Community',
    description: 'Join XMTP developers and users',
    groupName: 'XMTP @ DevConnect', // Existing group
    useExistingFunction: 'addMemberToXMTPGroup' // Use existing function
  },
  social: {
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
  vc: {
    keywords: ['vc', 'venture capital', 'fundraising', 'investor', 'startup', 'funding'],
    friendlyName: 'Startups @ DevConnect',
    description: 'Connect with VCs and entrepreneurs',
    groupName: 'Startups @ DevConnect'
  }
} as const;

type TopicKey = keyof typeof TOPIC_GROUPS;

/**
 * Use AI to detect if the user's query relates to any group topics
 * Returns the topic key if relevant, null otherwise
 */
export async function detectRelevantGroup(
  userQuery: string, 
  agentResponse: string
): Promise<TopicKey | null> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ No OpenAI API key for group detection');
      return null;
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const groupOptions = Object.entries(TOPIC_GROUPS)
      .map(([key, config]) => `${key}: ${config.friendlyName} (${config.keywords.join(', ')})`)
      .join('\n');

    const detectionPrompt = `Analyze this user query and agent response to determine if there's a relevant group chat they might want to join.

Available groups:
${groupOptions}

User Query: "${userQuery}"
Agent Response: "${agentResponse}"

Rules:
1. Only suggest a group if the user's query clearly relates to that topic
2. Be precise - don't suggest groups for vague or unrelated queries
3. Consider the context of what they're asking about
4. IMPORTANT: For sports/games (pickup games, soccer, futbol, football, playing sports) → suggest "futbol"
5. IMPORTANT: For networking/career/business → suggest "networking" 
6. IMPORTANT: For content creation/YouTube/podcasts → suggest "creators"

Examples:
- "pickup games" → futbol
- "any soccer matches?" → futbol  
- "futbol games" → futbol
- "business networking" → networking
- "content creators" → creators

If there's a clear match with one of the group topics above, respond with ONLY the group key (e.g., "base", "creators", "defi", "futbol", "networking"). If no clear match or not relevant, respond "NONE".

Respond with just the group key or "NONE":`;

    console.log(`🔍 Detecting relevant group for query: "${userQuery.slice(0, 100)}..."`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: detectionPrompt }],
      max_tokens: 10,
      temperature: 0.1
    });
    
    const detectedTopic = completion.choices[0].message.content?.trim().toLowerCase();
    
    if (detectedTopic && detectedTopic !== "none" && detectedTopic in TOPIC_GROUPS) {
      console.log(`✅ Detected relevant group: ${detectedTopic}`);
      return detectedTopic as TopicKey;
    }

    // Fallback: Simple keyword matching if AI detection failed
    const queryLower = userQuery.toLowerCase();
    for (const [topicKey, config] of Object.entries(TOPIC_GROUPS)) {
      const keywordMatch = config.keywords.some(keyword => queryLower.includes(keyword.toLowerCase()));
      if (keywordMatch) {
        console.log(`✅ Fallback keyword match detected: ${topicKey}`);
        return topicKey as TopicKey;
      }
    }
    
    console.log(`❌ No relevant group detected`);
    return null;
    
  } catch (error) {
    console.error("❌ Error detecting relevant group:", error);
    return null;
  }
}

/**
 * Generate Quick Actions for joining a specific topic group
 */
export function generateTopicGroupJoinActions(topic: TopicKey): {
  id: string;
  description: string;
  actions: Array<{
    id: string;
    label: string;
    style: "primary" | "secondary" | "danger";
  }>;
} {
  const groupConfig = TOPIC_GROUPS[topic];
  
  return {
    id: `topic_group_${topic}_join`,
    description: `Would you like to join the ${groupConfig.friendlyName} group chat?

${groupConfig.description}`,
    actions: [
      {
        id: `join_topic_group_${topic}`,
        label: `✅ Yes, Add Me`,
        style: "primary" as const
      },
      {
        id: "show_main_menu",
        label: "❌ No Thanks",
        style: "secondary" as const
      }
    ]
  };
}

/**
 * Handle joining a topic-specific group
 * This integrates with existing group joining logic
 */
export async function joinTopicGroup(
  topic: TopicKey,
  userInboxId: string,
  client: any
): Promise<string> {
  try {
    const groupConfig = TOPIC_GROUPS[topic];
    console.log(`🎯 Adding user ${userInboxId} to ${groupConfig.friendlyName} group`);

    // Check if this topic has an existing function to use (Base, XMTP)
    if ('useExistingFunction' in groupConfig) {
      const functionName = groupConfig.useExistingFunction as string;
      console.log(`🔄 Using existing function: ${functionName}`);
      
      try {
        // Import and call the existing group join function
        const { addMemberToBaseGlobalEvents, addMemberToXMTPGroup } = await import("./activityGroups.js");
        
        let result: string;
        if (functionName === 'addMemberToBaseGlobalEvents') {
          result = await addMemberToBaseGlobalEvents(userInboxId);
        } else if (functionName === 'addMemberToXMTPGroup') {
          result = await addMemberToXMTPGroup(userInboxId);
        } else {
          throw new Error(`Unknown function: ${functionName}`);
        }
        
        return result;
      } catch (importError) {
        console.error(`❌ Error calling existing function ${functionName}:`, importError);
        return `❌ Failed to join the ${groupConfig.friendlyName} group. Please try again later.`;
      }
    }

    // For topics without existing functions, check if the group exists
    if (!dynamicGroupClient && !client) {
      return "❌ Group management system not initialized. Please try again later.";
    }

    const groupClient = client || dynamicGroupClient;
    if (!groupClient) {
      return "❌ Group management system not initialized. Please try again later.";
    }

    // Sync conversations to ensure we have the latest state
    await groupClient.conversations.sync();
    const allConversations = await groupClient.conversations.list();
    
    // Find the group by name
    const group = allConversations.find((conv: any) => {
      const details = conv as any;
      return details.name === groupConfig.groupName;
    });
    
    if (!group) {
      console.log(`❌ ${groupConfig.groupName} group not found in agent's conversations`);
      console.log(`🔍 Available groups:`);
      allConversations.filter((c: any) => c.constructor.name === 'Group').forEach((conv: any) => {
        const details = conv as any;
        console.log(`  - ${conv.id}: ${details.name || 'No name'}`);
      });
      
      // Group doesn't exist yet - provide helpful message
      return `🚧 The ${groupConfig.friendlyName} group is coming soon!

I detected you're interested in ${groupConfig.description.toLowerCase()}. The ${groupConfig.friendlyName} community group will be available during DevConnect.

For now, you can:
• Check the main menu for related groups like Base Group or XMTP Group
• Ask me about ${topic}-related events in the schedule
• Join existing activity groups through the "More Groups" option

Thanks for your interest - the group will be live soon! 🎉`;
    }

    console.log(`✅ Found ${groupConfig.groupName} group: ${group.id}`);

    try {
      // Add the member to the group using XMTP method
      await (group as any).addMembers([userInboxId]);
      console.log(`✅ Successfully added user to ${groupConfig.groupName} group`);
      
      return `✅ Great! You've been added to the ${groupConfig.friendlyName} group chat.
      
You'll receive messages and can participate in discussions about ${groupConfig.description.toLowerCase()}!`;
      
    } catch (addError: any) {
      console.log(`❌ Error adding to ${groupConfig.groupName}: ${addError.message}`);
      
      if (addError.message?.includes('already') || addError.message?.includes('duplicate')) {
        return `✅ You're already in the ${groupConfig.friendlyName} group! You can participate in community discussions.`;
      } else if (addError.message?.includes('Failed to verify all installations') || addError.code === 'GenericFailure') {
        return `✅ You're already in the ${groupConfig.friendlyName} group! You can participate in community discussions.`;
      } else {
        console.log(`❌ Unknown error for ${groupConfig.groupName}:`, addError);
        return `❌ Failed to add you to the ${groupConfig.friendlyName} group. Error: ${addError.message || 'Unknown error'}. Please contact support.`;
      }
    }
    
  } catch (error: any) {
    console.error(`❌ Error in joinTopicGroup for ${topic}:`, error);
    return "❌ Failed to join the group. Please try again later.";
  }
}
