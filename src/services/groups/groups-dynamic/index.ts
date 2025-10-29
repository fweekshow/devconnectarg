import { MessageContext } from "@xmtp/agent-sdk";
import OpenAI from "openai";
import type { Client } from "@xmtp/node-sdk";

import { DYNAMIC_GROUPS, type DynamicGroupKey } from "@/constants/index.js";
import { XMTPServiceBase } from "@/services/xmtpServiceBase.js";

export class DynamicGroupsService extends XMTPServiceBase {
  constructor(client: Client<any>) {
    super(client);
  }

  /**
   * Handle intent callback for dynamic group joins
   */
  async handleIntentCallback(
    ctx: MessageContext<unknown>,
    actionId: any
  ): Promise<boolean> {
    try {
      // Check if this is a dynamic group join action
      if (actionId && typeof actionId === "string" && actionId.startsWith("join_dynamic_group_")) {
        const groupKey = actionId.replace("join_dynamic_group_", "") as DynamicGroupKey;
        
        if (groupKey in DYNAMIC_GROUPS) {
          console.log(`🎯 Handling dynamic group join for: ${groupKey}`);
          
          const result = await this.joinDynamicGroup(
            groupKey,
            ctx.message.senderInboxId
          );
          
          await ctx.sendText(result);
          return true;
        }
      }
      
      return false;
    } catch (err) {
      console.error("❌ Error in dynamic group intent callback:", err);
      return false;
    }
  }

  /**
   * Use AI to detect if the user's query and agent response relate to any dynamic group topics
   * Returns the group key if relevant, null otherwise
   */
  async detectRelevantGroup(
    userQuery: string,
    agentResponse: string
  ): Promise<DynamicGroupKey | null> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn("⚠️ No OpenAI API key for dynamic group detection");
        return null;
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const groupOptions = Object.entries(DYNAMIC_GROUPS)
        .map(
          ([key, config]) =>
            `${key}: ${config.friendlyName} (${config.keywords.join(", ")})`
        )
        .join("\n");

      const detectionPrompt = `Analyze if this conversation relates to a specific community interest group the user might want to join.

Available groups:
${groupOptions}

User Query: "${userQuery}"
Agent Response: "${agentResponse}"

RULES:
1. Suggest a group if the query is about a TOPIC/THEME that matches a group
2. Look at the CONTENT and SUBJECT MATTER, not just generic event names
3. If asking about an event/workshop that matches a group's theme, suggest that group
4. DO NOT suggest for completely generic schedule questions

TOPIC MATCHING (suggest if query relates to these themes):
- Questions about Base/Coinbase/Onchain/Base ecosystem → "base"
- Questions about XMTP/messaging protocols → "xmtp"
- Questions about soccer/futbol/pickup games → "futbol"
- Questions about running/jogging/fitness → "running"
- Questions about DeFi/protocols/yield/lending → "defi"
- Questions about content creation/creators/media → "creators"
- Questions about networking/career/business → "networking"
- Questions about startups/VCs/funding/investors → "startups"
- Questions about AI/agents/chatbots/LLMs/machine learning → "rocky_community"
- Questions about parties/social events/after parties/nightlife → "side_events"

YES - SHOULD MATCH:
- "When is the agents workshop?" → rocky_community (asking about AI/agents topic)
- "What time is the Base event?" → base (asking about Base topic)
- "Any DeFi talks today?" → defi (asking about DeFi topic)
- "Looking for pickup soccer" → futbol (asking about soccer)
- "Any after parties tonight?" → side_events (asking about parties)
- "When's the XMTP session?" → xmtp (asking about XMTP)

NO - SHOULD BE NONE:
- "When is Builder Nights?" → NONE (generic event, no specific topic theme)
- "What's happening Monday?" → NONE (general schedule)
- "Tell me about ETH Day" → NONE (generic Ethereum event)
- "When is Staking Summit?" → NONE (staking not in our groups)

Key: If the query mentions a SPECIFIC TOPIC that matches a group theme (even in a schedule question), suggest that group.

Respond with ONLY the group key OR "NONE":`;


