import type { Client, DecodedMessage, Conversation } from "@xmtp/node-sdk";
import { ContentTypeActions, type ActionsContent } from "../../../xmtp-inline-actions/types/ActionsContent.js";
import { getName } from "@coinbase/onchainkit/identity";
import { base } from "viem/chains";
import { insertGroupDetails } from "@/models/groupsModel.js";
import {
  ContentTypeRemoteAttachment,
} from "@xmtp/content-type-remote-attachment";

interface ClankingGroup {
  id: string;
  name: string;
  originalGroupId: string;
  createdBy: string;
  createdAt: Date;
  members: string[];
  tokenAddress?: string;
  tokenId?: string;
  imageUrl?: string;
}

// In-memory storage for clanking groups (replace with database in production)
const clankingGroups = new Map<string, ClankingGroup>();
const pendingInvitations = new Map<string, { groupId: string; originalGroupId: string }>();

// State machine for clanking flow
interface ClankingState {
  userInboxId: string;
  conversationId: string;
  state: 'WAITING_FOR_NAME_AND_IMAGE';
  startedAt: Date;
}
const clankingStates = new Map<string, ClankingState>();

// Bankr's inbox ID - automatically added to all clanking groups
const BANKR_INBOX_ID = "062b31e55329b63c5eb6889e89893ac40a5680e97b2bd2444ae98cb0af72fa9b";

// Clanker API configuration
const CLANKER_API_KEY = "rocky-bon2i-0svuh0wouh-infgjbk";
const CLANKER_API_BASE = "https://www.clanker.world/api";

// Rocky's wallet address for rewards (20% allocation)
const ROCKY_WALLET_ADDRESS = "0x6CBA9857c1593927800575dBD7d61ddf0A048DEA";

let clankingClient: Client<any> | null = null;

export function setClankingClient(client: Client<any>) {
  clankingClient = client;
}

// Function to resolve inbox ID to basename with fallback to wallet address
async function getSenderIdentifier(senderInboxId: string): Promise<string> {
  try {
    console.log(`🔍 Resolving sender identifier for inbox ${senderInboxId}...`);
    
    if (!clankingClient) {
      console.log("⚠️ Clanking client not available");
      return `inbox-${senderInboxId.slice(0, 6)}...`;
    }
    
    // Get the user's address from XMTP inbox state
    const inboxState = await clankingClient.preferences.inboxStateFromInboxIds([senderInboxId]);
    const addressFromInboxId = inboxState[0]?.identifiers[0]?.identifier;
    
    if (!addressFromInboxId) {
      console.log("⚠️ Could not resolve wallet address from inbox ID");
      return `inbox-${senderInboxId.slice(0, 6)}...`;
    }
    
    console.log(`📋 Resolved inbox ID to address: ${addressFromInboxId}`);
    
    // Ensure address is properly formatted
    const formattedAddress = addressFromInboxId.toLowerCase().startsWith('0x') 
      ? addressFromInboxId as `0x${string}`
      : `0x${addressFromInboxId}` as `0x${string}`;
    
    try {
      // Try to resolve address to basename using OnchainKit
      const basename = await getName({ 
        address: formattedAddress, 
        chain: base 
      });
      
      // If basename exists, use it; otherwise fall back to truncated address
      const displayName = basename || `${formattedAddress.slice(0, 6)}...${formattedAddress.slice(-4)}`;
      
      console.log(`✅ Final display name: ${displayName}`);
      return displayName;
      
    } catch (basenameError) {
      console.log(`⚠️ Basename resolution failed, using wallet address:`, basenameError);
      return `${formattedAddress.slice(0, 6)}...${formattedAddress.slice(-4)}`;
    }
    
  } catch (error) {
    console.error(`❌ Failed to get sender identifier:`, error);
    return `inbox-${senderInboxId.slice(0, 6)}...`;
  }
}

/**
 * Generate a unique 32-character request key
 */
function generateRequestKey(): string {
  return Array.from({ length: 32 }, () => 
    Math.random().toString(36).charAt(2)
  ).join('');
}

/**
 * Convert HTTP IPFS gateway URL to ipfs:// protocol format
 * Also validates the IPFS hash format
 */
