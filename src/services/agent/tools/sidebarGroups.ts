import type { Client, DecodedMessage, Conversation } from "@xmtp/node-sdk";
import { ContentTypeActions, type ActionsContent } from "../../../xmtp-inline-actions/types/ActionsContent.js";
import { getName } from "@coinbase/onchainkit/identity";
import { base } from "viem/chains";

interface SidebarGroup {
  id: string;
  name: string;
  originalGroupId: string;
  createdBy: string;
  createdAt: Date;
  members: string[];
}

// In-memory storage for sidebar groups (replace with database in production)
const sidebarGroups = new Map<string, SidebarGroup>();
const pendingInvitations = new Map<string, { groupId: string; originalGroupId: string }>();

// Bankr's inbox ID - automatically added to all sidebar groups
const BANKR_INBOX_ID = "062b31e55329b63c5eb6889e89893ac40a5680e97b2bd2444ae98cb0af72fa9b";

let sidebarClient: Client<any> | null = null;

export function setSidebarClient(client: Client<any>) {
  sidebarClient = client;
}

// Function to resolve inbox ID to basename with fallback to wallet address
async function getSenderIdentifier(senderInboxId: string): Promise<string> {
  try {
    console.log(`🔍 Resolving sender identifier for inbox ${senderInboxId}...`);
    
    if (!sidebarClient) {
      console.log("⚠️ Sidebar client not available");
      return `inbox-${senderInboxId.slice(0, 6)}...`;
    }
    
    // Get the user's address from XMTP inbox state
    const inboxState = await sidebarClient.preferences.inboxStateFromInboxIds([senderInboxId]);
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
 * Handle sidebar group creation request
 * Triggered by: "@devconnectarg.base.eth sidebar GroupName" or "@devconnectarg sidebar GroupName"
 */
export async function handleSidebarRequest(
  groupName: string,
  originalMessage: DecodedMessage,
  client: Client,
  originalConversation: Conversation
): Promise<string> {
  try {
    if (!sidebarClient) {
      return "❌ Sidebar group system not initialized. Please try again later.";
    }

    const requesterInboxId = originalMessage.senderInboxId;
    const originalGroupId = originalMessage.conversationId;

    console.log(`🎯 Creating sidebar group "${groupName}" requested by ${requesterInboxId}`);

    // Step 1: Create XMTP group with requester and agent as initial members
    const sidebarGroup = await sidebarClient!.conversations.newGroup([requesterInboxId]);
    
    console.log(`✅ Created sidebar group: ${sidebarGroup.id}`);

    // Step 1.5: Automatically add bankr to all sidebar groups
    try {
      await (sidebarGroup as any).addMembers([BANKR_INBOX_ID]);
      console.log(`✅ Added bankr to sidebar group: ${BANKR_INBOX_ID}`);
    } catch (bankrError: any) {
      console.log(`⚠️ Could not add bankr to sidebar group: ${bankrError.message}`);
      // Continue anyway - the group still works
    }

    // Step 2: Set the group name after creation
    try {
      const currentName = (sidebarGroup as any).name;
      if (!currentName || currentName !== groupName) {
        await (sidebarGroup as any).updateName(groupName);
        console.log(`✅ Set sidebar group name: "${groupName}"`);
      }
    } catch (nameError: any) {
      console.log(`⚠️ Could not set group name: ${nameError.message}`);
    }

    // Step 3: Store sidebar group metadata
    const sidebarGroupData: SidebarGroup = {
      id: sidebarGroup.id,
      name: groupName,
      originalGroupId: originalGroupId,
      createdBy: requesterInboxId,
      createdAt: new Date(),
      members: [requesterInboxId, BANKR_INBOX_ID] // Agent and bankr are automatically included
    };
    
    sidebarGroups.set(sidebarGroup.id, sidebarGroupData);

    // Step 4: Make the requester a super admin of the group they created
    try {
      await (sidebarGroup as any).addSuperAdmin(requesterInboxId);
      console.log(`✅ Made ${requesterInboxId} a super admin of the sidebar group`);
    } catch (adminError: any) {
      console.log(`⚠️ Could not make requester admin: ${adminError.message}`);
      // Continue anyway - the group still works, just without admin privileges
    }

    // Step 5: Send welcome message to the sidebar group
    await sidebarGroup.send(`🎯 Welcome to "${groupName}"!\n\nThis is a sidebar conversation from the main group. You are now a group admin and can manage this space for focused discussions.`);

    // Step 6: Pause briefly to ensure group is properly set up
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 7: Send invitation quick actions with agent-specific namespacing
    const agentId = sidebarClient!.inboxId.slice(0, 8); // Use first 8 chars of inbox ID as unique identifier
    
    const invitationActions: ActionsContent = {
      id: `devconnect_827491_${agentId}_sidebar_invite_${sidebarGroup.id}`,
      description: `🎯 "${groupName}" sidebar group created! Would you like to join this focused discussion?`,
      actions: [
        {
          id: `devconnect_827491_${agentId}_join_sidebar_${sidebarGroup.id}`,
          label: "✅ Yes, Join",
          style: "primary"
        },
        {
          id: `devconnect_827491_${agentId}_decline_sidebar_${sidebarGroup.id}`,
          label: "❌ No Thanks",
          style: "secondary"
        }
      ]
    };

    // Send invitation to original group conversation
    await (originalConversation as any).send(invitationActions, ContentTypeActions);
    console.log(`📤 Sent sidebar group invitation to original group conversation`);

    // Step 8: Return a simple confirmation (no additional message needed)
    return ""; // Don't send a separate confirmation message

  } catch (error: any) {
    console.error("❌ Error creating sidebar group:", error);
    return `❌ Failed to create sidebar group "${groupName}". Please try again later.\n\nError: ${error.message}`;
  }
}

/**
 * Handle joining a sidebar group via quick actions
 */
export async function joinSidebarGroup(
  groupId: string,
  userInboxId: string
): Promise<string> {
  try {
    if (!sidebarClient) {
      return "❌ Sidebar group system not initialized. Please try again later.";
    }

    // Since we send invitations to the group conversation, we don't need to check
    // for individual invitations - anyone who sees the quick actions can join

    // Get sidebar group info
    const sidebarGroupData = sidebarGroups.get(groupId);
    if (!sidebarGroupData) {
      return "❌ Sidebar group not found.";
    }

    console.log(`🎯 Adding user ${userInboxId} to sidebar group "${sidebarGroupData.name}"`);

    // Sync conversations to get latest state
    await sidebarClient!.conversations.sync();
    const allConversations = await sidebarClient!.conversations.list();
    
    // Find the group by exact ID (matching activityGroups pattern)
    const sidebarGroup = allConversations.find(conv => conv.id === groupId);
    
    if (!sidebarGroup) {
      console.log(`❌ Sidebar group (${groupId}) not found in agent's conversations`);
      return `❌ Could not find sidebar group. Please contact support.`;
    }

    console.log(`✅ Found sidebar group: ${sidebarGroup.id}`);
    console.log(`   Name: ${sidebarGroupData.name}`);

    // Add user to the group using the same pattern as activityGroups
    try {
      await (sidebarGroup as any).addMembers([userInboxId]);
      console.log(`✅ Successfully added user to sidebar group "${sidebarGroupData.name}"`);
    } catch (addError: any) {
      console.log(`❌ Error adding to sidebar group: ${addError.message}`);
      
      if (addError.message?.includes('already') || addError.message?.includes('duplicate')) {
        console.log(`ℹ️ User was already in sidebar group`);
        return `ℹ️ You're already in "${sidebarGroupData.name}"! Check your group conversations to find it.`;
      } else if (addError.message?.includes('Failed to verify all installations') || addError.code === 'GenericFailure') {
        console.log(`⚠️ Installation verification failed for sidebar group - temporary XMTP network issue`);
        return `⚠️ There's a temporary network issue preventing group access right now. 

Please try joining "${sidebarGroupData.name}" again in a few minutes, or contact support if the issue persists.

The sidebar group is available and you can try again later!`;
      } else {
        console.log(`❌ Unknown error for sidebar group:`, addError);
        return `❌ Failed to add you to "${sidebarGroupData.name}". Error: ${addError.message || 'Unknown error'}. Please contact support.`;
      }
    }
    
    // Update our records
    sidebarGroupData.members.push(userInboxId);
    sidebarGroups.set(groupId, sidebarGroupData);

    // Get the user's display name (basename or address)
    const userDisplayName = await getSenderIdentifier(userInboxId);

    // Send a welcome message to help the user identify the group
    await sidebarGroup.send(`🎉 ${userDisplayName} joined the "${sidebarGroupData.name}" sidebar discussion!`);

    return `✅ Great! You're now in "${sidebarGroupData.name}" sidebar group.

You'll receive messages and can participate in this focused discussion!`;

  } catch (error: any) {
    console.error("❌ Error joining sidebar group:", error);
    return `❌ Failed to join sidebar group. Please contact support or try again later.`;
  }
}

/**
 * Handle declining a sidebar group invitation
 */
export async function declineSidebarGroup(
  groupId: string,
  userInboxId: string
): Promise<string> {
  try {
    const sidebarGroupData = sidebarGroups.get(groupId);
    const groupName = sidebarGroupData?.name || "sidebar group";

    console.log(`📝 ${userInboxId} declined to join sidebar group "${groupName}"`);

    return `✅ You've declined to join "${groupName}". No worries!`;

  } catch (error: any) {
    console.error("❌ Error declining sidebar group:", error);
    return "✅ Invitation declined.";
  }
}

/**
 * Parse sidebar command from message content
 * Supports: "@devconnectarg sidebar this conversation GroupName" or "@devconnectarg sidebar GroupName"
 * Also supports: "@devconnectarg.base.eth sidebar GroupName"
 * Also supports cleaned content: "sidebar this conversation GroupName" or "sidebar GroupName"
 * Also supports: ".base.eth sidebar GroupName" (after mention removal)
 */
export function parseSidebarCommand(content: string): string | null {
  // Try with @devconnectarg.base.eth prefix first (full basename)
  let sidebarMatch = content.match(/@devconnectarg\.base\.eth sidebar (?:this (?:conversation )?)?(.+)/i);
  if (sidebarMatch) {
    return sidebarMatch[1].trim();
  }
  
  // Try with @devconnectarg prefix (short version)
  sidebarMatch = content.match(/@devconnectarg sidebar (?:this (?:conversation )?)?(.+)/i);
  if (sidebarMatch) {
    return sidebarMatch[1].trim();
  }
  
  // Try with .base.eth sidebar (cleaned content after mention removal)
  sidebarMatch = content.match(/\.base\.eth sidebar (?:this (?:conversation )?)?(.+)/i);
  if (sidebarMatch) {
    return sidebarMatch[1].trim();
  }
  
  // Try without any prefix (for cleaned content from groups)
  sidebarMatch = content.match(/^sidebar (?:this (?:conversation )?)?(.+)/i);
  return sidebarMatch ? sidebarMatch[1].trim() : null;
}

/**
 * Check if message is a sidebar creation request
 */
export function isSidebarRequest(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return lowerContent.includes('@devconnectarg.base.eth sidebar') ||
         lowerContent.includes('@devconnectarg sidebar') || 
         lowerContent.includes('.base.eth sidebar') || // Handles cleaned content after mention removal
         lowerContent.startsWith('sidebar ');
}

/**
 * Get sidebar group info
 */
export function getSidebarGroupInfo(groupId: string): SidebarGroup | undefined {
  return sidebarGroups.get(groupId);
}

/**
 * List all sidebar groups created by the agent
 */
export function listSidebarGroups(): SidebarGroup[] {
  return Array.from(sidebarGroups.values());
}

/**
 * Clean up expired invitations (call periodically)
 */
export function cleanupExpiredInvitations(maxAgeHours: number = 24): void {
  const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
  
  for (const [key, invitation] of pendingInvitations.entries()) {
    const groupData = sidebarGroups.get(invitation.groupId);
    if (groupData && groupData.createdAt < cutoffTime) {
      pendingInvitations.delete(key);
    }
  }
  
  console.log(`🧹 Cleaned up expired sidebar group invitations`);
}

export default {
  handleSidebarRequest,
  joinSidebarGroup,
  declineSidebarGroup,
  parseSidebarCommand,
  isSidebarRequest,
  getSidebarGroupInfo,
  listSidebarGroups,
  cleanupExpiredInvitations,
  setSidebarClient
};
