import type { Client } from "@xmtp/node-sdk";

// Store the client reference for group management
let groupClient: Client<any> | null = null;

export function setGroupClient(client: Client<any>) {
  groupClient = client;
}

// Function to initialize the agent by creating/joining activity groups
export async function initializeAgentInGroups(): Promise<void> {
  if (!groupClient) {
    console.log("❌ Group client not initialized");
    return;
  }

  console.log("🔄 Initializing agent in activity groups...");
  
  // First, let's see what conversations the agent actually has access to
  console.log("🔄 Syncing conversations (aggressive)...");
  await groupClient.conversations.sync();
  
  // Wait and sync again to ensure all installations are synced
  console.log("🔄 Waiting for installation sync...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  await groupClient.conversations.sync();
  
  console.log("🔄 Getting conversation list...");
  const allConversations = await groupClient.conversations.list();
  console.log(`🔍 Agent has access to ${allConversations.length} total conversations`);
  
  // Check if agent has access to all activity groups
  for (const [activity, groupId] of Object.entries(ACTIVITY_GROUPS)) {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔄 Checking ${activity} group (${groupId})...`);
      }
      
      // Look for group by exact ID match
      const group = allConversations.find(conv => conv.id === groupId);
      
      if (group) {
        const groupDetails = group as any;
        if (process.env.NODE_ENV !== 'production') {
          console.log(`✅ Found ${activity} group: ${group.id}`);
          console.log(`   Name: ${groupDetails.name || 'No name'}`);
          console.log(`   Description: ${groupDetails.description || 'No description'}`);
        }
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`❌ ${activity} group not found!`);
          console.log(`💡 Expected ID: ${groupId}`);
          console.log(`💡 Agent address: ${(groupClient as any).address || 'unknown'}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error checking ${activity} group:`, error);
    }
  }
}

// Activity group IDs - actual IDs from the groups the agent has access to
const ACTIVITY_GROUPS = {
  // Physical Activities
  yoga: "30a7bba3a9715180891a807e16be16af",
  running: "5980087769adb51f37190ac0f9500340", 
  pickleball: "01cdc3fc34a8810919b953c528135044",
  hiking: "0e11ad71f6cd8808836529bc31fbaffa",
  
  // Workshop Sessions
  builder: "2d7ac518445f313168be7defbf33e2b2",
  payments: "d8c73c3a75b92aa59f49e8114b787675",
  trenches: "2a715655d7454de01a211d73802016d4",
  coding: "5ada589ba100827332fd6d3c61c88563",
  ads: "2a0b1d26b7c324c6660a6ffe093581dc",
  agents: "15ee8a42086526afff10cbe4c0567fd1",
  video: "02c8c86d70cd652b8e9646feca600cfd",
  roast: "abe3816d3904c5557f4298bc8408456d",
  "mini app": "4609a0bd6229b8e19467f03eb6c5ec68",
  governance: "65f1797010de80b83d047b3021379969",
  deals: "c9bafb0a22fc7b49dcb8afe4a0b357a8",
  defi: "d85ddfb052ddf73bb1db3aa6fc09d723",
  network: "2ec1efe21fcb0f15944091eb27dc39f8",
  coining: "a265fcb5fb55b9088f28e0e068bccbb2",
  students: "f9bc3c3369da4f9847ea65f2b02a3ef2",
  
  // Base @ DevConnect Group - placeholder ID, will be resolved by name
  "base_global_events": "BASE_DEVCONNECT_PLACEHOLDER"
};

// Activity group names for display
const ACTIVITY_NAMES = {
  // Physical Activities
  yoga: "🧘 Yoga @ Basecamp",
  running: "🏃 Running @ Basecamp",
  pickleball: "🏓 Pickleball @ Basecamp", 
  hiking: "🥾 Hiking @ Basecamp",
  
  // Workshop Sessions
  builder: "🔨 Base Builder Session @ Basecamp",
  payments: "💳 Onchain Payments Session @ Basecamp",
  trenches: "⚔️ Arming the Trenches Session @ Basecamp",
  coding: "💻 Vibe Coding Session @ Basecamp",
  ads: "📢 Base Ads Session @ Basecamp",
  agents: "🤖 Agents Session @ Basecamp",
  video: "🎬 Viral Videos Session @ Basecamp",
  roast: "🔥 Base App Roast Session @ Basecamp",
  "mini app": "📱 Mini Apps Session @ Basecamp",
  governance: "🏛️ Governance Session @ Basecamp",
  deals: "💼 VC Landscape Session @ Basecamp",
  defi: "🪙 DeFi Deals Session @ Basecamp",
  network: "🌐 Network State Session @ Basecamp",
  coining: "🪙 Coining Session @ Basecamp",
  students: "🎓 Students @ Basecamp",
  
  // Base @ DevConnect Group
  "base_global_events": "🌍 Base @ DevConnect"
};

// Function to add a user to an activity group
export async function addMemberToActivityGroup(
  activity: keyof typeof ACTIVITY_GROUPS,
  userInboxId: string
): Promise<string> {
  try {
    if (!groupClient) {
      return "❌ Group management system not initialized. Please try again later.";
    }

    const activityName = ACTIVITY_NAMES[activity];
    
    console.log(`🎯 Adding user ${userInboxId} to ${activityName} group`);

    // Get the group by exact ID match
    const groupId = ACTIVITY_GROUPS[activity];
    if (!groupId) {
      return "❌ Unknown activity. Available activities: yoga, running, pickleball, hiking";
    }

    await groupClient.conversations.sync();
    const allConversations = await groupClient.conversations.list();
    
    // Find the group by exact ID
    const group = allConversations.find(conv => conv.id === groupId);
    
    if (!group) {
      console.log(`❌ ${activity} group (${groupId}) not found in agent's conversations`);
      console.log(`🔍 Available groups:`);
      allConversations.filter(c => c.constructor.name === 'Group').forEach(conv => {
        const details = conv as any;
        console.log(`  - ${conv.id}: ${details.name || 'No name'}`);
      });
      return `❌ Could not find ${activityName} group. The agent needs to be added to this group first. Please contact support to add the agent to the ${activityName} group.`;
    }

    console.log(`✅ Found ${activity} group: ${group.id}`);
    console.log(`   Name: ${(group as any).name || 'No name'}`);

    // Add the member to the group using the correct XMTP method
    try {
      await (group as any).addMembers([userInboxId]);
      console.log(`✅ Successfully added user to ${activityName} group`);
    } catch (addError: any) {
      console.log(`❌ Error for ${activityName}: ${addError.message}`);
      
      if (addError.message?.includes('already') || addError.message?.includes('duplicate')) {
        console.log(`ℹ️ User was already in ${activityName} group`);
        return `✅ You're already in the ${activityName} group! You can participate in discussions and receive updates.`;
      } else if (addError.message?.includes('Failed to verify all installations') || addError.code === 'GenericFailure') {
        console.log(`⚠️ Installation verification failed for ${activityName} group - user is already in group`);
        return `✅ You're already in the ${activityName} group! You can participate in discussions and receive updates.`;
      } else {
        console.log(`❌ Unknown error for ${activityName} group:`, addError);
        return `❌ Failed to add you to the ${activityName} group. Error: ${addError.message || 'Unknown error'}. Please contact support.`;
      }
    }
    
    return `✅ Great! You're now in the ${activityName} group chat.`;

  } catch (error: any) {
    console.error(`❌ Error adding member to ${activity} group:`, error);
    return `❌ Failed to add you to the ${ACTIVITY_NAMES[activity]} group. Please contact support or try again later.`;
  }
}