function convertToIpfsProtocol(url: string): string | null {
  try {
    // Extract IPFS hash from gateway URL
    // Formats: https://gateway.io/ipfs/Qm... or https://gateway.io/ipfs/bafybei...
    const ipfsMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (ipfsMatch) {
      const hash = ipfsMatch[1];
      // Validate IPFS hash (starts with Qm or bafy)
      if (hash.startsWith('Qm') || hash.startsWith('bafy')) {
        console.log(`✅ Valid IPFS hash extracted: ${hash}`);
        return `ipfs://${hash}`;
      } else {
        console.warn(`⚠️ Invalid IPFS hash format: ${hash}`);
        return null;
      }
    }
    // If already in ipfs:// format, validate and return
    if (url.startsWith('ipfs://')) {
      const hash = url.replace('ipfs://', '');
      if (hash.startsWith('Qm') || hash.startsWith('bafy')) {
        console.log(`✅ Already in IPFS protocol format: ${url}`);
        return url;
      } else {
        console.warn(`⚠️ Invalid IPFS protocol URL: ${url}`);
        return null;
      }
    }
    // If it's a regular HTTPS URL (not IPFS), we might need to upload it
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.warn(`⚠️ Non-IPFS URL provided: ${url}`);
      console.warn(`⚠️ Clanker may not accept non-IPFS images. Consider using IPFS.`);
      return url; // Return as-is, let Clanker decide
    }
    
    console.error(`❌ Could not parse image URL: ${url}`);
    return null;
  } catch (error) {
    console.error(`❌ Error converting to IPFS protocol:`, error);
    return null;
  }
}

/**
 * Create a token using the Clanker API v4.0.0
 */
async function createClankerToken(
  groupName: string,
  ticker: string,
  imageUrl: string,
  creatorAddress: string
): Promise<{ tokenAddress: string; tokenId: string } | null> {
  try {
    console.log(`🎯 Creating Clanker token for group "${groupName}" with ticker "${ticker}"`);
    console.log(`📋 Creator: ${creatorAddress}, Rocky: ${ROCKY_WALLET_ADDRESS}`);
    
    // Convert image URL to IPFS protocol format
    const ipfsImageUrl = convertToIpfsProtocol(imageUrl);
    console.log(`📷 Original URL: ${imageUrl}`);
    console.log(`📷 IPFS Protocol URL: ${ipfsImageUrl}`);
    
    if (!ipfsImageUrl) {
      console.error(`❌ Failed to convert image URL to IPFS format`);
      return null;
    }
    
    // Build the v4.0.0 API payload
    const tokenData = {
      token: {
        name: groupName,
        symbol: ticker,
        image: ipfsImageUrl,
        tokenAdmin: creatorAddress, // Creator has admin control
        description: `Exclusive token for ${groupName} clanking group members`,
        requestKey: generateRequestKey()
      },
      rewards: [
        {
          admin: creatorAddress,
          recipient: creatorAddress,
          allocation: 80, // 80% to creator
          rewardsToken: "Both" // Rewards in both tokens
        },
        {
          admin: ROCKY_WALLET_ADDRESS,
          recipient: ROCKY_WALLET_ADDRESS,
          allocation: 20, // 20% to Rocky
          rewardsToken: "Both" // Rewards in both tokens
        }
      ],
      pool: {
        type: "standard",
        pairedToken: "0x4200000000000000000000000000000000000006", // WETH on Base
        initialMarketCap: 10 // Starting at 10 WETH market cap
      },
      fees: {
        type: "static",
        clankerFee: 1, // 1% fee on Clanker token inputs
        pairedFee: 1 // 1% fee on paired token inputs
      },
      chainId: 8453 // Base chain
    };

    console.log(`📤 Deploying token with payload:`, JSON.stringify(tokenData, null, 2));

    const response = await fetch(`${CLANKER_API_BASE}/tokens/deploy/v4`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLANKER_API_KEY
      },
      body: JSON.stringify(tokenData)
    });

    console.log(`📡 Clanker API Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Clanker API error: ${response.status} - ${errorText}`);
      console.error(`📤 Request payload was:`, JSON.stringify(tokenData, null, 2));
      return null;
    }

    const result = await response.json() as { success?: boolean; expectedAddress?: string; message?: string; error?: string; data?: any };
    console.log(`✅ Clanker token deployment response:`, JSON.stringify(result, null, 2));
    
    if (!result.success || !result.expectedAddress) {
      console.error(`❌ Token deployment failed:`, result);
      if (result.error) {
        console.error(`❌ Error details:`, result.error);
        console.error(`❌ Error data:`, result.data);
      }
      return null;
    }
    
    console.log(`🎉 Token will deploy at: ${result.expectedAddress}`);
    
    return {
      tokenAddress: result.expectedAddress,
      tokenId: result.expectedAddress // Use address as ID for v4.0.0
    };

  } catch (error) {
    console.error(`❌ Error creating Clanker token:`, error);
    return null;
  }
}

