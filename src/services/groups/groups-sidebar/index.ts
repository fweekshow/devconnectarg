import { MessageContext } from "@xmtp/agent-sdk";
import type { DecodedMessage, Conversation, Client } from "@xmtp/node-sdk";
import {
  ActionsContent,
  ContentTypeActions,
} from "@/services/xmtp/xmtp-inline-actions/types";

import { GroupAdapter } from "@/adapters";
import { ENV } from "@/config";
import { BANKR_INBOX_ID, DEFAULT_GROUP_MEMBER_COUNT } from "@/constants";
import { XMTPServiceBase } from "@/services/xmtpServiceBase";
import { PendingInvitation, SidebarGroup } from "./interfaces";

export class SidebarGroupsService extends XMTPServiceBase {
  private sidebarGroups = new Map<string, SidebarGroup>();
  private pendingInvitations = new Map<string, PendingInvitation>();

  constructor(client: Client<any>) {
    super(client);
  }

  async handleSidebarRequest(
    groupName: string,
    originalMessage: DecodedMessage,
    originalConversation: Conversation,
    senderAddress: string
  ): Promise<string> {
    try {
      const requesterInboxId = originalMessage.senderInboxId;
      const originalGroupId = originalMessage.conversationId;

      console.log(
        `🎯 Creating sidebar group "${groupName}" requested by ${requesterInboxId}`
      );

      // Step 1: Create XMTP group with requester and agent as initial members
      const sidebarGroup = await this.client!.conversations.newGroup([
        requesterInboxId,
      ]);

      console.log(`✅ Created sidebar group: ${sidebarGroup.id}`);

      // Step 1.5: Automatically add bankr to all sidebar groups
      try {
        await (sidebarGroup as any).addMembers([BANKR_INBOX_ID]);
        console.log(`✅ Added bankr to sidebar group: ${BANKR_INBOX_ID}`);
      } catch (bankrError: any) {
        console.log(
          `⚠️ Could not add bankr to sidebar group: ${bankrError.message}`
        );
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
        members: [requesterInboxId, BANKR_INBOX_ID], // Agent and bankr are automatically included
      };

      this.sidebarGroups.set(sidebarGroup.id, sidebarGroupData);

      // Step 4: Make the requester a super admin of the group they created
      try {
        await (sidebarGroup as any).addSuperAdmin(requesterInboxId);
        console.log(
          `✅ Made ${requesterInboxId} a super admin of the sidebar group`
        );
      } catch (adminError: any) {
        console.log(`⚠️ Could not make requester admin: ${adminError.message}`);
        // Continue anyway - the group still works, just without admin privileges
      }

      // Step 5: Send welcome message to the sidebar group
      await sidebarGroup.send(
        `🎯 Welcome to "${groupName}"!\n\nThis is a sidebar conversation from the main group. You are now a group admin and can manage this space for focused discussions.`
      );

      // Step 6: Pause briefly to ensure group is properly set up
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 7: Send invitation quick actions with agent-specific namespacing
      const agentId = this.client!.inboxId.slice(0, 8); // Use first 8 chars of inbox ID as unique identifier

      await GroupAdapter.insertGroupDetails({
        groupId: sidebarGroup.id,
        groupName: groupName,
        groupType: "sidebar",
        createdBy: senderAddress,
        memberCount: DEFAULT_GROUP_MEMBER_COUNT, // requester + bankr + agent
        description: `Sidebar group for ${groupName}`,
        originalGroupId: originalGroupId,
        totalMessages: 0,
        totalMentionedMessages: 0,
        totalLeaves: 0,
        metadata: {},
      });

      const invitationActions: ActionsContent = {
        id: `devconnect_827491_${agentId}_sidebar_invite_${sidebarGroup.id}`,
        description: `🎯 "${groupName}" sidebar group created! Would you like to join this focused discussion?`,
        actions: [
          {
            id: `devconnect_827491_${agentId}_join_sidebar_${sidebarGroup.id}`,
            label: "✅ Yes, Join",
            style: "primary",
          },
          {
            id: `devconnect_827491_${agentId}_decline_sidebar_${sidebarGroup.id}`,
            label: "❌ No Thanks",
            style: "secondary",
          },
        ],
      };

      // Send invitation to original group conversation
      await (originalConversation as any).send(
        invitationActions,
        ContentTypeActions
      );
      console.log(
        `📤 Sent sidebar group invitation to original group conversation`
      );

      // Step 8: Return a simple confirmation (no additional message needed)
      return ""; // Don't send a separate confirmation message
    } catch (error: any) {
      console.error("❌ Error creating sidebar group:", error);
      return `❌ Failed to create sidebar group "${groupName}". Please try again later.\n\nError: ${error.message}`;
    }
  }

