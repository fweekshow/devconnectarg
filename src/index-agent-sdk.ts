import { Agent } from '@xmtp/agent-sdk';
import { createReminderDispatcher } from "./services/agent/tools/reminder/dispatcher.js";
import { isMentioned, removeMention } from "./mentions.js";
import { AIAgent } from "./services/agent/index.js";
import { setBroadcastClient } from "./services/agent/tools/broadcast.js";
import { setGroupClient } from "./services/agent/tools/activityGroups.js";
import { 
  handleSidebarRequest, 
  joinSidebarGroup, 
  declineSidebarGroup,
  parseSidebarCommand,
  isSidebarRequest,
  setSidebarClient
} from "./services/agent/tools/sidebarGroups.js";
import { initDb } from "./store.js";
import {
  DEBUG_LOGS,
  MENTION_HANDLES,
  SHOW_SENDER_ADDRESS,
} from "./config.js";
import { ActionsCodec, type ActionsContent, ContentTypeActions } from "./xmtp-inline-actions/types/ActionsContent.js";
import { IntentCodec, ContentTypeIntent } from "./xmtp-inline-actions/types/IntentContent.js";
import {
  ContentTypeReaction,
  ReactionCodec,
} from "@xmtp/content-type-reaction";

console.log(`🚀 Starting DevConnect 2025 Concierge Agent (Agent SDK)`);

// Initialize database for reminders
initDb();

// Initialize AI agent
const aiAgent = new AIAgent();

// Conversation memory storage (per user)
interface ConversationEntry {
  userMessage: string;
  botResponse: string;
  timestamp: Date;
}

const conversationHistory = new Map<string, ConversationEntry[]>();

// Helper functions for conversation memory
function addToConversationHistory(senderInboxId: string, userMessage: string, botResponse: string) {
  const history = conversationHistory.get(senderInboxId) || [];
  
  history.push({
    userMessage,
    botResponse,
    timestamp: new Date()
  });
  
  // Keep only last 3 exchanges
  if (history.length > 3) {
    history.shift();
  }
  
  conversationHistory.set(senderInboxId, history);
}

function getConversationContext(senderInboxId: string): string {
  const history = conversationHistory.get(senderInboxId) || [];
  
  if (history.length === 0) {
    return "";
  }
  
  let context = "Recent conversation context:\n";
  history.forEach((entry, index) => {
    context += `User: ${entry.userMessage}\nBot: ${entry.botResponse}\n`;
  });
  context += "Current message:\n";
  
  return context;
}

