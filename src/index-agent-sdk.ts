import { Agent } from '@xmtp/agent-sdk';
import { createReminderDispatcher } from "./dispatcher.js";
import { isMentioned, removeMention } from "./mentions.js";
import { AIAgent } from "./services/agent/index.js";
import { setBroadcastClient } from "./services/agent/tools/broadcast.js";
import { setGroupClient } from "./services/agent/tools/activityGroups.js";
import { setTreasureHuntClient } from "./services/agent/tools/treasureHunt.js";
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
import {
  RemoteAttachmentCodec,
  AttachmentCodec,
  ContentTypeRemoteAttachment,
  ContentTypeAttachment,
} from "@xmtp/content-type-remote-attachment";

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
    // Use Railway volume mount for database persistence
    const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
      ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/devconnect-agent.db3`
      : undefined;
    
    console.log(`📂 Database path: ${dbPath || 'default (.data/xmtp/)'}`);
    
    const agent = await Agent.createFromEnv({
      env: process.env.XMTP_ENV as 'dev' | 'production' || 'production',
      dbPath,
      // Custom codecs for Quick Actions, Reactions, and Attachments
      codecs: [
        new ActionsCodec(), 
        new IntentCodec(), 
        new ReactionCodec(),
        new RemoteAttachmentCodec(),
        new AttachmentCodec()
      ],
    });

    console.log("🔄 Agent SDK client initialized with Quick Actions codecs");
    console.log(`✓ Agent Address: ${agent.address}`);
    console.log(`✓ Agent Inbox ID: ${agent.client.inboxId}`);
    
    // Verify codecs are registered
    console.log(`🔍 Registered codecs:`, (agent.client as any).codecRegistry);
    console.log(`🔍 ContentTypeActions:`, ContentTypeActions.toString());
    
    // Initialize clients for various tools
    setBroadcastClient(agent.client);
    setGroupClient(agent.client);
    setSidebarClient(agent.client);
    setTreasureHuntClient(agent.client);
    
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
        const isGroup = ctx.isGroup(); // Use Agent SDK's isGroup() method

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

        // Check if we should respond to this message
        // In groups: ONLY respond if mentioned
        // In DMs: Always respond
        if (isGroup && !isMentioned(messageContent)) {
          if (DEBUG_LOGS) {
            console.log("⏭️ Not mentioned in group, skipping");
          }
          return; // Exit early - don't process or send reactions
        }

        // Clean mentions from group messages
        if (isGroup && isMentioned(messageContent)) {
          cleanContent = removeMention(messageContent);
          if (DEBUG_LOGS) {
            console.log("👋 Mentioned in group, will respond");
          }
        } else if (!isGroup) {
          if (DEBUG_LOGS) {
            console.log("💬 DM received, will respond");
          }
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
        // This is only reached if we're responding (mentioned in group or DM)
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
          
          // Check for treasure hunt image submissions (mention in treasure hunt group)
          if (isGroup && cleanContent.trim() === "") {
            const { isTreasureHuntGroup } = await import("./services/agent/tools/treasureHunt.js");
            
            if (isTreasureHuntGroup(conversationId)) {
              console.log(`🏴‍☠️ Empty mention in treasure hunt group - checking for recent image...`);
              
              // Get recent messages to find the image
              const conversation = await ctx.client.conversations.getConversationById(conversationId);
              if (conversation) {
                await conversation.sync();
                const messages = await (conversation as any).messages();
                
                // Find the most recent image message (within last 10 messages)
                const recentMessages = messages.slice(0, 10);
                const imageMessage = recentMessages.find((msg: any) => {
                  const type = msg.contentType?.typeId;
                  return type?.includes('attachment') || type?.includes('Attachment');
                });
                
                if (imageMessage) {
                  console.log(`📸 Found recent image, processing treasure hunt submission...`);
                  const { handleTreasureHuntImageSubmission } = await import("./services/agent/tools/treasureHunt.js");
                  
                  const response = await handleTreasureHuntImageSubmission(
                    conversationId,
                    senderInboxId,
                    imageMessage.content,
                    imageMessage.id
                  );
                  
                  if (response && response.trim() !== "") {
                    await ctx.sendText(response);
                  }
                  return; // Exit early, don't send menu
                } else {
                  console.log(`📊 No recent image found, showing task status...`);
                  const { getTreasureHuntStatus } = await import("./services/agent/tools/treasureHunt.js");
                  const status = await getTreasureHuntStatus(conversationId);
                  await ctx.sendText(status);
                  return;
                }
              }
            }
          }
          
          // Check for sidebar group creation requests (only in groups)
          if (isGroup && isSidebarRequest(cleanContent)) {
            const groupName = parseSidebarCommand(cleanContent);
            if (groupName) {
              console.log(`🎯 Processing sidebar group request: "${groupName}"`);
              const sidebarResponse = await handleSidebarRequest(groupName, ctx.message, agent.client as any, ctx.conversation);
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
            // Log the agent's response
            console.log(`🤖 Agent Response: "${response}"`);
            console.log(`🔍 Response length: ${response.length} chars`);
            
            // Check if AI is responding to a greeting or giving a generic "how can I help" response
            const lowerResponse = response.toLowerCase();
            const hasSchedule = response.includes("Schedule");
            const hasWifi = response.includes("Wifi");
            const hasLogistics = response.includes("Event Logistics");
            
            // Detect generic greeting responses that should use ShowMenu tool instead
            const isGenericGreeting = (
              (lowerResponse.includes("how can i assist") || 
               lowerResponse.includes("how can i help") ||
               lowerResponse.includes("what can i help") ||
               lowerResponse.includes("let me know")) &&
              response.length < 250 // Short generic response
            );
            
            console.log(`🔍 Menu detection - Schedule: ${hasSchedule}, Wifi: ${hasWifi}, Logistics: ${hasLogistics}, GenericGreeting: ${isGenericGreeting}`);
            
            const isListingMenu = (hasSchedule && hasWifi && hasLogistics) || isGenericGreeting;
            
            if (isListingMenu) {
              console.warn("⚠️ AI tried to list menu in text instead of using ShowMenu tool!");
              console.log("🔄 Sending menu Quick Actions WITHOUT followup wrapper...");
              
              // Send the menu Quick Actions directly - NO "is there anything else" wrapper
              const menuActionsContent: ActionsContent = {
                id: "devconnect_welcome_actions",
                description: "Hi! I'm Rocky, your DevConnect 2025 Concierge. Here's what I can help you with:",
                actions: [
                  { id: "schedule", label: "Schedule", imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760465562/ChatGPT_Image_Oct_14_2025_at_03_12_20_PM_p7jhdx.png", style: "primary" },
                  { id: "treasure_hunt", label: "🏴‍☠️ Treasure Hunt", style: "primary" },
                  { id: "wifi", label: "Wifi", imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/c_crop,w_1100,h_1100/v1760465369/vecteezy_simple-wifi-icon_8014226-1_jicvnk.jpg", style: "secondary" },
                  { id: "event_logistics", label: "Event Logistics", imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760464845/checklist_gd3rpo.png", style: "secondary" },
                  { id: "join_base_group", label: "Base Group", imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760466568/base_s5smwn.png", style: "secondary" },
                  // { id: "join_eth_group", label: "ETH Group", imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760463829/Ethereum_Foundation_Logo_Vector_xddxiu.svg", style: "secondary" },
                  { id: "join_xmtp_group", label: "XMTP Group", imageUrl: "https://d392zik6ho62y0.cloudfront.net/images/xmtp-logo.png", style: "secondary" },
                  { id: "join_groups", label: "More Groups", imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760464996/vecteezy_join-group-icon-in-trendy-outline-style-isolated-on-white_32201148_mkmtik.jpg", style: "secondary" }
                ]
              };
              
              const menuConversation = await ctx.client.conversations.getConversationById(conversationId);
              if (menuConversation) {
                await (menuConversation as any).send(menuActionsContent, ContentTypeActions);
                console.log(`✅ Sent Quick Actions menu directly (no followup)`);
              }
              
              addToConversationHistory(senderInboxId, cleanContent, "Menu shown via Quick Actions");
              return; // Exit early - menu sent, don't add followup
            }
            
            // Check if this is a Quick Actions response from ShowMenu tool
            if (response.includes('"contentType":"coinbase.com/actions:1.0"')) {
              try {
                const quickActionsData = JSON.parse(response);
                const actionsContent = quickActionsData.content;
                
                const quickActionsConversation = await ctx.client.conversations.getConversationById(conversationId);
                if (quickActionsConversation) {
                  await quickActionsConversation.send(actionsContent, ContentTypeActions);
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
                await (followupConversation as any).send(followupActionsContent, ContentTypeActions);
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

    // Handle Remote Attachment messages (images for treasure hunt)
    agent.on('message', async (ctx) => {
      const contentTypeId = ctx.message.contentType?.typeId;
      
      // Debug log all message types
      console.log(`📨 Message type: ${contentTypeId}, From: ${ctx.message.senderInboxId.substring(0, 16)}...`);
      
      // Check if this is a remote attachment or attachment
      const isRemoteAttachment = contentTypeId?.includes('remoteStaticAttachment') || 
                                  contentTypeId?.includes('RemoteAttachment');
      const isAttachment = contentTypeId?.includes('attachment') && !isRemoteAttachment;
      
      if (!isRemoteAttachment && !isAttachment) {
        return; // Not an attachment, let other handlers deal with it
      }
      
      console.log(`📸 Detected ${isRemoteAttachment ? 'remote' : 'inline'} attachment!`);
      
      // Skip our own messages
      if (ctx.message.senderInboxId === agent.client.inboxId) {
        return;
      }
      
      const { isTreasureHuntGroup, handleTreasureHuntImageSubmission } = await import("./services/agent/tools/treasureHunt.js");
      
      // Check if this is from a treasure hunt group
      const isGroup = ctx.isGroup();
      const isTreasureGroup = isTreasureHuntGroup(ctx.conversation.id);
      
      console.log(`🔍 Is group: ${isGroup}, Is treasure hunt: ${isTreasureGroup}, Group ID: ${ctx.conversation.id}`);
      
      if (!isGroup || !isTreasureGroup) {
        console.log(`⏭️ Not a treasure hunt group, skipping attachment`);
        return; // Not a treasure hunt group
      }
      
      // For treasure hunt submissions, we need to look at the NEXT message
      // Base App sends image first, then text with mention separately
      // So we'll handle this in the text message handler instead
      console.log(`📸 Image in treasure hunt group - will process when mentioned`);
      return;
      
      // Handle the image submission
      const attachment = ctx.message.content as any;
      const response = await handleTreasureHuntImageSubmission(
        ctx.conversation.id,
        ctx.message.senderInboxId,
        attachment,
        ctx.message.id
      );
      
      if (response && response.trim() !== "") {
        await ctx.sendText(response);
      }
    });

    // Handle Intent messages (Quick Action responses) using generic message handler
    // Agent SDK doesn't have 'intent' event, so we check content type manually
    agent.on('message', async (ctx) => {
      // Only handle Intent content type
      if (ctx.message.contentType?.typeId !== ContentTypeIntent.toString() && 
          ctx.message.contentType?.typeId !== "coinbase.com/intent:1.0" &&
          ctx.message.contentType?.typeId !== "intent") {
        return; // Not an intent message, let other handlers deal with it
      }
      
      const intentContent = ctx.message.content as any;
      const actionId = intentContent.actionId;
      const originalActionsId = intentContent.id;
      
      console.log(`🎯 Received Quick Action intent: ${actionId}`);
      console.log(`🎯 Intent from actions ID: ${originalActionsId}`);
      console.log(`🎯 Message content type: ${ctx.message.contentType?.typeId}`);
      
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
            description: "Here's what I can help you with:",
            actions: [
              {
                id: "schedule",
                label: "Schedule",
                imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760465562/ChatGPT_Image_Oct_14_2025_at_03_12_20_PM_p7jhdx.png",
                style: "primary"
              },
              {
                id: "treasure_hunt",
                label: "🏴‍☠️ Treasure Hunt",
                style: "primary"
              },
              {
                id: "wifi",
                label: "Wifi",
                imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760465369/vecteezy_simple-wifi-icon_8014226-1_jicvnk.jpg",
                style: "secondary"
              },
              {
                id: "event_logistics",
                label: "Event Logistics",
                imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760464845/checklist_gd3rpo.png",
                style: "secondary"
              },
              {
                id: "join_base_group",
                label: "Base Group",
                imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760466568/base_s5smwn.png",
                style: "secondary"
              },
              // {
              //   id: "join_eth_group",
              //   label: "ETH Group",
              //   imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760463829/Ethereum_Foundation_Logo_Vector_xddxiu.svg",
              //   style: "secondary"
              // },
              {
                id: "join_xmtp_group",
                label: "XMTP Group",
                imageUrl: "https://d392zik6ho62y0.cloudfront.net/images/xmtp-logo.png",
                style: "secondary"
              },
              {
                id: "join_groups",
                label: "More Groups",
                imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760464996/vecteezy_join-group-icon-in-trendy-outline-style-isolated-on-white_32201148_mkmtik.jpg",
                style: "secondary"
              }
            ]
          };
          console.log(`🎯 Sending main menu with ${mainMenuActionsContent.actions.length} actions`);
          const mainMenuConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (mainMenuConversation) {
            console.log(`🎯 Conversation found, sending Quick Actions...`);
            await mainMenuConversation.send(mainMenuActionsContent, ContentTypeActions);
            console.log(`✅ Main menu Quick Actions sent successfully`);
          } else {
            console.error(`❌ Could not find conversation ${ctx.conversation.id}`);
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

        case "treasure_hunt":
          const { assignToTreasureHuntGroup } = await import("./services/agent/tools/treasureHunt.js");
          const treasureHuntResult = await assignToTreasureHuntGroup(ctx.message.senderInboxId);
          
          const treasureHuntActionsContent: ActionsContent = {
            id: "treasure_hunt_join_response",
            description: `${treasureHuntResult.message}

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
          const treasureHuntConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (treasureHuntConversation) {
            await (treasureHuntConversation as any).send(treasureHuntActionsContent, ContentTypeActions);
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

        case "join_base_group":
          const { addMemberToBaseGlobalEvents } = await import("./services/agent/tools/activityGroups.js");
          const baseGroupResult = await addMemberToBaseGlobalEvents(ctx.message.senderInboxId);
          
          const baseGroupFollowupActionsContent: ActionsContent = {
            id: "base_group_join_followup",
            description: `${baseGroupResult}

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
            await baseConversation.send(baseGroupFollowupActionsContent, ContentTypeActions);
          }
          break;

        case "join_eth_group":
          const { addMemberToETHGroup } = await import("./services/agent/tools/activityGroups.js");
          const ethGroupResult = await addMemberToETHGroup(ctx.message.senderInboxId);
          
          const ethGroupFollowupActionsContent: ActionsContent = {
            id: "eth_group_join_followup",
            description: `${ethGroupResult}

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
          const ethConversation = await ctx.client.conversations.getConversationById(ctx.conversation.id);
          if (ethConversation) {
            await ethConversation.send(ethGroupFollowupActionsContent, ContentTypeActions);
          }
          break;

        case "join_xmtp_group":
          const { addMemberToXMTPGroup } = await import("./services/agent/tools/activityGroups.js");
          const xmtpGroupResult = await addMemberToXMTPGroup(ctx.message.senderInboxId);
          
          const xmtpGroupFollowupActionsContent: ActionsContent = {
            id: "xmtp_group_join_followup",
            description: `${xmtpGroupResult}

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
            await xmtpConversation.send(xmtpGroupFollowupActionsContent, ContentTypeActions);
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

        case "treasure_hunt_status":
          const { getTreasureHuntStatus } = await import("./services/agent/tools/treasureHunt.js");
          const statusMessage = await getTreasureHuntStatus(ctx.conversation.id);
          await ctx.sendText(statusMessage);
          break;
          
        case "treasure_hunt_rules":
          await ctx.sendText(`🏴‍☠️ **Treasure Hunt Rules**

📋 How it works:
1️⃣ Complete 10 photo challenges with your team
2️⃣ Send photos in this group chat to submit
3️⃣ Rocky validates each photo with AI
4️⃣ Pass requires YES + 60%+ confidence
5️⃣ First team to complete all tasks wins!

⭐ Points per task:
• Easy tasks: 10 points
• Medium tasks: 15 points  
• Hard tasks: 20 points

🎯 Work together and have fun! 🍀`);
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