  async joinSidebarGroup(
    groupId: string,
    userInboxId: string
  ): Promise<string> {
    try {
      // Since we send invitations to the group conversation, we don't need to check
      // for individual invitations - anyone who sees the quick actions can join

      // Get sidebar group info
      const sidebarGroupData = this.sidebarGroups.get(groupId);
      if (!sidebarGroupData) {
        return "❌ Sidebar group not found.";
      }

      console.log(
        `🎯 Adding user ${userInboxId} to sidebar group "${sidebarGroupData.name}"`
      );

      // Sync conversations to get latest state
      await this.client!.conversations.sync();
      const allConversations = await this.client!.conversations.list();

      // Find the group by exact ID (matching activityGroups pattern)
      const sidebarGroup = allConversations.find((conv) => conv.id === groupId);

      if (!sidebarGroup) {
        console.log(
          `❌ Sidebar group (${groupId}) not found in agent's conversations`
        );
        return `❌ Could not find sidebar group. Please contact support.`;
      }

      console.log(`✅ Found sidebar group: ${sidebarGroup.id}`);
      console.log(`   Name: ${sidebarGroupData.name}`);

      // Add user to the group using the same pattern as activityGroups
      try {
        await (sidebarGroup as any).addMembers([userInboxId]);
        console.log(
          `✅ Successfully added user to sidebar group "${sidebarGroupData.name}"`
        );
      } catch (addError: any) {
        console.log(`❌ Error adding to sidebar group: ${addError.message}`);

        if (
          addError.message?.includes("already") ||
          addError.message?.includes("duplicate")
        ) {
          console.log(`ℹ️ User was already in sidebar group`);
          return `ℹ️ You're already in "${sidebarGroupData.name}"! Check your group conversations to find it.`;
        } else if (
          addError.message?.includes("Failed to verify all installations") ||
          addError.code === "GenericFailure"
        ) {
          console.log(
            `⚠️ Installation verification failed for sidebar group - temporary XMTP network issue`
          );
          return `⚠️ There's a temporary network issue preventing group access right now. 
  
  Please try joining "${sidebarGroupData.name}" again in a few minutes, or contact support if the issue persists.
  
  The sidebar group is available and you can try again later!`;
        } else {
          console.log(`❌ Unknown error for sidebar group:`, addError);
          return `❌ Failed to add you to "${sidebarGroupData.name}". Error: ${addError.message || "Unknown error"}. Please contact support.`;
        }
      }

      // Update our records
      sidebarGroupData.members.push(userInboxId);
      this.sidebarGroups.set(groupId, sidebarGroupData);

      // Get the user's display name (basename or address)
      const userDisplayName = await this.getSenderIdentifier(userInboxId);

      // Send a welcome message to help the user identify the group
      await sidebarGroup.send(
        `🎉 ${userDisplayName} joined the "${sidebarGroupData.name}" sidebar discussion!`
      );

      return `✅ Great! You're now in "${sidebarGroupData.name}" sidebar group.
  
  You'll receive messages and can participate in this focused discussion!`;
    } catch (error: any) {
      console.error("❌ Error joining sidebar group:", error);
      return `❌ Failed to join sidebar group. Please contact support or try again later.`;
    }
  }

  async declineSidebarGroup(
    groupId: string,
    userInboxId: string
  ): Promise<string> {
    try {
      const sidebarGroupData = this.sidebarGroups.get(groupId);
      const groupName = sidebarGroupData?.name || "sidebar group";

      console.log(
        `📝 ${userInboxId} declined to join sidebar group "${groupName}"`
      );

      return `✅ You've declined to join "${groupName}". No worries!`;
    } catch (error: any) {
      console.error("❌ Error declining sidebar group:", error);
      return "✅ Invitation declined.";
    }
  }