// Clean up old conversations (older than 1 hour)
function cleanupOldConversations() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  for (const [senderInboxId, history] of conversationHistory.entries()) {
    const recentHistory = history.filter(entry => entry.timestamp > oneHourAgo);
    
    if (recentHistory.length === 0) {
      conversationHistory.delete(senderInboxId);
    } else {
      conversationHistory.set(senderInboxId, recentHistory);
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldConversations, 30 * 60 * 1000);

async function main() {
  try {
    // Get and log current date/time for agent context
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    console.log(`📅 Current Date/Time: ${currentDateTime}`);
    console.log(`📅 Agent Context: Today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`);
    
    console.log("🔄 Initializing Agent SDK client...");
    
    // Create agent using Agent SDK
    const agent = await Agent.createFromEnv({
      env: process.env.XMTP_ENV as 'dev' | 'production' || 'production',
      // Custom codecs for Quick Actions and Reactions
      codecs: [new ActionsCodec(), new IntentCodec(), new ReactionCodec()],
    });

    console.log("🔄 Agent SDK client initialized with Quick Actions codecs");
    console.log(`✓ Agent Address: ${agent.address}`);
    console.log(`✓ Agent Inbox ID: ${agent.client.inboxId}`);
    
    // Initialize clients for various tools
    setBroadcastClient(agent.client);
    setGroupClient(agent.client);
    setSidebarClient(agent.client);
    
    // Initialize agent in activity groups
    const { initializeAgentInGroups, listAllAgentGroups } = await import("./services/agent/tools/activityGroups.js");
    await initializeAgentInGroups();
    
    // Debug: List all groups agent has access to
    await listAllAgentGroups();

    // Initialize reminder dispatcher
    const reminderDispatcher = createReminderDispatcher();
    reminderDispatcher.start(agent.client);
    console.log("🔄 Reminder dispatcher initialized");
    
    // Handle process termination
    const cleanup = () => {
      console.log("🛑 Shutting down agent...");
      reminderDispatcher.stop();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    console.log("👂 Setting up message handlers...");
    console.log("💬 Agent will respond to:");
    console.log("  - Direct messages (DMs)");
    console.log(`  - Group messages when mentioned with @${MENTION_HANDLES.split(',')[0]}`);
    
    // Handle text messages
    agent.on('text', async (ctx) => {
      try {
        const messageContent = ctx.message.content as string;
        const senderInboxId = ctx.message.senderInboxId;
        const conversationId = ctx.conversation.id;
        const isGroup = ctx.conversation.type === 'group';

        if (DEBUG_LOGS) {
          console.log(`📥 Received message:`, {
            id: ctx.message.id,
            senderInboxId,
            conversationId,
            content: messageContent,
            isGroup
          });
        }

        // Skip messages from ourselves
        if (senderInboxId === agent.client.inboxId) {
          if (DEBUG_LOGS) {
            console.log("⏭️ Skipping own message");
          }
          return;
        }

        let cleanContent = messageContent;

        // Always respond to all messages, but clean mentions from groups
        if (isGroup && isMentioned(messageContent)) {
          cleanContent = removeMention(messageContent);
          if (DEBUG_LOGS) {
            console.log("👋 Mentioned in group, will respond");
          }
        } else if (!isGroup) {
          if (DEBUG_LOGS) {
            console.log("💬 DM received, will respond");
          }
        } else if (isGroup && !isMentioned(messageContent)) {
          if (DEBUG_LOGS) {
            console.log("⏭️ Not mentioned in group, skipping");
          }
          return;
        }

        // Get sender address for context
        let senderAddress = "";
        if (SHOW_SENDER_ADDRESS) {
          try {
            senderAddress = senderInboxId;
          } catch (error) {
            console.warn("⚠️ Could not get sender address:", error);
          }
        }

        // Send thinking reaction while processing
        try {
          const reactionConversation = await ctx.client.conversations.getConversationById(conversationId);
          if (reactionConversation) {
            await reactionConversation.send(
              {
                action: "added",
                content: "👀",
                reference: ctx.message.id,
                schema: "shortcode",
              } as any,
              ContentTypeReaction
            );
          }
        } catch (reactionError) {
          console.warn("⚠️ Could not send thinking reaction:", reactionError);
        }

        try {
          console.log(`🤖 Processing message: "${cleanContent}"`);
          
          // Check for sidebar group creation requests (only in groups)
          if (isGroup && isSidebarRequest(cleanContent)) {
            const groupName = parseSidebarCommand(cleanContent);
            if (groupName) {
              console.log(`🎯 Processing sidebar group request: "${groupName}"`);
              const sidebarResponse = await handleSidebarRequest(groupName, ctx.message, agent.client, ctx.conversation);
              if (sidebarResponse && sidebarResponse.trim() !== "") {
                await ctx.sendText(sidebarResponse);
              }
              return;
            }
          }
          
          // Check for broadcast commands
          if (!isGroup && cleanContent.toLowerCase().startsWith("/broadcast ")) {
            const broadcastMessage = cleanContent.substring(11).trim();
            
            try {
              const { previewBroadcast } = await import("./services/agent/tools/broadcast.js");
              
              const result = await previewBroadcast(
                broadcastMessage,
                senderInboxId,
                conversationId
              );
              
              const actionsData = JSON.parse(result);
              const broadcastConversation = await ctx.client.conversations.getConversationById(conversationId);
              if (broadcastConversation) {
                await broadcastConversation.send(actionsData.content, ContentTypeActions);
                console.log(`✅ Sent broadcast preview with quick actions`);
              }
            } catch (broadcastError: any) {
              await ctx.sendText(`❌ Broadcast preview failed: ${broadcastError.message}`);
              console.error("❌ Broadcast error:", broadcastError);
            }
            return;
          }
          
          // Additional broadcast command handlers...
          // (I'll continue with the other commands in the next part)
          
          // Use AI to detect if this is a greeting/engagement message
          const greetingCheckPrompt = `Is this message a greeting, casual hello, or someone starting a conversation? Examples: "hi", "hello", "hey", "yoooo", "what's up", "sup", "howdy", "good morning", "gm", "yo", "hey there", "bm", "based morning" etc. 

Message: "${cleanContent}"

CRITICAL: Respond with ONLY the word "YES" or ONLY the word "NO". No other text.`;

          const isGreeting = (await aiAgent.run(
            greetingCheckPrompt,
            senderInboxId,
            conversationId,
            isGroup,
            senderAddress,
          )).trim().toUpperCase();

          // If greeting or gibberish, show quick actions
          let shouldShowQuickActions = isGreeting === "YES";
          
          if (!shouldShowQuickActions) {
            const gibberishCheckPrompt = `Is this message gibberish, vague, unclear, nonsensical, or lacking clear intent? 

GIBBERISH (respond YES): "asdf", "weeds", "xyz", "jfjfjf", random letters/words without meaning, "stuff", "things", "idk", single unclear words with no context.

NOT GIBBERISH (respond NO): ANY question with "when", "what", "where", "how", "who", "why", ANY event/activity names, ANY specific requests.

Message: "${cleanContent}"

CRITICAL: Respond with ONLY the word "YES" or ONLY the word "NO". No other text.`;

            const isGibberish = (await aiAgent.run(
              gibberishCheckPrompt,
              senderInboxId,
              conversationId,
              isGroup,
              senderAddress,
            )).trim().toUpperCase();
            
            shouldShowQuickActions = isGibberish === "YES";
          }

          if (shouldShowQuickActions) {
            try {
              const quickActionsContent: ActionsContent = {
                id: "devconnect_welcome_actions",
                description: "Hi! I'm the DevConnect 2025 Concierge. Here are things I can help you with:",
                actions: [
                  {
                    id: "schedule",
                    label: "📅 Schedule",
                    style: "primary"
                  },
                  {
                    id: "wifi",
                    label: "📶 Wifi",
                    style: "secondary"
                  },
                  {
                    id: "event_logistics",
                    label: "📋 Event Logistics",
                    style: "secondary"
                  },
                  {
                    id: "concierge_support",
                    label: "🎫 Concierge Support", 
                    style: "secondary"
                  },
                  {
                    id: "join_groups",
                    label: "👥 Join Groups",
                    style: "secondary"
                  },
                  {
                    id: "base_info",
                    label: "🔵 Base",
                    style: "secondary"
                  },
                  {
                    id: "xmtp_info",
                    label: "💬 XMTP",
                    style: "secondary"
                  }
                ]
              };

              // Access the raw XMTP conversation through the client
              const rawConversation = await ctx.client.conversations.getConversationById(conversationId);
              if (!rawConversation) {
                throw new Error("Could not find conversation");
              }
              
              console.log("🔍 Attempting to send Quick Actions with ContentTypeActions:", ContentTypeActions.toString());
              await rawConversation.send(quickActionsContent, ContentTypeActions);
              console.log(`✅ Sent Quick Actions welcome message`);
              
              addToConversationHistory(senderInboxId, cleanContent, "Welcome message with Quick Actions sent");
              return;
            } catch (quickActionsError: any) {
              console.error("❌ Error sending Quick Actions:", quickActionsError);
              console.error("❌ Error details:", quickActionsError.message);
              console.error("❌ Stack:", quickActionsError.stack);
              await ctx.sendText("Hi! I'm the DevConnect 2025 Concierge. I can help you with the Schedule, Set Reminders, Event Info, Join Groups, and Sponsored Slot information. What would you like to know?");
              addToConversationHistory(senderInboxId, cleanContent, "Welcome message sent (fallback)");
              return;
            }
          }

          // Get conversation context for this user
          const conversationContext = getConversationContext(senderInboxId);
          const messageWithContext = conversationContext + cleanContent;
          
          // Generate AI response
          const response = await aiAgent.run(
            messageWithContext,
            senderInboxId,
            conversationId,
            isGroup,
            senderAddress,
          );

          if (response) {
            // Check if this is a Quick Actions response
            if (response.includes('"contentType":"coinbase.com/actions:1.0"')) {
              try {
                const quickActionsData = JSON.parse(response);
                const actionsContent = quickActionsData.content;
                
                const quickActionsConversation = await ctx.client.conversations.getConversationById(conversationId);
                if (quickActionsConversation) {
                  await quickActionsConversation.send(actionsContent);
                  console.log(`✅ Sent Quick Actions response`);
                }
                
                addToConversationHistory(senderInboxId, cleanContent, "Quick Actions response sent");
              } catch (quickActionsError) {
                console.error("❌ Error sending Quick Actions:", quickActionsError);
                await ctx.sendText("Hi! I'm the DevConnect 2025 Concierge. I can help you with the Schedule, Set Reminders, Event Info, Join Groups, and Sponsored Slot information. What would you like to know?");
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
                    style: "primary"
                  },
                  {
                    id: "end_conversation",
                    label: "❌ No",
                    style: "secondary"
                  }
                ]
              };
              
              const followupConversation = await ctx.client.conversations.getConversationById(conversationId);
              if (followupConversation) {
                await followupConversation.send(followupActionsContent, ContentTypeActions);
                console.log(`✅ Sent response with follow-up actions`);
              }
              
              addToConversationHistory(senderInboxId, cleanContent, response);
            }
          }
        } catch (error) {
          console.error("❌ Error generating or sending response:", error);
          
          try {
            await ctx.sendText(
              "Sorry, I encountered an error while processing your request. Please try again later."
            );
          } catch (fallbackError) {
            console.error("❌ Error sending fallback message:", fallbackError);
          }
        }
      } catch (error) {
        console.error("❌ Error processing message:", error);
      }
    });

    // Handle Intent messages (Quick Action responses) - same logic as before but adapted
    agent.on('intent', async (ctx) => {
      const intentContent = ctx.message.content as any;
      const actionId = intentContent.actionId;
      const originalActionsId = intentContent.id;
      
      console.log(`🎯 Received Quick Action intent: ${actionId}`);
      
      // Handle different action IDs (same logic as your original implementation)
      switch (actionId) {
        case "schedule":
          const scheduleResponse = `You can view the full schedule at devconnect.org/calendar and sign up for sessions. Feel free to ask me any questions about the schedule and I'll help you craft an epic DevConnect experience.

Examples:
•⁠  ⁠When is DevConnect Opening Ceremony?
•⁠  ⁠When is Builder Nights Buenos Aires?
•⁠  ⁠Tell me about ETH Day
•⁠  ⁠What events are on Thursday?

Just ask naturally - I understand conversational requests!`;
          
          await ctx.sendText(scheduleResponse);
          
          const scheduleFollowupActionsContent: ActionsContent = {
            id: "schedule_followup_actions",
            description: "Is there anything else I can help with?",
            actions: [
              {
                id: "show_main_menu",
                label: "✅ Yes",
                style: "primary"
              },
              {
                id: "end_conversation",
                label: "❌ No",
                style: "secondary"
              }
            ]
          };
          const scheduleConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (scheduleConversation) {
            await scheduleConversation.send(scheduleFollowupActionsContent, ContentTypeActions);
          }
          break;
        
        case "show_main_menu":
          const mainMenuActionsContent: ActionsContent = {
            id: "devconnect_welcome_actions",
            description: "Hi! I'm the DevConnect 2025 Concierge. Here are things I can help you with:",
            actions: [
              {
                id: "schedule",
                label: "📅 Schedule",
                style: "primary"
              },
              {
                id: "wifi",
                label: "📶 Wifi",
                style: "secondary"
              },
              {
                id: "event_logistics",
                label: "📋 Event Logistics",
                style: "secondary"
              },
              {
                id: "concierge_support",
                label: "🎫 Concierge Support",
                style: "secondary"
              },
              {
                id: "join_groups",
                label: "👥 Join Groups",
                style: "secondary"
              },
              {
                id: "base_info",
                label: "🔵 Base",
                style: "secondary"
              },
              {
                id: "xmtp_info",
                label: "💬 XMTP",
                style: "secondary"
              }
            ]
          };
          const mainMenuConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (mainMenuConversation) {
            await mainMenuConversation.send(mainMenuActionsContent, ContentTypeActions);
          }
          break;
          
        case "wifi":
          const wifiActionsContent: ActionsContent = {
            id: "wifi_followup_actions",
            description: `📶 DevConnect 2025 WiFi Information

WiFi details coming soon!

Check back closer to the event for network credentials to access high-speed internet at La Rural.

Is there anything else I can help with?`,
            actions: [
              {
                id: "show_main_menu",
                label: "✅ Yes",
                style: "primary"
              },
              {
                id: "end_conversation",
                label: "❌ No",
                style: "secondary"
              }
            ]
          };
          const wifiConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (wifiConversation) {
            await wifiConversation.send(wifiActionsContent, ContentTypeActions);
          }
          break;

        case "event_logistics":
          await ctx.sendText(`📋 Event Logistics

🗓️ Dates: November 13-19, 2025
📍 Location: La Rural Convention Center, Buenos Aires, Argentina

For detailed information about:
• Venue maps and directions
• Transportation and shuttles
• Accommodation recommendations  
• Local amenities

Visit: https://devconnect.org/calendar `);
          
          const logisticsFollowupActionsContent: ActionsContent = {
            id: "logistics_followup_actions",
            description: "Is there anything else I can help with?",
            actions: [
              {
                id: "show_main_menu",
                label: "✅ Yes",
                style: "primary"
              },
              {
                id: "end_conversation",
                label: "❌ No",
                style: "secondary"
              }
            ]
          };
          const logisticsConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (logisticsConversation) {
            await logisticsConversation.send(logisticsFollowupActionsContent, ContentTypeActions);
          }
          break;

        case "concierge_support":
          const conciergeActionsContent: ActionsContent = {
            id: "concierge_support_actions",
            description: `Concierge Support

I'm here to help as your Concierge during DevConnect 2025! 

Concierge contact details coming soon. Check back closer to the event for support information.

Is there anything else I can help with?`,
            actions: [
              {
                id: "show_main_menu",
                label: "✅ Yes",
                style: "primary"
              },
              {
                id: "end_conversation",
                label: "❌ No",
                style: "secondary"
              }
            ]
          };
          const conciergeConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (conciergeConversation) {
            await conciergeConversation.send(conciergeActionsContent, ContentTypeActions);
          }
          break;

        case "join_groups":
          const { generateGroupSelectionQuickActions } = await import("./services/agent/tools/activityGroups.js");
          const groupSelectionActions = generateGroupSelectionQuickActions();
          const groupSelectionConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (groupSelectionConversation) {
            await groupSelectionConversation.send(groupSelectionActions, ContentTypeActions);
          }
          break;

        case "base_info":
          const baseMessage = `🔵 Base

Base is an Ethereum L2 built by Coinbase, incubated inside the company.

🌐 Learn more: https://base.org 
📱 Base App: https://base.org/apps 

📣 Sponsored Opportunity:
Selected winners from Base Batches will be featured inside Rocky @ DevConnect!

📧 Contact Mateo:
• Base App: 0xteo.base.eth
• Twitter: @0xTeo`;
          
          const baseFollowupActionsContent: ActionsContent = {
            id: "base_info_followup",
            description: `${baseMessage}

Is there anything else I can help with?`,
            actions: [
              {
                id: "show_main_menu",
                label: "✅ Yes",
                style: "primary"
              },
              {
                id: "end_conversation",
                label: "❌ No",
                style: "secondary"
              }
            ]
          };
          const baseConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (baseConversation) {
            await baseConversation.send(baseFollowupActionsContent, ContentTypeActions);
          }
          break;

        case "xmtp_info":
          const xmtpMessage = `💬 XMTP

XMTP (Extensible Message Transport Protocol) is an open protocol for secure, decentralized messaging.

🌐 Learn more: https://xmtp.org 
📱 Try it: Download Converse or Base App to message on XMTP

This agent runs on XMTP! All messages you send here are private and decentralized.`;
          
          const xmtpFollowupActionsContent: ActionsContent = {
            id: "xmtp_info_followup",
            description: `${xmtpMessage}

Is there anything else I can help with?`,
            actions: [
              {
                id: "show_main_menu",
                label: "✅ Yes",
                style: "primary"
              },
              {
                id: "end_conversation",
                label: "❌ No",
                style: "secondary"
              }
            ]
          };
          const xmtpConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (xmtpConversation) {
            await xmtpConversation.send(xmtpFollowupActionsContent, ContentTypeActions);
          }
          break;

        // DevConnect group joining cases
        case "join_ethcon_argentina":
          const { addMemberToActivityGroup: addEthconArg } = await import("./services/agent/tools/activityGroups.js");
          const ethconArgResult = await addEthconArg("ethcon_argentina", ctx.message.senderInboxId);
          
          const ethconArgFollowupActionsContent: ActionsContent = {
            id: "ethcon_argentina_join_followup",
            description: `${ethconArgResult}

Is there anything else I can help with?`,
            actions: [
              {
                id: "show_main_menu",
                label: "✅ Yes",
                style: "primary"
              },
              {
                id: "end_conversation",
                label: "❌ No",
                style: "secondary"
              }
            ]
          };
          const ethconConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (ethconConversation) {
            await ethconConversation.send(ethconArgFollowupActionsContent, ContentTypeActions);
          }
          break;

        case "join_staking_summit":
          const { addMemberToActivityGroup: addStakingSummit } = await import("./services/agent/tools/activityGroups.js");
          const stakingSummitResult = await addStakingSummit("staking_summit", ctx.message.senderInboxId);
          
          const stakingSummitFollowupActionsContent: ActionsContent = {
            id: "staking_summit_join_followup",
            description: `${stakingSummitResult}

Is there anything else I can help with?`,
            actions: [
              {
                id: "show_main_menu",
                label: "✅ Yes",
                style: "primary"
              },
              {
                id: "end_conversation",
                label: "❌ No",
                style: "secondary"
              }
            ]
          };
          const stakingConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (stakingConversation) {
            await stakingConversation.send(stakingSummitFollowupActionsContent, ContentTypeActions);
          }
          break;

        case "join_builder_nights":
          const { addMemberToActivityGroup: addBuilderNights } = await import("./services/agent/tools/activityGroups.js");
          const builderNightsResult = await addBuilderNights("builder_nights", ctx.message.senderInboxId);
          
          const builderNightsFollowupActionsContent: ActionsContent = {
            id: "builder_nights_join_followup",
            description: `${builderNightsResult}

Is there anything else I can help with?`,
            actions: [
              {
                id: "show_main_menu",
                label: "✅ Yes",
                style: "primary"
              },
              {
                id: "end_conversation",
                label: "❌ No",
                style: "secondary"
              }
            ]
          };
          const builderConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (builderConversation) {
            await builderConversation.send(builderNightsFollowupActionsContent, ContentTypeActions);
          }
          break;

        case "end_conversation":
          await ctx.sendText("Great! Message me 👋 if you want to view the option menu again!");
          break;
          
        default:
          await ctx.sendText("Thanks for your selection!");
      }
    });

    // Start the agent
    console.log("🚀 Starting Agent SDK agent...");
    await agent.start();
    
    console.log("✅ DevConnect 2025 Concierge Agent is now running!");

  } catch (error) {
    console.error("❌ Error starting agent:", error);
    process.exit(1);
  }
}

main().catch(console.error);