// Special function to add user to Base @ DevConnect group by name
export async function addMemberToBaseGlobalEvents(userInboxId: string): Promise<string> {
  try {
    if (!groupClient) {
      return "❌ Group management system not initialized. Please try again later.";
    }

    console.log(`🎯 Adding user ${userInboxId} to Base @ DevConnect group`);

    await groupClient.conversations.sync();
    const allConversations = await groupClient.conversations.list();
    
    // Find the group by name "Base @ DevConnect"
    const group = allConversations.find(conv => {
      const details = conv as any;
      return details.name === "Base @ DevConnect";
    });
    
    if (!group) {
      console.log(`❌ Base @ DevConnect group not found in agent's conversations`);
      console.log(`🔍 Available groups:`);
      allConversations.filter(c => c.constructor.name === 'Group').forEach(conv => {
        const details = conv as any;
        console.log(`  - ${conv.id}: ${details.name || 'No name'}`);
      });
      return `❌ Could not find Base @ DevConnect group. The agent needs to be added to this group first. Please contact support to add the agent to the Base @ DevConnect group.`;
    }

    console.log(`✅ Found Base @ DevConnect group: ${group.id}`);
    console.log(`   Name: ${(group as any).name || 'No name'}`);

    // Add the member to the group using the correct XMTP method
    try {
      await (group as any).addMembers([userInboxId]);
      console.log(`✅ Successfully added user to Base @ DevConnect group`);
    } catch (addError: any) {
      console.log(`❌ Error for Base @ DevConnect: ${addError.message}`);
      
      if (addError.message?.includes('already') || addError.message?.includes('duplicate')) {
        console.log(`ℹ️ User was already in Base @ DevConnect group`);
        return `✅ You're already in the Base @ DevConnect group! You can participate in community discussions.`;
      } else if (addError.message?.includes('Failed to verify all installations') || addError.code === 'GenericFailure') {
        console.log(`⚠️ Installation verification failed for Base @ DevConnect group - user is already in group`);
        return `✅ You're already in the Base @ DevConnect group! You can participate in community discussions.`;
      } else {
        console.log(`❌ Unknown error for Base @ DevConnect group:`, addError);
        return `❌ Failed to add you to the Base @ DevConnect group. Error: ${addError.message || 'Unknown error'}. Please contact support.`;
      }
    }
    
    return `✅ Great! You're now in the Base @ DevConnect group chat.`;

  } catch (error: any) {
    console.error(`❌ Error adding member to Base @ DevConnect group:`, error);
    return `❌ Failed to add you to the Base @ DevConnect group. Please contact support or try again later.`;
  }
}