  parseSidebarCommand(content: string): string | null {
    const trimmedContent = content.trim();
    // Try with @devconnectarg.base.eth prefix first (full basename)
    let sidebarMatch = trimmedContent.match(
      /@devconnectarg\.base\.eth sidebar (?:this (?:conversation )?)?(.+)/i
    );
    if (sidebarMatch) {
      return sidebarMatch[1].trim();
    }

    // Try with @devconnectarg prefix (short version)
    sidebarMatch = trimmedContent.match(
      /@devconnectarg sidebar (?:this (?:conversation )?)?(.+)/i
    );
    if (sidebarMatch) {
      return sidebarMatch[1].trim();
    }

    // Try with .base.eth sidebar (cleaned content after mention removal)
    sidebarMatch = trimmedContent.match(
      /\.base\.eth sidebar (?:this (?:conversation )?)?(.+)/i
    );
    if (sidebarMatch) {
      return sidebarMatch[1].trim();
    }

    // Try without any prefix (for cleaned content from groups) - more flexible with whitespace
    sidebarMatch = trimmedContent.match(
      /^sidebar\s+(?:this\s+(?:conversation\s+)?)?(.+)/i
    );
    return sidebarMatch ? sidebarMatch[1].trim() : null;
  }

  isSidebarRequest(content: string): boolean {
    const lowerContent = content.toLowerCase().trim();
    const handles = ENV.MENTION_HANDLES.split(",").map((h) => h.trim());
    const mentionMatches = handles.some(
      (handle) =>
        lowerContent.includes(`@${handle} sidebar`) ||
        lowerContent.includes(`${handle} sidebar`)
    );
    return (
      mentionMatches ||
      lowerContent.includes(".base.eth sidebar") ||
      lowerContent.startsWith("sidebar") ||
      /^sidebar\s+/i.test(lowerContent)
    );
  }

  getSidebarGroupInfo(groupId: string): SidebarGroup | undefined {
    return this.sidebarGroups.get(groupId);
  }

  listSidebarGroups(): SidebarGroup[] {
    return Array.from(this.sidebarGroups.values());
  }

  cleanupExpiredInvitations(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    for (const [key, invitation] of this.pendingInvitations.entries()) {
      const groupData = this.sidebarGroups.get(invitation.groupId);
      if (groupData && groupData.createdAt < cutoffTime) {
        this.pendingInvitations.delete(key);
      }
    }

    console.log(`🧹 Cleaned up expired sidebar group invitations`);
  }

  async handleTextCallback(
    ctx: MessageContext<string>,
    cleanContent: string
  ): Promise<boolean> {
    try {
      const isGroup = ctx.isGroup();
      if (isGroup && this.isSidebarRequest(cleanContent)) {
        const groupName = this.parseSidebarCommand(cleanContent);
        let senderAddress = (await ctx.getSenderAddress()) || "";
        if (groupName) {
          const sidebarResponse = await this.handleSidebarRequest(
            groupName,
            ctx.message,
            ctx.conversation,
            senderAddress
          );
          if (sidebarResponse && sidebarResponse.trim() !== "") {
            await ctx.sendText(sidebarResponse);
          }
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Error in sidebar group text callback");
      await ctx.sendText(
        "Sorry, I encountered an error while processing your request. Please try again later."
      );
      return true;
    }
  }

  async handleIntentCallback(
    ctx: MessageContext<unknown>,
    actionId: any
  ): Promise<boolean> {
    try {
      // Handle sidebar group actions with dynamic IDs
      const agentId = ctx.client.inboxId.slice(0, 8);
      if (actionId.startsWith(`devconnect_827491_${agentId}_join_sidebar_`)) {
        const groupId = actionId.replace(
          `devconnect_827491_${agentId}_join_sidebar_`,
          ""
        );
        console.log(`🎯 User joining sidebar group: ${groupId}`);
        const joinResult = await this.joinSidebarGroup(
          groupId,
          ctx.message.senderInboxId
        );
        await ctx.sendText(joinResult);
        return true;
      }

      if (
        actionId.startsWith(`devconnect_827491_${agentId}_decline_sidebar_`)
      ) {
        const groupId = actionId.replace(
          `devconnect_827491_${agentId}_decline_sidebar_`,
          ""
        );
        console.log(`🎯 User declining sidebar group: ${groupId}`);

        const declineResult = await this.declineSidebarGroup(
          groupId,
          ctx.message.senderInboxId
        );
        await ctx.sendText(declineResult);
        return true;
      }

      await ctx.sendText("Thanks for your selection!");
      return true;
    } catch (err) {
      console.error("Error in activity group intent callback");
      await ctx.sendText(
        "Sorry, I encountered an error while processing your request. Please try again later."
      );
      return true;
    }
  }
}
