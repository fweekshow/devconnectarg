import { Agent } from "@xmtp/agent-sdk";

import { GroupAdapter, UserAdapter } from "@/adapters";
import { AIAgent } from "@/agent";
import { ENV } from "@/config";
import { isMentioned, removeMention } from "@/utils/mentions";
import { ConversationMemoryService } from "@/services/conversation-memory";
import {
  ActionsContent,
  ContentTypeActions,
} from "@/services/xmtp/xmtp-inline-actions/types";

import { ICallbackHandler } from "../interfaces";
import { CallbackServices } from "../callbackServices.type";

export class TextCallbackHandler implements ICallbackHandler {
  private aiAgent: AIAgent | null = null;
  constructor(
    private agent: Agent,
    private services: CallbackServices[]
  ) {
    this.aiAgent = new AIAgent();
  }
  public getAIAgent(): AIAgent {
    if (!this.aiAgent) throw Error("AI Agent is not initialized");
    return this.aiAgent;
  }
  registerCallback(): void {
    this.agent.on("text", async (ctx) => {
      const DEBUG_LOGS = ENV.DEBUG_LOGS;
      try {
        const messageContent = ctx.message.content as string;
        const senderInboxId = ctx.message.senderInboxId;
        const conversationId = ctx.conversation.id;
        const isGroup = ctx.isGroup();

        if (DEBUG_LOGS) {
          console.log(`📥 Received message:`, {
            id: ctx.message.id,
            senderInboxId,
            conversationId,
            content: messageContent,
            isGroup,
          });
        }

        console.log("🔍 Message content: ****", messageContent);

        const exists = await GroupAdapter.checkGroupExists(conversationId);
        if (isGroup && !exists) {
          await GroupAdapter.insertGroupDetails({
            groupId: conversationId,
            groupName: ctx.conversation.name,
            groupType: "activity",
            createdBy: await ctx.getSenderAddress(),
            memberCount: (await ctx.conversation.members()).length,
            description: `Activity group for ${ctx.conversation.name}`,
            originalGroupId: conversationId,
            totalMessages: 0,
            totalMentionedMessages: 0,
            totalLeaves: 0,
            metadata: {},
          });
        }

        // Skip messages from ourselves
        if (senderInboxId === this.agent.client.inboxId) {
          if (DEBUG_LOGS) {
            console.log("⏭️ Skipping own message");
          }
          return;
        }

        let cleanContent = messageContent;

        // Check if we should respond to this message
        // In groups: ONLY respond if mentioned
        // In DMs: Always respond
        if (isGroup && !isMentioned(messageContent)) {
          await GroupAdapter.incrementGroupMessage(conversationId);
          if (DEBUG_LOGS) {
            console.log("⏭️ Not mentioned in group, skipping");
          }
          return; // Exit early - don't process or send reactions
        }

        // Clean mentions from group messages
        if (isGroup && isMentioned(messageContent)) {
          ctx.sendReaction("👀");
          await GroupAdapter.incrementGroupMentionedMessage(conversationId);
          cleanContent = removeMention(messageContent);
          if (DEBUG_LOGS) {
            console.log("👋 Mentioned in group, will respond");
          }
        } else if (!isGroup) {
          ctx.sendReaction("👀");
          if (DEBUG_LOGS) {
            console.log("💬 DM received, will respond");
          }
        }

        // Get sender address for context
        let senderAddress = "";
        if (ENV.SHOW_SENDER_ADDRESS) {
          try {
            senderAddress = senderInboxId;
          } catch (error) {
            console.warn("⚠️ Could not get sender address:", error);
          }
        }

        console.log(`🤖 Processing message: "${cleanContent}"`);

        senderAddress = (await ctx.getSenderAddress()) || "";
        await UserAdapter.incrementMessageCount({
          inboxId: senderInboxId,
          walletAddress: senderAddress,
        });

        for (const service of this.services) {
          await service.handleTextCallback(ctx, cleanContent);
        }

        // Get conversation context for this user

        const conversationContext =
          ConversationMemoryService.getContext(senderInboxId);
        const messageWithContext = conversationContext + cleanContent;

        // Generate AI response
        const response = await this.getAIAgent().run(
          messageWithContext,
          senderInboxId,
          conversationId,
          isGroup,
          senderAddress
        );

        if (response) {
          // Log the agent's response
          console.log(`🤖 Agent Response: "${response}"`);
          console.log(`🔍 Response length: ${response.length} chars`);

          // Check if AI is responding to a greeting or giving a generic "how can I help" response
          const lowerResponse = response.toLowerCase();
          const hasSchedule = response.includes("Schedule");
          const hasWifi = response.includes("Wifi");
          const hasLogistics = response.includes("Event Logistics");

          // Detect generic greeting responses that should use ShowMenu tool instead
          const isGenericGreeting =
            (lowerResponse.includes("how can i assist") ||
              lowerResponse.includes("how can i help") ||
              lowerResponse.includes("what can i help") ||
              lowerResponse.includes("let me know")) &&
            response.length < 250; // Short generic response

          console.log(
            `🔍 Menu detection - Schedule: ${hasSchedule}, Wifi: ${hasWifi}, Logistics: ${hasLogistics}, GenericGreeting: ${isGenericGreeting}`
          );

          const isListingMenu =
            (hasSchedule && hasWifi && hasLogistics) || isGenericGreeting;

          if (isListingMenu) {
            console.warn(
              "⚠️ AI tried to list menu in text instead of using ShowMenu tool!"
            );
            console.log(
              "🔄 Sending menu Quick Actions WITHOUT followup wrapper..."
            );

            // Send the menu Quick Actions directly - NO "is there anything else" wrapper
            const menuActionsContent: ActionsContent = {
              id: "devconnect_welcome_actions",
              description:
                "Hi! I'm Rocky, your event buddy at DevConnect. Here's what I can help you with:",
              actions: [
                {
                  id: "schedule",
                  label: "Schedule",
                  imageUrl:
                    "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760465562/ChatGPT_Image_Oct_14_2025_at_03_12_20_PM_p7jhdx.png",
                  style: "primary",
                },
                {
                  id: "wifi",
                  label: "Wifi",
                  imageUrl:
                    "https://res.cloudinary.com/dg5qvbxjp/image/upload/c_crop,w_1100,h_1100/v1760465369/vecteezy_simple-wifi-icon_8014226-1_jicvnk.jpg",
                  style: "secondary",
                },
                {
                  id: "event_logistics",
                  label: "Event Logistics",
                  imageUrl:
                    "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760464845/checklist_gd3rpo.png",
                  style: "secondary",
                },
                {
                  id: "join_base_group",
                  label: "Base Group",
                  imageUrl:
                    "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760466568/base_s5smwn.png",
                  style: "secondary",
                },
                // { id: "join_eth_group", label: "ETH Group", imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760463829/Ethereum_Foundation_Logo_Vector_xddxiu.svg", style: "secondary" },
                {
                  id: "join_xmtp_group",
                  label: "XMTP Group",
                  imageUrl:
                    "https://d392zik6ho62y0.cloudfront.net/images/xmtp-logo.png",
                  style: "secondary",
                },
                {
                  id: "join_groups",
                  label: "More Groups",
                  imageUrl:
                    "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760464996/vecteezy_join-group-icon-in-trendy-outline-style-isolated-on-white_32201148_mkmtik.jpg",
                  style: "secondary",
                },
                {
                  id: "treasure_hunt",
                  label: "Treasure Hunt",
                  imageUrl:
                    "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760561042/ChatGPT_Image_Oct_15_2025_at_05_43_44_PM_wwnxiq.png",
                  style: "secondary",
                },
              ],
            };

            const menuConversation =
              await ctx.client.conversations.getConversationById(
                conversationId
              );
            if (menuConversation) {
              await (menuConversation as any).send(
                menuActionsContent,
                ContentTypeActions
              );
              console.log(`✅ Sent Quick Actions menu directly (no followup)`);
            }

            ConversationMemoryService.add(
              senderInboxId,
              cleanContent,
              "Menu shown via Quick Actions"
            );
            return; // Exit early - menu sent, don't add followup
          }

          // Check if this is a Quick Actions response from ShowMenu tool
          if (response.includes('"contentType":"coinbase.com/actions:1.0"')) {
            try {
              const quickActionsData = JSON.parse(response);
              const actionsContent = quickActionsData.content;

              const quickActionsConversation =
                await ctx.client.conversations.getConversationById(
                  conversationId
                );
              if (quickActionsConversation) {
                await quickActionsConversation.send(
                  actionsContent,
                  ContentTypeActions
                );
                console.log(`✅ Sent Quick Actions response`);
              }

              ConversationMemoryService.add(
                senderInboxId,
                cleanContent,
                "Quick Actions response sent"
              );
            } catch (quickActionsError) {
              console.error(
                "❌ Error sending Quick Actions:",
                quickActionsError
              );
              await ctx.sendText(
                "Hi! I'm the DevConnect 2025 Concierge. I can help you with the Schedule, Set Reminders, Event Info, Join Groups, and Sponsored Slot information. What would you like to know?"
              );
            }
          } else {
            // Regular text response with follow-up actions
            const followupActionsContent: ActionsContent = {
              id: "response_followup_actions",
              description: `${response}
        
        Is there anything else I can help with?`,
              actions: [
                {
                  id: "show_main_menu",
                  label: "✅ Yes",
                  style: "primary",
                },
                {
                  id: "end_conversation",
                  label: "❌ No",
                  style: "secondary",
                },
              ],
            };

            const followupConversation =
              await ctx.client.conversations.getConversationById(
                conversationId
              );
            if (followupConversation) {
              await (followupConversation as any).send(
                followupActionsContent,
                ContentTypeActions
              );
              console.log(`✅ Sent response with follow-up actions`);
            }

            ConversationMemoryService.add(
              senderInboxId,
              cleanContent,
              response
            );
          }
        }
      } catch (err) {
        console.error("❌ Error processing message:", err);
      }
    });
  }
}