/**
 * Send group invitation to original conversation
 */
async function sendGroupInvitation(
  clankingGroup: any,
  groupName: string,
  originalConversation: Conversation,
  requesterInboxId: string
): Promise<void> {
  if (!clankingClient) return;
  
  const agentId = clankingClient.inboxId.slice(0, 8);
  
  const invitationActions: ActionsContent = {
    id: `devconnect_827491_${agentId}_clanking_invite_${clankingGroup.id}`,
    description: `🎯 "${groupName}" clanking group created with custom token! Would you like to join this exclusive group?`,
    actions: [
      {
        id: `devconnect_827491_${agentId}_join_clanking_${clankingGroup.id}`,
        label: "✅ Yes, Join",
        style: "primary"
      },
      {
        id: `devconnect_827491_${agentId}_decline_clanking_${clankingGroup.id}`,
        label: "❌ No Thanks",
        style: "secondary"
      }
    ]
  };

  await (originalConversation as any).send(invitationActions, ContentTypeActions);
  console.log(`📤 Sent clanking group invitation to original group conversation`);
}

/**
 * Start the clanking flow - user clicked "Clank" button
 */
export async function startClankingFlow(
  userInboxId: string,
  conversationId: string
): Promise<string> {
  console.log(`🎯 Starting clanking flow for user ${userInboxId}`);
  
  // Store state
  clankingStates.set(userInboxId, {
    userInboxId,
    conversationId,
    state: 'WAITING_FOR_NAME_AND_IMAGE',
    startedAt: new Date()
  });
  
  return `🪙 **Let's create your Clanking Group!**

Please reply with your token info in this format:
**Name:** [Token Name]
**Ticker:** [SYMBOL]
**+ Upload an image** (will be your token logo)

Example:
**Name:** Crypto Friends
**Ticker:** CRYPTO
[image attachment]`;
}

/**
 * Check if user is in clanking flow
 */
export function isInClankingFlow(userInboxId: string): boolean {
  return clankingStates.has(userInboxId);
}

/**
 * Handle clanking response - user sent name + ticker + image
 */
