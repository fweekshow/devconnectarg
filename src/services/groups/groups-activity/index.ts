import { ENV } from "@/config";
import {
  ACTIVITY_GROUP_MAP,
  ACTIVITY_GROUPS,
  ACTIVITY_NAMES,
} from "@/constants";
import { XMTPAgent } from "@/services/xmtp/xmtp-agent";
import { XMTPServiceBase } from "@/services/xmtpServiceBase";

export class ActivityGroupsService extends XMTPServiceBase {
  constructor(xmtpAgent: XMTPAgent) {
    super(xmtpAgent);
  }

  async initializeAgentInGroups(): Promise<void> {
    console.log("🔄 Initializing agent in activity groups...");
    try {
      console.log("🔄 Syncing conversations (aggressive)...");
      await this.client.conversations.sync();

      console.log("🔄 Waiting for installation sync...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log("🔄 Performing final sync before listing...");
      await this.client.conversations.sync();

      console.log("🔄 Fetching conversation list...");
      const allConversations = await this.client.conversations.list();

      console.log(
        `🔍 Agent has access to ${allConversations.length} total conversations`
      );

      for (const [activity, groupId] of Object.entries(ACTIVITY_GROUPS)) {
        try {
          if (ENV.NODE_ENV !== "production") {
            console.log(`🔄 Checking ${activity} group (${groupId})...`);
          }

          const group = allConversations.find((conv) => conv.id === groupId);

          if (group) {
            const groupDetails = group as any;
            if (ENV.NODE_ENV !== "production") {
              console.log(`✅ Found ${activity} group: ${group.id}`);
              console.log(`   Name: ${groupDetails.name || "No name"}`);
              console.log(
                `   Description: ${groupDetails.description || "No description"}`
              );
            }
          } else {
            if (ENV.NODE_ENV !== "production") {
              console.log(`❌ ${activity} group not found!`);
              console.log(`💡 Expected ID: ${groupId}`);
              console.log(
                `💡 Agent address: ${(this.client as any).address || "unknown"}`
              );
            }
          }
        } catch (err) {
          console.log(`❌ Error checking ${activity} group:`, err);
        }
      }

      console.log(
        "✅ Agent initialization in activity groups completed successfully."
      );
    } catch (err) {
      console.error("❌ Failed to initialize agent in activity groups:", err);
    }
  }

  async addMemberToActivityGroup(
    activity: keyof typeof ACTIVITY_GROUPS,
    userInboxId: string
  ): Promise<string> {
    try {
      const groupId = ACTIVITY_GROUPS[activity];
      const activityName = ACTIVITY_NAMES[activity];

      if (!groupId || !activityName) {
        const available = Object.keys(ACTIVITY_GROUPS).join(", ");
        return `❌ Unknown activity "${activity}". Available activities: ${available}`;
      }

      console.log(`🎯 Adding user ${userInboxId} to ${activityName} group`);

      await this.client.conversations.sync();
      await new Promise((r) => setTimeout(r, 1000));
      await this.client.conversations.sync();
      const allConversations = await this.client.conversations.list();

      // Find the group by exact ID or Name
      const group = allConversations.find((conv) => {
        const details = conv as any;
        return conv.id === groupId || details.name === groupId;
      });

      if (!group) {
        console.log(
          `❌ ${activity} group (${groupId}) not found in agent's conversations`
        );
        console.log(`🔍 Available groups:`);
        allConversations
          .filter((c) => c.constructor.name === "Group")
          .forEach((conv) => {
            const details = conv as any;
            console.log(`  - ${conv.id}: ${details.name || "No name"}`);
          });
        return `❌ Could not find ${activityName} group. The agent needs to be added to this group first. Please contact support to add the agent to the ${activityName} group.`;
      }

      console.log(`✅ Found ${activity} group: ${group.id}`);
      console.log(`   Name: ${(group as any).name || "No name"}`);

      // Add the member to the group using the correct XMTP method
      try {
        await (group as any).addMembers([userInboxId]);
        console.log(`✅ Successfully added user to ${activityName} group`);
      } catch (addError: any) {
        console.log(`❌ Error for ${activityName}: ${addError.message}`);

        if (
          addError.message?.includes("already") ||
          addError.message?.includes("duplicate")
        ) {
          console.log(`ℹ️ User was already in ${activityName} group`);
          return `✅ You're already in the ${activityName} group! You can participate in discussions and receive updates.`;
        } else if (
          addError.message?.includes("Failed to verify all installations") ||
          addError.code === "GenericFailure"
        ) {
          console.log(
            `⚠️ Installation verification failed for ${activityName} group - user is already in group`
          );
          return `✅ You're already in the ${activityName} group! You can participate in discussions and receive updates.`;
        } else {
          console.log(`❌ Unknown error for ${activityName} group:`, addError);
          return `❌ Failed to add you to the ${activityName} group. Error: ${addError.message || "Unknown error"}. Please contact support.`;
        }
      }

      return `✅ Great! You're now in the ${activityName} group chat.`;
    } catch (error: any) {
      console.error(`❌ Error adding member to ${activity} group:`, error);
      return `❌ Failed to add you to the ${ACTIVITY_NAMES[activity]} group. Please contact support or try again later.`;
    }
  }

  async addMemberToETHGroup(userInboxId: string): Promise<string> {
    const message = this.addMemberToActivityGroup(
      "eth_devconnect",
      userInboxId
    );
    return message;
  }

  async addMemberToXMTPGroup(userInboxId: string): Promise<string> {
    const message = this.addMemberToActivityGroup(
      "xmtp_devconnect",
      userInboxId
    );
    return message;
  }

  async addMemberToBaseGlobalEvents(userInboxId: string): Promise<string> {
    const message = this.addMemberToActivityGroup(
      "base_devconnect",
      userInboxId
    );
    return message;
  }

  async listAllAgentGroups(): Promise<void> {
    console.log("🔄 Syncing conversations...");
    await this.client.conversations.sync();
    const allConversations = await this.client.conversations.list();

    console.log(`\n📋 All groups the agent has access to:`);
    allConversations
      .filter((c) => c.constructor.name === "Group")
      .forEach((conv) => {
        const details = conv as any;
        console.log(`  - ID: ${conv.id}`);
        console.log(`    Name: ${details.name || "No name"}`);
        console.log(
          `    Description: ${details.description || "No description"}`
        );
        console.log(``);
      });
  }

  getActivityGroupInfo(
    activity: keyof typeof ACTIVITY_GROUPS
  ): { groupId: string; name: string } | null {
    const groupId = ACTIVITY_GROUPS[activity];
    const name = ACTIVITY_NAMES[activity];

    if (!groupId) return null;

    return { groupId, name };
  }

  getAvailableActivities(): string[] {
    return Object.keys(ACTIVITY_GROUPS);
  }

  hasGroupChat(activity: string): boolean {
    return activity.toLowerCase() in ACTIVITY_GROUP_MAP;
  }

  getJoinActionId(activity: string): string | null {
    return (
      ACTIVITY_GROUP_MAP[
        activity.toLowerCase() as keyof typeof ACTIVITY_GROUP_MAP
      ] || null
    );
  }

  generateActivityGroupQuickActions(activity: string, scheduleInfo: string) {
    const normalized = activity.toLowerCase();
    const joinActionId = this.getJoinActionId(normalized);

    if (!joinActionId) {
      return null;
    }

    const displayName =
      normalized.charAt(0).toUpperCase() + normalized.slice(1);

    return {
      id: `${normalized}_group_join`,
      description: `🎯 ${displayName} schedule: ${scheduleInfo}
  
  Would you like me to add you to the ${displayName} @ DevConnect group chat?`,
      actions: [
        {
          id: joinActionId,
          label: "✅ Yes, Add Me",
          style: "primary" as const,
        },
        {
          id: "no_group_join",
          label: "❌ No Thanks",
          style: "secondary" as const,
        },
      ],
    };
  }

  generateGroupSelectionQuickActions() {
    return {
      id: "group_selection_actions",
      description: "👥 Which DevConnect group would you like to join?",
      actions: [
        {
          id: "join_ethcon_argentina",
          label: "🇦🇷 ETHCON Argentina 2025",
          style: "primary" as const,
        },
        {
          id: "join_staking_summit",
          label: "⛰️ Staking Summit",
          style: "primary" as const,
        },
        {
          id: "join_builder_nights",
          label: "🔨 Builder Nights Buenos Aires",
          style: "primary" as const,
        },
      ],
    };
  }
}