      console.log(
        `🔍 Detecting relevant dynamic group for query: "${userQuery.slice(0, 100)}..."`
      );

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: detectionPrompt }],
        max_tokens: 20,
        temperature: 0, // Zero temperature for most consistent results
      });

      const detectedTopic = completion.choices[0].message.content
        ?.trim()
        .toLowerCase();

      console.log(`🤖 AI detection result: "${detectedTopic}"`);

      if (
        detectedTopic &&
        detectedTopic !== "none" &&
        detectedTopic in DYNAMIC_GROUPS
      ) {
        console.log(`✅ Detected relevant dynamic group: ${detectedTopic}`);
        return detectedTopic as DynamicGroupKey;
      }

      console.log(`❌ No relevant dynamic group detected`);
      return null;
    } catch (error) {
      console.error("❌ Error detecting relevant dynamic group:", error);
      return null;
    }
  }

  /**
   * Generate Quick Actions for joining a specific dynamic group
   */
  generateGroupJoinActions(group: DynamicGroupKey) {
    const groupConfig = DYNAMIC_GROUPS[group];

    return {
      id: `dynamic_group_${group}_join`,
      description: `Would you like to join the ${groupConfig.friendlyName} group chat?

${groupConfig.description}`,
      actions: [
        {
          id: `join_dynamic_group_${group}`,
          label: `✅ Yes, Add Me`,
          style: "primary" as const,
        },
        {
          id: "end_conversation",
          label: "❌ No Thanks",
          style: "secondary" as const,
        },
      ],
    };
  }

  /**
   * Handle joining a dynamic group
   */
  async joinDynamicGroup(
    group: DynamicGroupKey,
    userInboxId: string
  ): Promise<string> {
    try {
      const groupConfig = DYNAMIC_GROUPS[group];
      console.log(
        `🎯 Adding user ${userInboxId} to ${groupConfig.friendlyName} dynamic group`
      );

      // Sync conversations to ensure we have the latest state
      await this.client.conversations.sync();
      const allConversations = await this.client.conversations.list();

      // Find the group by name
      const foundGroup = allConversations.find((conv: any) => {
        const details = conv as any;
        return details.name === groupConfig.groupName;
      });

      if (!foundGroup) {
        console.log(
          `❌ ${groupConfig.groupName} group not found in agent's conversations`
        );
        console.log(`🔍 Available groups:`);
        allConversations
          .filter((c: any) => c.constructor.name === "Group")
          .forEach((conv: any) => {
            const details = conv as any;
            console.log(`  - ${conv.id}: ${details.name || "No name"}`);
          });

        // Group doesn't exist yet - provide helpful message
        return `🚧 The ${groupConfig.friendlyName} group is coming soon!

I detected you're interested in ${groupConfig.description.toLowerCase()}. The ${groupConfig.friendlyName} community group will be available during DevConnect.

For now, you can:
• Check the main menu for related groups
• Ask me about ${group}-related events in the schedule
• Join existing activity groups through the "More Groups" option

Thanks for your interest - the group will be live soon! 🎉`;
      }

      console.log(`✅ Found ${groupConfig.groupName} group: ${foundGroup.id}`);

      try {
        // Add the member to the group using XMTP method
        await (foundGroup as any).addMembers([userInboxId]);
        console.log(
          `✅ Successfully added user to ${groupConfig.groupName} group`
        );

        return `✅ Great! You've been added to the ${groupConfig.friendlyName} group chat.

You'll receive messages and can participate in discussions about ${groupConfig.description.toLowerCase()}!`;
      } catch (addError: any) {
        console.log(
          `❌ Error adding to ${groupConfig.groupName}: ${addError.message}`
        );

        if (
          addError.message?.includes("already") ||
          addError.message?.includes("duplicate")
        ) {
          return `✅ You're already in the ${groupConfig.friendlyName} group! You can participate in community discussions.`;
        } else if (
          addError.message?.includes("Failed to verify all installations") ||
          addError.code === "GenericFailure"
        ) {
          return `✅ You're already in the ${groupConfig.friendlyName} group! You can participate in community discussions.`;
        } else {
          console.log(
            `❌ Unknown error for ${groupConfig.groupName}:`,
            addError
          );
          return `❌ Failed to add you to the ${groupConfig.friendlyName} group. Error: ${addError.message || "Unknown error"}. Please contact support.`;
        }
      }
    } catch (error: any) {
      console.error(`❌ Error in joinDynamicGroup for ${group}:`, error);
      return "❌ Failed to join the group. Please try again later.";
    }
  }
}