export async function handleClankingResponse(
  groupName: string,
  ticker: string,
  imageUrl: string,
  originalMessage: DecodedMessage,
  client: Client,
  originalConversation: Conversation,
  senderAddress: string
): Promise<string> {
  try {
    if (!clankingClient) {
      clankingStates.delete(originalMessage.senderInboxId);
      return "❌ Clanking group system not initialized. Please try again later.";
    }

    const requesterInboxId = originalMessage.senderInboxId;
    const originalGroupId = originalMessage.conversationId;

    console.log(`🎯 Creating clanking group "${groupName}" with token for ${requesterInboxId}`);
    
    // Clear the clanking state
    clankingStates.delete(requesterInboxId);

    // Step 1: Create XMTP group FIRST (immediate user access)
    const clankingGroup = await clankingClient!.conversations.newGroup([requesterInboxId]);
    
    console.log(`✅ Created clanking group: ${clankingGroup.id}`);

    // Step 2: Set the group name
    try {
      const currentName = (clankingGroup as any).name;
      if (!currentName || currentName !== groupName) {
        await (clankingGroup as any).updateName(groupName);
        console.log(`✅ Set clanking group name: "${groupName}"`);
      }
    } catch (nameError: any) {
      console.log(`⚠️ Could not set group name: ${nameError.message}`);
    }

    // Step 3: Make the requester a super admin
    try {
      await (clankingGroup as any).addSuperAdmin(requesterInboxId);
      console.log(`✅ Made ${requesterInboxId} a super admin of the clanking group`);
    } catch (adminError: any) {
      console.log(`⚠️ Could not make requester admin: ${adminError.message}`);
    }

    // Step 4: Add bankr to the group
    try {
      await (clankingGroup as any).addMembers([BANKR_INBOX_ID]);
      console.log(`✅ Added bankr to clanking group: ${BANKR_INBOX_ID}`);
    } catch (bankrError: any) {
      console.log(`⚠️ Could not add bankr to clanking group: ${bankrError.message}`);
    }

    // Step 5: Send initial welcome message
    await clankingGroup.send(`🎉 Welcome to "${groupName}"!

🪙 Creating your custom token... This will take a moment.`);

    // Step 6: Launch token (await completion)
    console.log(`🪙 Launching token for "${groupName}" (${ticker})...`);
    const tokenResult = await createClankerToken(groupName, ticker, imageUrl, senderAddress);
    
    if (!tokenResult) {
      await clankingGroup.send(`❌ Failed to create token. Your group is ready but the token deployment failed. 

Possible reasons:
• Image format not supported
• IPFS URL not accessible
• Clanker API error

Please contact support or try creating another group with a different image.`);
      
      // Store group without token info
      const clankingGroupData: ClankingGroup = {
        id: clankingGroup.id,
        name: groupName,
        originalGroupId: originalGroupId,
        createdBy: requesterInboxId,
        createdAt: new Date(),
        members: [requesterInboxId, BANKR_INBOX_ID],
        imageUrl: imageUrl
      };
      clankingGroups.set(clankingGroup.id, clankingGroupData);
      
      // Still send invitation to original group
      await sendGroupInvitation(clankingGroup, groupName, originalConversation, requesterInboxId);
      return "";
    }

    // Step 7: Store group metadata with token info
    const clankingGroupData: ClankingGroup = {
      id: clankingGroup.id,
      name: groupName,
      originalGroupId: originalGroupId,
      createdBy: requesterInboxId,
      createdAt: new Date(),
      members: [requesterInboxId, BANKR_INBOX_ID],
      tokenAddress: tokenResult.tokenAddress,
      tokenId: tokenResult.tokenId,
      imageUrl: imageUrl
    };
    clankingGroups.set(clankingGroup.id, clankingGroupData);

    // Step 8: Send token info in the group
    await clankingGroup.send(`✅ **Token Created Successfully!**

🪙 **Your Custom Token:**
• Name: ${groupName}
• Symbol: $${ticker}
• Address: \`${tokenResult.tokenAddress}\`
• View on Clanker: https://clanker.world/clanker/${tokenResult.tokenAddress}
• View on Base: https://basescan.org/token/${tokenResult.tokenAddress}

💰 **Revenue Split:**
• You receive 80% of trading fees
• Rocky receives 20% of trading fees

You are now a group admin and can manage this space!`);

    // Step 9: Store in database
    await insertGroupDetails({
      groupId: clankingGroup.id,
      groupName: groupName,
      groupType: 'sidebar', // Use sidebar type for now
      createdBy: senderAddress,
      memberCount: 3, // requester + bankr + agent
      description: `Clanking group for ${groupName} with custom token`,
      originalGroupId: originalGroupId,
      totalMessages: 0,
      totalMentionedMessages: 0,
      totalLeaves: 0,
      metadata: {
        tokenAddress: tokenResult.tokenAddress,
        tokenId: tokenResult.tokenId,
        imageUrl: imageUrl,
        isClanking: true
      },
    });
   
    // Step 10: Pause briefly to ensure group is properly set up
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 11: Send invitation to original group
    await sendGroupInvitation(clankingGroup, groupName, originalConversation, requesterInboxId);

    // Return empty string (no additional message needed in DM)
    return "";

  } catch (error: any) {
    console.error("❌ Error creating clanking group:", error);
    return `❌ Failed to create clanking group "${groupName}". Please try again later.\n\nError: ${error.message}`;
  }
}

/**
 * Handle joining a clanking group via quick actions
 */
