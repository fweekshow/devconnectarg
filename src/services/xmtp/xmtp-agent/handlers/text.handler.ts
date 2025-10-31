import { Agent } from "@xmtp/agent-sdk";

import { GroupAdapter, UserAdapter } from "@/adapters/index.js";
import { AIAgent } from "@/agent/index.js";
import { ENV } from "@/config/index.js";
import { isMentioned, removeMention } from "@/utils/mentions.js";
import { ConversationMemoryService } from "@/services/conversation-memory/index.js";
import {
  ActionsContent,
  ContentTypeActions,
} from "@/services/xmtp/xmtp-inline-actions/types/index.js";

import { ICallbackHandler } from "../interfaces/index.js";
import { CallbackServices } from "../callbackServices.type.js";
import { DynamicGroupsService } from "@/services/groups/groups-dynamic/index.js";
import { generateMenuForContext } from "../utils/menuGenerator.js";

export class TextCallbackHandler implements ICallbackHandler {
  private aiAgent: AIAgent | null = null;
  private dynamicGroupsService: DynamicGroupsService;

  constructor(
    private agent: Agent,
    private services: CallbackServices[]
  ) {
    this.aiAgent = new AIAgent();

    const dynamicService = services.find(
      (s): s is DynamicGroupsService => s instanceof DynamicGroupsService
    );

    if (!dynamicService) {
      throw new Error("DynamicGroupsService not found in provided services");
    }

    this.dynamicGroupsService = dynamicService;
    this.services = services.filter(
      (s) => !(s instanceof DynamicGroupsService)
    );
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

        // Always log conversation info for debugging
        console.log(`\n${"=".repeat(80)}`);
        console.log(`📨 NEW MESSAGE RECEIVED`);
        console.log(`   Conversation ID: ${conversationId}`);
        console.log(`   Type: ${isGroup ? "GROUP" : "DM"}`);
        console.log(`   Group Name: ${(ctx.conversation as any).name || "N/A"}`);
        console.log(`   Sender: ${senderInboxId.substring(0, 12)}...`);
        console.log(`   Content: "${messageContent}"`);
        console.log(`${"=".repeat(80)}\n`);

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
        let callbackHandled = false;
        for (const service of this.services) {
          callbackHandled = await service.handleTextCallback(ctx, cleanContent);
          if (callbackHandled) return;
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
          const GENERIC_MESSAGE_DETECTION_PROMPT = `You are a message classifier for a chatbot system. Your task is to determine if the chatbot's response is GENERIC (just a greeting/offer to help) or SPECIFIC (actual useful information).

A response is GENERIC if it:
- Is just introducing itself ("Hi! I'm Rocky", "I'm your event buddy")
- Only offers to help without providing info ("How can I help?", "What can I do for you?", "Let me know", "I'm here to assist")
- Is a plain greeting response ("Hello!", "Hey there!", "Hi!")
- Lists what it CAN do but doesn't actually DO anything
- Contains phrases like: "How can I help", "What would you like to know", "I'm here to help", "Here's what I can help with"
- Does NOT contain specific event information, schedules, dates, or actionable content
- Is under 300 characters and lacks substance

A response is SPECIFIC if it:
- Provides actual schedule information, event details, dates, times, or locations
- Answers a question with real data
- Contains URLs, event names, or detailed information
- Takes a specific action (sets reminder, joins group, etc.)
- Has meaningful content beyond just offering help

Examples of GENERIC responses:
- "Hi! I'm Rocky, your DevConnect concierge. How can I help you today?"
- "Hello! What can I do for you?"
- "I'm here to assist with schedule, wifi, and more. What would you like to know?"

Examples of SPECIFIC responses:
- "ETH Day is on Monday, November 17, 2025 at La Rural"
- "I've set a reminder for tomorrow at 3pm"
- "The wifi password is devconnect2025"

Return ONLY one word:
"YES" if the response is GENERIC (should show menu instead)
"NO" if the response is SPECIFIC (keep it as-is)

Response to classify: ${response}
`;
          const isGeneric = await this.aiAgent?.runWithPromt(
            GENERIC_MESSAGE_DETECTION_PROMPT
          );

          if (isGeneric?.toLowerCase().includes("yes")) {
            console.warn(
              "⚠️ AI tried to list menu in text instead of using ShowMenu tool!"
            );
            console.log(
              "🔄 Sending menu Quick Actions WITHOUT followup wrapper..."
            );

            // Send the menu Quick Actions directly - NO "is there anything else" wrapper
            // Generate menu based on context (treasure hunt group vs other)
            const menuActionsContent = generateMenuForContext(conversationId);

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
              // Generate context-aware menu (treasure hunt group gets custom menu)
              const actionsContent = generateMenuForContext(conversationId);

              const quickActionsConversation =
                await ctx.client.conversations.getConversationById(
                  conversationId
                );
              if (quickActionsConversation) {
                await (quickActionsConversation as any).send(
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
            // Check if response contains URLs - if so, we need to send text and actions separately
            const containsUrl =
              response.includes("http://") || response.includes("https://");

            if (containsUrl) {
              console.log(
                `🔗 Response contains URL - sending text and actions separately`
              );

              // Send the response text first (with the URL)
              await ctx.sendText(response);

              // Check for relevant dynamic group
              console.log(`🔍 Checking for relevant dynamic group...`);
              const relevantGroup =
                await this.dynamicGroupsService.detectRelevantGroup(
                  cleanContent,
                  response
                );

              // Send follow-up actions separately
              const followupConversation =
                await ctx.client.conversations.getConversationById(
                  conversationId
                );

              if (followupConversation) {
                let followupActionsContent: ActionsContent;

                if (relevantGroup) {
                  // Show group join action
                  console.log(`🎯 Relevant group detected: ${relevantGroup}`);
                  followupActionsContent =
                    this.dynamicGroupsService.generateGroupJoinActions(
                      relevantGroup
                    );
                } else {
                  // Show generic followup
                  console.log(
                    `📝 No relevant group - showing generic followup`
                  );
                  followupActionsContent = {
                    id: "response_followup_actions",
                    description: "Is there anything else I can help with?",
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
                }

                await (followupConversation as any).send(
                  followupActionsContent,
                  ContentTypeActions
                );
                console.log(
                  `✅ Sent response text and ${relevantGroup ? "group join" : "generic"} follow-up actions separately`
                );
              }
            } else {
              // No URL - can send response and actions together
              console.log(`📝 No URL in response - sending combined message`);

              // Check if there's a relevant dynamic group for this conversation
              console.log(`🔍 Checking for relevant dynamic group...`);
              const relevantGroup =
                await this.dynamicGroupsService.detectRelevantGroup(
                  cleanContent,
                  response
                );

              let followupActionsContent: ActionsContent;

              if (relevantGroup) {
                // Show group join action instead of generic followup
                console.log(`🎯 Relevant group detected: ${relevantGroup}`);
                followupActionsContent = {
                  ...this.dynamicGroupsService.generateGroupJoinActions(
                    relevantGroup
                  ),
                  description: `${response}

${this.dynamicGroupsService.generateGroupJoinActions(relevantGroup).description}`,
                };
              } else {
                // No relevant group - show generic followup
                console.log(`📝 No relevant group - showing generic followup`);
                followupActionsContent = {
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
              }

              const followupConversation =
                await ctx.client.conversations.getConversationById(
                  conversationId
                );
              if (followupConversation) {
                await (followupConversation as any).send(
                  followupActionsContent,
                  ContentTypeActions
                );
                console.log(
                  `✅ Sent response with ${relevantGroup ? "group join" : "generic"} follow-up actions`
                );
              }
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