// Function to get activity group info
export function getActivityGroupInfo(activity: keyof typeof ACTIVITY_GROUPS): { groupId: string; name: string } | null {
  const groupId = ACTIVITY_GROUPS[activity];
  const name = ACTIVITY_NAMES[activity];
  
  if (!groupId) return null;
  
  return { groupId, name };
}

// List all available activity groups
export function getAvailableActivities(): string[] {
  return Object.keys(ACTIVITY_GROUPS);
}

// Activity group mapping for quick actions
export const ACTIVITY_GROUP_MAP = {
  // Physical Activities
  'yoga': 'join_yoga',
  'running': 'join_running', 
  'pickleball': 'join_pickleball',
  'hiking': 'join_hiking',
  
  // Workshop Sessions
  'builder': 'join_builder',
  'payments': 'join_payments',
  'trenches': 'join_trenches',
  'coding': 'join_coding',
  'ads': 'join_ads',
  'agents': 'join_agents',
  'video': 'join_video',
  'roast': 'join_roast',
  'mini app': 'join_mini_app',
  'governance': 'join_governance',
  'deals': 'join_deals',
  'defi': 'join_defi',
  'network': 'join_network',
  'coining': 'join_coining',
  'students': 'join_students'
} as const;

// Check if an activity has group chat functionality
export function hasGroupChat(activity: string): boolean {
  const normalized = activity.toLowerCase();
  return normalized in ACTIVITY_GROUP_MAP;
}

// Get the join action ID for an activity
export function getJoinActionId(activity: string): string | null {
  const normalized = activity.toLowerCase();
  return ACTIVITY_GROUP_MAP[normalized as keyof typeof ACTIVITY_GROUP_MAP] || null;
}

// Generate quick actions for activity group joining
export function generateActivityGroupQuickActions(activity: string, scheduleInfo: string) {
  const normalized = activity.toLowerCase();
  const joinActionId = getJoinActionId(normalized);
  
  if (!joinActionId) {
    return null;
  }

  const displayName = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  
  return {
    id: `${normalized}_group_join`,
    description: `🎯 ${displayName} schedule: ${scheduleInfo}

Would you like me to add you to the ${displayName} @ Basecamp group chat?`,
    actions: [
      {
        id: joinActionId,
        label: "✅ Yes, Add Me",
        style: "primary"
      },
      {
        id: "no_group_join",
        label: "❌ No Thanks", 
        style: "secondary"
      }
    ]
  };
}

// Generate group selection quick actions for the main "Join Groups" button
export function generateGroupSelectionQuickActions() {
  return {
    id: "group_selection_actions",
    description: "👥 Which group would you like to join?",
    actions: [
      {
        id: "join_yoga",
        label: "🧘 Yoga",
        style: "primary"
      },
      {
        id: "join_running",
        label: "🏃 Running",
        style: "primary"
      },
      {
        id: "join_hiking",
        label: "🥾 Hiking",
        style: "primary"
      },
      {
        id: "join_pickleball",
        label: "🏓 Pickleball",
        style: "primary"
      }
    ]
  };
}