export async function joinClankingGroup(
  groupId: string,
  userInboxId: string
): Promise<string> {
  try {
    if (!clankingClient) {
      return "❌ Clanking group system not initialized. Please try again later.";
    }

    // Get clanking group info
    const clankingGroupData = clankingGroups.get(groupId);
    if (!clankingGroupData) {
      return "❌ Clanking group not found.";
    }

    console.log(`🎯 Adding user ${userInboxId} to clanking group "${clankingGroupData.name}"`);

    // Sync conversations to get latest state
    await clankingClient!.conversations.sync();
    const allConversations = await clankingClient!.conversations.list();
    
    // Find the group by exact ID
    const clankingGroup = allConversations.find(conv => conv.id === groupId);
    
    if (!clankingGroup) {
      console.log(`❌ Clanking group (${groupId}) not found in agent's conversations`);
      return `❌ Could not find clanking group. Please contact support.`;
    }

    console.log(`✅ Found clanking group: ${clankingGroup.id}`);
    console.log(`   Name: ${clankingGroupData.name}`);

    // Check if user is already a member
    if (clankingGroupData.members.includes(userInboxId)) {
      console.log(`ℹ️ User ${userInboxId} is already in clanking group "${clankingGroupData.name}"`);
      return `✅ You're already in "${clankingGroupData.name}"! 

🪙 Your group token:
• Token Address: ${clankingGroupData.tokenAddress}
• View on Clanker: https://clanker.world/clanker/${clankingGroupData.tokenAddress}

Check your group conversations to find it.`;
    }

    // Add user to the group
    try {
      await (clankingGroup as any).addMembers([userInboxId]);
      console.log(`✅ Successfully added user to clanking group "${clankingGroupData.name}"`);
    } catch (addError: any) {
      console.log(`❌ Error adding to clanking group: ${addError.message}`);
      
      if (addError.message?.includes('already') || addError.message?.includes('duplicate')) {
        console.log(`ℹ️ User was already in clanking group (via error))`);
        return `✅ You're already in "${clankingGroupData.name}"! 

🪙 Your group token:
• Token Address: ${clankingGroupData.tokenAddress}
• View on Clanker: https://clanker.world/clanker/${clankingGroupData.tokenAddress}

Check your group conversations to find it.`;
      } else if (addError.message?.includes('Failed to verify all installations') || addError.code === 'GenericFailure') {
        console.log(`⚠️ Installation verification failed for clanking group - temporary XMTP network issue`);
        return `⚠️ There's a temporary network issue preventing group access right now. 

Please try joining "${clankingGroupData.name}" again in a few minutes, or contact support if the issue persists.

The clanking group is available and you can try again later!`;
      } else {
        console.log(`❌ Unknown error for clanking group:`, addError);
        return `❌ Failed to add you to "${clankingGroupData.name}". Error: ${addError.message || 'Unknown error'}. Please contact support.`;
      }
    }
    
    // Update our records
    clankingGroupData.members.push(userInboxId);
    clankingGroups.set(groupId, clankingGroupData);

    // Get the user's display name (basename or address)
    const userDisplayName = await getSenderIdentifier(userInboxId);

    // Send a welcome message with token info
    await clankingGroup.send(`🎉 ${userDisplayName} joined the "${clankingGroupData.name}" clanking group!

🪙 Group Token Info:
• Token Address: ${clankingGroupData.tokenAddress}
• Token ID: ${clankingGroupData.tokenId}

Welcome to this exclusive group with your custom token!`);

    return `✅ Great! You're now in "${clankingGroupData.name}" clanking group.

🪙 Your group has a custom token:
• Token Address: ${clankingGroupData.tokenAddress}
• Token ID: ${clankingGroupData.tokenId}

You'll receive messages and can participate in this exclusive group!`;

  } catch (error: any) {
    console.error("❌ Error joining clanking group:", error);
    return `❌ Failed to join clanking group. Please contact support or try again later.`;
  }
}

/**
 * Handle declining a clanking group invitation
 */
export async function declineClankingGroup(
  groupId: string,
  userInboxId: string
): Promise<string> {
  try {
    const clankingGroupData = clankingGroups.get(groupId);
    const groupName = clankingGroupData?.name || "clanking group";

    console.log(`📝 ${userInboxId} declined to join clanking group "${groupName}"`);

    return `✅ You've declined to join "${groupName}". No worries!`;

  } catch (error: any) {
    console.error("❌ Error declining clanking group:", error);
    return "✅ Invitation declined.";
  }
}


/**
 * Get clanking group info
 */
export function getClankingGroupInfo(groupId: string): ClankingGroup | undefined {
  return clankingGroups.get(groupId);
}

/**
 * List all clanking groups created by the agent
 */
export function listClankingGroups(): ClankingGroup[] {
  return Array.from(clankingGroups.values());
}

/**
 * Clean up expired invitations (call periodically)
 */
export function cleanupExpiredInvitations(maxAgeHours: number = 24): void {
  const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
  
  for (const [key, invitation] of pendingInvitations.entries()) {
    const groupData = clankingGroups.get(invitation.groupId);
    if (groupData && groupData.createdAt < cutoffTime) {
      pendingInvitations.delete(key);
    }
  }
  
  console.log(`🧹 Cleaned up expired clanking group invitations`);
}

export default {
  startClankingFlow,
  isInClankingFlow,
  handleClankingResponse,
  joinClankingGroup,
  declineClankingGroup,
  getClankingGroupInfo,
  listClankingGroups,
  cleanupExpiredInvitations,
  setClankingClient
};
