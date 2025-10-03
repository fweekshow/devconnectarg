import { Client, type Signer, type DecodedMessage, Group } from "@xmtp/node-sdk";
import { createReminderDispatcher } from "./dispatcher.js";
import { isMentioned, removeMention } from "./mentions.js";
import { AIAgent } from "./services/agent/index.js";
import { setBroadcastClient } from "./services/agent/tools/broadcast.js";
// Urgent message system disabled
import { setGroupClient } from "./services/agent/tools/activityGroups.js";
import { 
  handleSidebarRequest, 
  joinSidebarGroup, 
  declineSidebarGroup,
  parseSidebarCommand,
  isSidebarRequest,
  setSidebarClient
} from "./services/agent/tools/sidebarGroups.js";
import {
  createSigner,
  getDbPath,
  getEncryptionKeyFromHex,
  logAgentDetails,
} from "./services/helpers/client.js";
import { initDb } from "./store.js";
import {
  DEBUG_LOGS,
  DB_ENCRYPTION_KEY,
  MENTION_HANDLES,
  SHOW_SENDER_ADDRESS,
  WALLET_KEY,
  XMTP_ENV,
} from "./config.js";
import { ActionsCodec, type ActionsContent, ContentTypeActions } from "./xmtp-inline-actions/types/ActionsContent.js";
import { IntentCodec, ContentTypeIntent } from "./xmtp-inline-actions/types/IntentContent.js";

if (!WALLET_KEY) {
  throw new Error("WALLET_KEY is required");
}

if (!DB_ENCRYPTION_KEY) {
  throw new Error("DB_ENCRYPTION_KEY is required");
}

if (!XMTP_ENV) {
  throw new Error("XMTP_ENV is required");
}

const signer = createSigner(WALLET_KEY);
const encryptionKey = getEncryptionKeyFromHex(DB_ENCRYPTION_KEY);

console.log(`🚀 Starting Basecamp 2025 Concierge Agent`);

// Initialize database for reminders
initDb();

// Initialize AI agent
const agent = new AIAgent();

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
  
  // Add new entry
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

async function handleMessage(message: DecodedMessage, client: Client) {
  try {
    const messageContent = message.content as string;
    const senderInboxId = message.senderInboxId;
    const conversationId = message.conversationId;

    if (DEBUG_LOGS) {
      console.log(`📥 Received message:`, {
        id: message.id,
        senderInboxId,
        conversationId,
        content: messageContent,
      });
    }

    // Skip messages from ourselves
    if (senderInboxId === client.inboxId) {
      if (DEBUG_LOGS) {
        console.log("⏭️ Skipping own message");
      }
      return;
    }

    // Get conversation to check if it's a group
    const conversation = await client.conversations.getConversationById(conversationId);

    if (!conversation) {
      console.error("❌ Could not find conversation");
      return;
    }

    const isGroup = conversation instanceof Group;
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
        // Use the sender's inbox ID to get their address
        senderAddress = senderInboxId;
      } catch (error) {
        console.warn("⚠️ Could not get sender address:", error);
      }
    }

    try {
      console.log(`🤖 Processing message: "${cleanContent}"`);
      
      // Check for sidebar group creation requests (only in groups)
      if (isGroup && isSidebarRequest(cleanContent)) {
        const groupName = parseSidebarCommand(cleanContent);
        if (groupName) {
          console.log(`🎯 Processing sidebar group request: "${groupName}"`);
          const sidebarResponse = await handleSidebarRequest(groupName, message, client, conversation);
          if (sidebarResponse && sidebarResponse.trim() !== "") {
            await conversation.send(sidebarResponse);
          }
          return; // Exit early, sidebar request handled
        }
      }
      
      // Check for broadcast commands and handle with preview
      if (!isGroup && cleanContent.toLowerCase().startsWith("/broadcast ")) {
        const broadcastMessage = cleanContent.substring(11).trim(); // Remove "/broadcast " prefix
        
        // Handle broadcast with preview/confirmation
        try {
          // Import the broadcast functions
          const { previewBroadcast, confirmBroadcast } = await import("./services/agent/tools/broadcast.js");
          
          const result = await previewBroadcast(
            broadcastMessage,
            senderInboxId,
            conversationId
          );
          
          // Parse the JSON result and send as ActionsContent
          const actionsData = JSON.parse(result);
          await (conversation as any).send(actionsData.content, ContentTypeActions);
          console.log(`✅ Sent broadcast preview with quick actions`);
        } catch (broadcastError: any) {
          await (conversation as any).send(`❌ Broadcast preview failed: ${broadcastError.message}`);
          console.error("❌ Broadcast error:", broadcastError);
        }
        return;
      }
      
      // Check for broadcastactions command (Method 1)
      if (!isGroup && cleanContent.toLowerCase().startsWith("/broadcastactions ")) {
        const broadcastMessage = cleanContent.substring(18).trim(); // Remove "/broadcastactions " prefix
        
        try {
          const { previewBroadcastActions, confirmBroadcastActions } = await import("./services/agent/tools/broadcast.js");
          
          const result = await previewBroadcastActions(
            broadcastMessage,
            senderInboxId,
            conversationId
          );
          
          const actionsData = JSON.parse(result);
          await (conversation as any).send(actionsData.content, ContentTypeActions);
          console.log(`✅ Sent broadcast actions preview with quick actions`);
        } catch (broadcastError: any) {
          await (conversation as any).send(`❌ Broadcast actions preview failed: ${broadcastError.message}`);
          console.error("❌ Broadcast actions error:", broadcastError);
        }
        return;
      }
      
      // Check for broadcastjoin command (Method 2)
      if (!isGroup && cleanContent.toLowerCase().startsWith("/broadcastjoin ")) {
        const broadcastMessage = cleanContent.substring(15).trim(); // Remove "/broadcastjoin " prefix
        
        try {
          const { previewBroadcastJoin, confirmBroadcastJoin } = await import("./services/agent/tools/broadcast.js");
          
          const result = await previewBroadcastJoin(
            broadcastMessage,
            senderInboxId,
            conversationId
          );
          
          const actionsData = JSON.parse(result);
          await (conversation as any).send(actionsData.content, ContentTypeActions);
          console.log(`✅ Sent broadcast join preview with quick actions`);
        } catch (broadcastError: any) {
          await (conversation as any).send(`❌ Broadcast join preview failed: ${broadcastError.message}`);
          console.error("❌ Broadcast join error:", broadcastError);
        }
        return;
      }
      
      // Check for "Join Base @ DevConnect" text message (Method 2 response)
      if (cleanContent.toLowerCase().trim() === "join base @ devconnect" || cleanContent.toLowerCase().trim() === "join base @devconnect") {
        const joinEventsActionsContent: ActionsContent = {
          id: "join_events_text_confirmation",
          description: "Join Base @ DevConnect\n\nWould you like to join the Base @ DevConnect group? This will give you access to exclusive updates and community discussions about DevConnect.",
          actions: [
            {
              id: "confirm_join_events",
              label: "✅ Yes, Join Group",
              style: "primary"
            },
            {
              id: "decline_join_events",
              label: "❌ No, Thanks",
              style: "secondary"
            }
          ]
        };
        await (conversation as any).send(joinEventsActionsContent, ContentTypeActions);
        return;
      }
      
      // Check for admin command: @rocky addToGroup <address1> <address2> ...
      if (cleanContent.toLowerCase().startsWith("addtogroup")) {
        
        // Only allow this command in group chats
        if (!isGroup) {
          await conversation.send("❌ The addToGroup command can only be used in group chats.");
          return;
        }
        
        try {
          // Parse the command: @rocky addToGroup <address1> <address2> ...
          const parts = cleanContent.split(' ').filter(part => part.trim() !== '');
          
          if (parts.length < 2) {
            await conversation.send("❌ Usage: @rocky addToGroup <address1> <address2> ...\n\nExample: @rocky addToGroup 0x123... 0x456...\n\nI'll add them to this group!");
            return;
          }
          
          // Use the current group's ID
          const groupId = conversationId;
          const addresses = parts.slice(1);
          
          // Import and use the admin function
          const { addMembersToGroup } = await import("./services/agent/tools/admin.js");
          const result = await addMembersToGroup(groupId, addresses, senderInboxId, client);
          
          await conversation.send(result);
          console.log(`✅ Admin command result: ${result}`);
          
        } catch (error: any) {
          console.error("❌ Error processing admin command:", error);
          await conversation.send(`❌ Error processing admin command: ${error.message}`);
        }
        
        return;
      }
      
      // Check for DM me command to establish DM connection
      if (cleanContent.toLowerCase().includes("dm me") || cleanContent.toLowerCase().includes("start dm")) {
        try {
          console.log(`📱 DM request from ${senderAddress}, attempting to establish DM connection...`);
          
          // Try to create DM with the sender
          const dmConversation = await client.conversations.newDm(senderAddress);
          const dmMessage = `Hi! I'm starting this DM as requested. You can now message me directly here for private conversations about Basecamp 2025!`;
          
          await dmConversation.send(dmMessage);
          await conversation.send(`✅ DM started! Check your direct messages.`);
          console.log(`✅ Established DM with ${senderAddress}`);
          return;
          
        } catch (dmError: any) {
          await conversation.send(`❌ Failed to start DM: ${dmError.message}`);
          console.error(`❌ DM establishment failed:`, dmError);
          return;
        }
      }
      
      // Use AI to detect if this is a single activity keyword
      const activityDetectionPrompt = `Is this message a single activity keyword that matches one of these activities: yoga, running, pickleball, hiking, builder, payments, trenches, coding, ads, agents, video, roast, mini app, governance, deals, defi, network, coining, students?

Return with the exact keyword:
- "hiking", "yoga", "running", "pickleball" (physical activities)
- "builder", "payments", "trenches", "coding", "ads", "agents", "video", "roast", "mini app", "governance", "deals", "defi", "network", "coining", "students" (workshop sessions)

Examples that should return NO:
- "hello"
- "what time is hiking"
- "show me the schedule"
- "join groups"
- "hiking at 7am"
- "base app" (should be "roast")

Message: "${cleanContent}"

Respond with only the exact keyword or nothing.`;

      const isSingleActivityKeyword = await agent.run(
        activityDetectionPrompt,
        senderInboxId,
        conversationId,
        isGroup,
        senderAddress,
      );
      console.log("🔍 isSingleActivityKeyword", isSingleActivityKeyword);
      
      if (isSingleActivityKeyword && !isSingleActivityKeyword.toLowerCase().includes("no")) {
        console.log("🎯 AI detected single activity keyword, sending Quick Actions...");
        try {
          const { hasGroupChat, getJoinActionId } = await import("./services/agent/tools/activityGroups.js");
          const singleKeyword = cleanContent.trim().toLowerCase();
          const normalized = singleKeyword;
          const displayName = normalized.charAt(0).toUpperCase() + normalized.slice(1);
          const joinActionId = getJoinActionId(normalized);
          
          if (hasGroupChat(singleKeyword)) {
            // Find the activity in schedule to get timing info
            const conciergeActionsContent: ActionsContent = {
                id: `${normalized}_activity_join`,
                description: `🎯 ${displayName}
Would you like me to add you to the ${displayName} @ Basecamp group chat?`,
                actions: [
                  {
                    id: joinActionId || "",
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
            await (conversation as any).send(conciergeActionsContent, ContentTypeActions);
            return
          }
        } catch (activityError) {
          console.error("❌ Error sending activity Quick Actions:", activityError);
          // Fall through to AI processing
        }
      }
      
      // Get conversation context for this user
      const conversationContext = getConversationContext(senderInboxId);
      const messageWithContext = conversationContext + cleanContent;
      
      // Use AI to detect if this is a greeting/engagement message
      const greetingCheckPrompt = `Is this message a greeting, casual hello, or someone starting a conversation? Examples: "hi", "hello", "hey", "yoooo", "what's up", "sup", "howdy", "good morning", "gm", "yo", "hey there", "bm", "based morning" etc. 

Message: "${cleanContent}"

Respond with just "YES" if it's a greeting/engagement, or "NO" if it's a specific question or request.`;

      const isGreeting = await agent.run(
        greetingCheckPrompt,
        senderInboxId,
        conversationId,
        isGroup,
        senderAddress,
      );

      if (isGreeting && isGreeting.toLowerCase().includes("yes")) {
        console.log("👋 AI detected greeting/engagement, sending Quick Actions...");
        try {
          // Create Quick Actions for welcome message using proper ActionsContent type
          const quickActionsContent: ActionsContent = {
            id: "basecamp_welcome_actions",
            description: "Hi! I'm Rocky the DevConnect Agent. Here are things I can help you with:",
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
                id: "shuttles",
                label: "🚌 Shuttles",
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
              }
            ]
          };

          console.log("🎯 Sending Quick Actions:", JSON.stringify(quickActionsContent, null, 2));
          console.log("🎯 Content type being used:", ContentTypeActions.toString());
          
          // Send Quick Actions with proper content type using the registered codec
          await (conversation as any).send(quickActionsContent, ContentTypeActions);
          console.log(`✅ Sent Quick Actions welcome message`);
          console.log(`✅ Content type used:`, ContentTypeActions.toString());
          
          // Store this exchange in conversation history
          addToConversationHistory(senderInboxId, cleanContent, "Welcome message with Quick Actions sent");
          return; // Exit early, don't process with AI
        } catch (quickActionsError) {
          console.error("❌ Error sending Quick Actions:", quickActionsError);
          // Fallback to regular text
          await conversation.send("Hi! I'm Rocky the DevConnect Agent. I can help you with the Schedule, Set Reminders, or Concierge Support. What would you like to know?");
          addToConversationHistory(senderInboxId, cleanContent, "Welcome message sent (fallback)");
          return;
        }
      }

      // PRIORITY CHECK: Is this ANY kind of question that should be answered?
      const generalQuestionPrompt = `Is this message asking ANY kind of question that needs an informational answer? This includes:

SCHEDULE QUESTIONS:
- "What time does [anything] start/end?"
- "When is [any event/session/activity]?"
- "What's happening on [day]?"
- "Who is speaking at [event]?"
- "What's the schedule for [anything]?"

EVENT/SPEAKER QUESTIONS:
- Questions about Jesse Pollak, Shan Aggarwal, speakers, presenters
- Questions about specific sessions, workshops, activities
- Questions about event logistics, times, locations

GENERAL INFO QUESTIONS:
- "What is [anything]?"
- "How does [anything] work?"
- "Where is [anything]?"
- "Is there [anything]?"
- "Can I [do something]?"

ACTIVITY QUESTIONS:
- Questions about yoga, pickleball, hiking, running, workshops, sessions, builder, payments, trenches, coding, ads, agents, video, roast, mini app, governance, deals, defi, network, coining, students
If it contains ANY question that needs an answer, respond "YES".
If it's just greetings, commands, or statements, respond "NO".

Message: "${cleanContent}"

Respond with only "YES" or "NO".`;

      const hasQuestion = await agent.run(
        generalQuestionPrompt,
        senderInboxId,
        conversationId,
        isGroup,
        senderAddress,
      );
      console.log("🔍 hasQuestion", hasQuestion);
      
      if (hasQuestion && hasQuestion.toLowerCase().includes("yes")) {
        console.log("🎯 AI detected question - processing with full AI agent...");
        
        // Check if this question is about a specific activity group
        const activityQuestionPrompt = `Does this message ask about a specific activity that has a group chat? Look for questions about: yoga, running, pickleball, hiking, builder, payments, trenches, coding, ads, agents, video, roast, mini app, governance, deals, defi, network, coining, students

If it asks about one of these activities, respond with the exact activity keyword.
If not, respond with "NO".

Message: "${cleanContent}"

Respond with only the activity keyword or "NO".`;

        const activityKeyword = await agent.run(
          activityQuestionPrompt,
          senderInboxId,
          conversationId,
          isGroup,
          senderAddress,
        );
        console.log("🔍 activityKeyword", activityKeyword);
        
        // Generate AI response first
        const response = await agent.run(
          messageWithContext,
          senderInboxId,
          conversationId,
          isGroup,
          senderAddress,
        );
        
        // If it's about a specific activity with a group, combine response with join option
        if (activityKeyword && activityKeyword.toLowerCase() !== "no") {
          const { hasGroupChat, getJoinActionId } = await import("./services/agent/tools/activityGroups.js");
          const keyword = activityKeyword.trim().toLowerCase();
          
          if (hasGroupChat(keyword)) {
            const displayName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
            const joinActionId = getJoinActionId(keyword);
            
            const combinedActions: ActionsContent = {
              id: `${keyword}_question_with_join`,
              description: `${response}

Would you like me to add you to the ${displayName} @ Basecamp group chat?`,
              actions: [
                {
                  id: joinActionId || "",
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
            
            await (conversation as any).send(combinedActions, ContentTypeActions);
            console.log(`✅ Sent combined question response with group join option`);
            addToConversationHistory(senderInboxId, cleanContent, `${response} + group join option`);
            return; // Exit early
          }
        }
        
        // If no group join option, send the AI response with follow-up actions
        if (response) {
          const followupActionsContent: ActionsContent = {
            id: "question_response_followup",
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
          
          await (conversation as any).send(followupActionsContent, ContentTypeActions);
          addToConversationHistory(senderInboxId, cleanContent, response);
        }
        
        return; // Exit early - question has been fully handled
      }

      // Use AI to detect if this is a group joining request
      const groupJoinPrompt = `Is this message asking to see, join, or get information about group chats or activity groups? Examples: "join group chats", "show me the groups", "can you show me the group chats", "what groups are available", "I want to join groups", etc.

Message: "${cleanContent}"

Respond with only "YES" or "NO".`;

      const isGroupJoinRequest = await agent.run(
        groupJoinPrompt,
        senderInboxId,
        conversationId,
        isGroup,
        senderAddress,
      );
      console.log("🔍 isGroupJoinRequest", isGroupJoinRequest);
      
      if (isGroupJoinRequest && isGroupJoinRequest.toLowerCase().includes("yes")) {
        console.log("🎯 AI detected group joining request, sending Quick Actions...");
        try {
          const { generateGroupSelectionQuickActions } = await import("./services/agent/tools/activityGroups.js");
          const groupSelectionActions = generateGroupSelectionQuickActions();
          await (conversation as any).send(groupSelectionActions, ContentTypeActions);
          console.log(`✅ Sent group selection Quick Actions`);
          addToConversationHistory(senderInboxId, cleanContent, "Group selection Quick Actions sent");
          return; // Exit early, don't process with AI
        } catch (groupError) {
          console.error("❌ Error sending group Quick Actions:", groupError);
          // Fall through to AI processing
        }
      }

      // Activity questions will be handled by the AI agent using the GetFullSchedule tool

      // Check if this is a casual acknowledgment

      // Urgent message blast system disabled - we now only provide contact information

      // Generate AI response for non-welcome requests
      const response = await agent.run(
        messageWithContext,
        senderInboxId,
        conversationId,
        isGroup,
        senderAddress,
      );

      if (response) {
        console.log(`🔍 AI Response check - contains Quick Actions?: ${response.includes('"contentType":"coinbase.com/actions:1.0"')}`);
        console.log(`🔍 Full AI Response: "${response}"`);
        
        // Check if this is a Quick Actions response
        if (response.includes('"contentType":"coinbase.com/actions:1.0"')) {
          try {
            console.log("🎯 Detected Quick Actions response, parsing...");
            const quickActionsData = JSON.parse(response);
            const actionsContent = quickActionsData.content;
            
            console.log("🎯 Sending Quick Actions:", JSON.stringify(actionsContent, null, 2));
            
            // Send the Quick Actions using Base App's content type
            await conversation.send(actionsContent);
            console.log(`✅ Sent Quick Actions welcome message`);
            
            // Store this exchange in conversation history
            addToConversationHistory(senderInboxId, cleanContent, "Welcome message with Quick Actions sent");
          } catch (quickActionsError) {
            console.error("❌ Error sending Quick Actions:", quickActionsError);
            console.log("🔄 Falling back to regular text response");
            // Fallback to regular text
            await conversation.send("Hi! I'm Rocky the DevConnect Agent. I can help you with the Schedule, Set Reminders, or Concierge Support. What would you like to know?");
          }
        } else {
          // Regular text response with follow-up actions
          console.log("💬 Sending regular text response with follow-up actions");
          
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
          
          await (conversation as any).send(followupActionsContent, ContentTypeActions);
          console.log(`✅ Sent response with follow-up actions`);
          
          // Store this exchange in conversation history
          addToConversationHistory(senderInboxId, cleanContent, response);
        }
      }
    } catch (error) {
      console.error("❌ Error generating or sending response:", error);
      
      // Send fallback message
      try {
        await conversation.send(
          "Sorry, I encountered an error while processing your request. Please try again later."
        );
      } catch (fallbackError) {
        console.error("❌ Error sending fallback message:", fallbackError);
      }
    }
  } catch (error) {
    console.error("❌ Error processing message:", error);
  }
}

// Railway monitoring will handle health checks automatically

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
    
    console.log("🔄 Initializing client...");
    const dbPath = getDbPath("devconnect-agent");
    console.log("🔄 DB path:", dbPath);
    const client = await Client.create(signer, {
      dbEncryptionKey: encryptionKey,
      env: XMTP_ENV as "local" | "dev" | "production",
      dbPath,
      codecs: [new ActionsCodec(), new IntentCodec()],
    });
    
    // Register codecs for Quick Actions
    console.log("🔄 Client initialized with Quick Actions codecs");
    await logAgentDetails(client);
    // Initialize broadcast client
    setBroadcastClient(client);
    
    // Urgent message client disabled - we now only provide contact information
    
    // Initialize group client for activity groups
    setGroupClient(client);
    
    // Initialize sidebar client for sidebar groups
    setSidebarClient(client);
    
    
    // Initialize agent in activity groups
    const { initializeAgentInGroups } = await import("./services/agent/tools/activityGroups.js");
    await initializeAgentInGroups();

    // Initialize reminder dispatcher
    const reminderDispatcher = createReminderDispatcher();
    reminderDispatcher.start(client);
    console.log("🔄 Reminder dispatcher initialized");
    
    // Set up automatic broadcast reminders for all events
    // COMMENTED OUT FOR LOCAL TESTING - autoReminders.js doesn't exist
    // try {
    //   const { setupAutomaticBroadcastReminders } = await import("./services/agent/tools/autoReminders.js");
    //   
    //   console.log("🎯 Setting up automatic event reminders...");
    //   const results = setupAutomaticBroadcastReminders();
    //   console.log(`✅ Set up ${results.filter((r: any) => r.includes('✅')).length} automatic broadcast reminders`);
    //   
    //   // All reminders (including the 9:25 PM test) are set up above
    // } catch (error) {
    //   console.error("❌ Error setting up automatic reminders:", error);
    // }
    // Handle process termination
    const cleanup = () => {
      console.log("🛑 Shutting down agent...");
      reminderDispatcher.stop();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    console.log("👂 Listening for messages...");
    console.log("💬 Agent will only respond to:");
    console.log("  - Direct messages (DMs)");
    console.log(`  - Group messages when mentioned with @${MENTION_HANDLES.split(',')[0]}`);
    
    // Sync conversations before streaming
    console.log("🔄 Syncing conversations...");
    await client.conversations.sync();
    
    // Listen for new conversations to send welcome messages (disabled to prevent double messages)
    // (async () => {
    //   for await (const conversation of conversationStream) {
    //     try {
    //       const isGroup = conversation instanceof Group;
    //       
    //       if (!isGroup) {
    //         // Send welcome message to new DMs
    //         const welcomeMessage = `Hi! I'm the Basecamp 2025 Concierge - your helpful assistant for Basecamp. I can help you with:

    // • Schedule: Get event times, daily agendas for Sept 14-16, 2025
    // • General Info: Event details, logistics, and FAQ
    // • Reminders: Set personal reminders for sessions and activities

    // What would you like to know about Basecamp 2025?

    // Official site: https://www.basecamp2025.xyz 
    // Updates: @base`;

    //         if (conversation) {
    //           await conversation.send(welcomeMessage);
    //           console.log(`✅ Sent welcome message to new DM conversation`);
    //         }
    //       }
    //     } catch (error) {
    //       console.error("❌ Error sending welcome message:", error);
    //     }
    //   }
    // })();

    // Start streaming messages
    console.log("📡 Starting message stream...");
    const stream = await client.conversations.streamAllMessages();
    
    for await (const message of stream) {
    // Skip messages from ourselves
    if (message?.senderInboxId.toLowerCase() === client.inboxId.toLowerCase()) {
      continue;
    }

    // Debug: Log all message types
    console.log(`📨 Message received - Type: ${message?.contentType?.typeId}, Content: ${typeof message?.content}`);
    console.log(`📨 Expected intent type: ${ContentTypeIntent.toString()}`);
    
    // Debug intent messages specifically
    if (message?.contentType?.typeId === "intent") {
      console.log(`🎯 Intent message detected! Content:`, JSON.stringify(message.content, null, 2));
    }

    // Handle Intent messages (Quick Action responses)
    if (message?.contentType?.typeId === ContentTypeIntent.toString() || 
        message?.contentType?.typeId === "coinbase.com/intent:1.0" ||
        message?.contentType?.typeId === "intent") {
      const intentContent = message.content as any;
      const actionId = intentContent.actionId;
      const originalActionsId = intentContent.id;
      
      console.log(`🎯 Received Quick Action intent: ${actionId}`);
      console.log(`🎯 Full intent content:`, JSON.stringify(intentContent, null, 2));
      
      // CRITICAL: Only respond to Quick Actions that Rocky initiated
      // Check if the actions ID starts with Rocky's prefixes (including agent-specific namespacing)
      const agentId = client.inboxId.slice(0, 8);
      const rockyActionPrefixes = [
        'basecamp_welcome_actions',
        'schedule_followup_actions', 
        'broadcast_',
        `rocky_${agentId}_sidebar_invite_`,
        'group_selection_actions',
        'urgent_message_actions'
      ];
      
      // Also check for Rocky-generated action patterns
      const rockyActionPatterns = [
        '_question_with_join',
        '_group_join', 
        '_followup_actions',
        '_followup',
        'question_response_followup',
        'response_followup_actions',
        'concierge_support_actions',
        'join_events_text_confirmation',
        'no_group_join_followup'
      ];
      
      const isRockyGeneratedAction = rockyActionPatterns.some(pattern => 
        originalActionsId?.includes(pattern)
      );
      
      const isRockyAction = rockyActionPrefixes.some(prefix => 
        originalActionsId?.startsWith(prefix)
      );
      
      if (!isRockyAction && !isRockyGeneratedAction) {
        console.log(`⏭️ Skipping intent - not initiated by Rocky (ID: ${originalActionsId})`);
        continue;
      }
      
      // Get conversation to respond
      const conversation = await client.conversations.getConversationById(message.conversationId);
      if (!conversation) continue;
      
      // Handle different action IDs
      switch (actionId) {
        case "schedule":
          // Use AI agent to provide schedule information
          try {
            // First send the schedule information with the link
            const scheduleResponse = `You can view the full schedule at devconnect.org/calendar and sign up for sessions. Feel free to ask me any questions about the schedule and I'll help you craft an epic DevConnect experience.

Examples:
•⁠  ⁠When is DevConnect Opening Ceremony?
•⁠  ⁠When is Builder Nights Buenos Aires?
•⁠  ⁠Tell me about ETH Day
•⁠  ⁠What events are on Thursday?

Just ask naturally - I understand conversational requests!`;
            
            await conversation.send(scheduleResponse);
            
            // Then send the follow-up actions in a separate message
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
            await (conversation as any).send(scheduleFollowupActionsContent, ContentTypeActions);
            addToConversationHistory(message.senderInboxId, "schedule", "Schedule overview requested");
          } catch (error) {
            console.error("❌ Error getting schedule:", error);
            await conversation.send("I'm having trouble accessing the schedule right now. Please try again in a moment!");
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
          await (conversation as any).send(wifiActionsContent, ContentTypeActions);
          break;
        case "shuttles":
          // First send the shuttle information with the link
          await conversation.send(`🚌 Shuttles & Transportation

View transportation information at devconnect.org/calendar for details about getting to La Rural and around Buenos Aires.

Need help with transportation or venue locations? Let me know!`);
          
          // Then send the follow-up actions in a separate message
          const shuttlesFollowupActionsContent: ActionsContent = {
            id: "shuttles_followup_actions",
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
          await (conversation as any).send(shuttlesFollowupActionsContent, ContentTypeActions);
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
          await (conversation as any).send(conciergeActionsContent, ContentTypeActions);
          break;
        
        /* BASECAMP URGENT SUPPORT - COMMENTED OUT FOR DEVCONNECT
        // TODO: Add DevConnect urgent support contact info when available
        case "urgent_yes":
          // Store that user is in urgent mode
          addToConversationHistory(message.senderInboxId, "urgent_yes", "User selected urgent support");
          await conversation.send(`Urgent Support - Coming Soon
          
Contact details will be available closer to the event.`);
          break;
        case "urgent_no":
          await conversation.send(`Non-Urgent Support - Coming Soon
          
Support contact information will be available closer to the event.`);
          break;
        */ // END BASECAMP URGENT SUPPORT
        
        case "join_groups":
          // TODO: Re-enable when DevConnect groups are configured
          await conversation.send("Group joining functionality coming soon! We'll have DevConnect event groups available closer to the event.");
          
          const joinGroupsFollowupActionsContent: ActionsContent = {
            id: "join_groups_followup",
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
          await (conversation as any).send(joinGroupsFollowupActionsContent, ContentTypeActions);
          break;
        
        // TODO: ADD DEVCONNECT 2025 GROUP JOIN CASES HERE
        // When you have DevConnect group IDs, add cases like:
        // case "join_staking_summit":
        //   const { addMemberToActivityGroup } = await import("./services/agent/tools/activityGroups.js");
        //   const result = await addMemberToActivityGroup("staking_summit", message.senderInboxId);
        //   await conversation.send(result);
        //   break;
        
        /* BASECAMP ACTIVITY GROUPS - COMMENTED OUT FOR DEVCONNECT
        case "join_yoga":
          const { addMemberToActivityGroup } = await import("./services/agent/tools/activityGroups.js");
          const yogaResult = await addMemberToActivityGroup("yoga", message.senderInboxId);
          
          const yogaFollowupActionsContent: ActionsContent = {
            id: "yoga_join_followup",
            description: `${yogaResult}

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
          await (conversation as any).send(yogaFollowupActionsContent, ContentTypeActions);
          break;
        case "join_running":
          const { addMemberToActivityGroup: addRunning } = await import("./services/agent/tools/activityGroups.js");
          const runningResult = await addRunning("running", message.senderInboxId);
          
          const runningFollowupActionsContent: ActionsContent = {
            id: "running_join_followup",
            description: `${runningResult}

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
          await (conversation as any).send(runningFollowupActionsContent, ContentTypeActions);
          break;
        case "join_pickleball":
          const { addMemberToActivityGroup: addPickleball } = await import("./services/agent/tools/activityGroups.js");
          const pickleballResult = await addPickleball("pickleball", message.senderInboxId);
          
          const pickleballFollowupActionsContent: ActionsContent = {
            id: "pickleball_join_followup",
            description: `${pickleballResult}

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
          await (conversation as any).send(pickleballFollowupActionsContent, ContentTypeActions);
          break;
        case "join_hiking":
          const { addMemberToActivityGroup: addHiking } = await import("./services/agent/tools/activityGroups.js");
          const hikingResult = await addHiking("hiking", message.senderInboxId);
          
          const hikingFollowupActionsContent: ActionsContent = {
            id: "hiking_join_followup",
            description: `${hikingResult}

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
          await (conversation as any).send(hikingFollowupActionsContent, ContentTypeActions);
          break;
        case "join_builder":
          const { addMemberToActivityGroup: addBuilder } = await import("./services/agent/tools/activityGroups.js");
          const builderResult = await addBuilder("builder", message.senderInboxId);
          await conversation.send(builderResult);
          break;
        case "join_payments":
          const { addMemberToActivityGroup: addPayments } = await import("./services/agent/tools/activityGroups.js");
          const paymentsResult = await addPayments("payments", message.senderInboxId);
          await conversation.send(paymentsResult);
          break;
        case "join_trenches":
          const { addMemberToActivityGroup: addTrenches } = await import("./services/agent/tools/activityGroups.js");
          const trenchesResult = await addTrenches("trenches", message.senderInboxId);
          await conversation.send(trenchesResult);
          break;
        case "join_coding":
          const { addMemberToActivityGroup: addCoding } = await import("./services/agent/tools/activityGroups.js");
          const codingResult = await addCoding("coding", message.senderInboxId);
          await conversation.send(codingResult);
          break;
        case "join_ads":
          const { addMemberToActivityGroup: addAds } = await import("./services/agent/tools/activityGroups.js");
          const adsResult = await addAds("ads", message.senderInboxId);
          await conversation.send(adsResult);
          break;
        case "join_agents":
          const { addMemberToActivityGroup: addAgents } = await import("./services/agent/tools/activityGroups.js");
          const agentsResult = await addAgents("agents", message.senderInboxId);
          await conversation.send(agentsResult);
          break;
        case "join_video":
          const { addMemberToActivityGroup: addVideo } = await import("./services/agent/tools/activityGroups.js");
          const videoResult = await addVideo("video", message.senderInboxId);
          await conversation.send(videoResult);
          break;
        case "join_roast":
          const { addMemberToActivityGroup: addRoast } = await import("./services/agent/tools/activityGroups.js");
          const roastResult = await addRoast("roast", message.senderInboxId);
          await conversation.send(roastResult);
          break;
        case "join_mini_app":
          const { addMemberToActivityGroup: addMiniApp } = await import("./services/agent/tools/activityGroups.js");
          const miniAppResult = await addMiniApp("mini app", message.senderInboxId);
          await conversation.send(miniAppResult);
          break;
        case "join_governance":
          const { addMemberToActivityGroup: addGovernance } = await import("./services/agent/tools/activityGroups.js");
          const governanceResult = await addGovernance("governance", message.senderInboxId);
          await conversation.send(governanceResult);
          break;
        case "join_deals":
          const { addMemberToActivityGroup: addDeals } = await import("./services/agent/tools/activityGroups.js");
          const dealsResult = await addDeals("deals", message.senderInboxId);
          await conversation.send(dealsResult);
          break;
        case "join_defi":
          const { addMemberToActivityGroup: addDefi } = await import("./services/agent/tools/activityGroups.js");
          const defiResult = await addDefi("defi", message.senderInboxId);
          await conversation.send(defiResult);
          break;
        case "join_network":
          const { addMemberToActivityGroup: addNetwork } = await import("./services/agent/tools/activityGroups.js");
          const networkResult = await addNetwork("network", message.senderInboxId);
          await conversation.send(networkResult);
          break;
        case "join_coining":
          const { addMemberToActivityGroup: addCoining } = await import("./services/agent/tools/activityGroups.js");
          const coiningResult = await addCoining("coining", message.senderInboxId);
          await conversation.send(coiningResult);
          break;
        case "join_students":
          const { addMemberToActivityGroup: addStudents } = await import("./services/agent/tools/activityGroups.js");
          const studentsResult = await addStudents("students", message.senderInboxId);
          await conversation.send(studentsResult);
          break;
        */ // END BASECAMP ACTIVITY GROUPS
        
        case "no_group_join":
          const noGroupJoinActionsContent: ActionsContent = {
            id: "no_group_join_followup",
            description: `👍 No problem! Feel free to ask me about other activities or anything else regarding DevConnect 2025.

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
          await (conversation as any).send(noGroupJoinActionsContent, ContentTypeActions);
          break;
        case "broadcast_yes":
          try {
            const { confirmBroadcast } = await import("./services/agent/tools/broadcast.js");
            const result = await confirmBroadcast(message.senderInboxId, message.conversationId);
            await conversation.send(result);
            console.log(`✅ Broadcast confirmation result: "${result}"`);
          } catch (confirmError: any) {
            await conversation.send(`❌ Confirmation failed: ${confirmError.message}`);
            console.error("❌ Confirmation error:", confirmError);
          }
          break;
        case "broadcast_no":
          try {
            const { cancelBroadcast } = await import("./services/agent/tools/broadcast.js");
            const result = await cancelBroadcast(message.senderInboxId);
            await conversation.send(result);
            console.log(`✅ Broadcast cancelled: "${result}"`);
          } catch (cancelError: any) {
            await conversation.send(`❌ Cancel failed: ${cancelError.message}`);
            console.error("❌ Cancel error:", cancelError);
          }
          break;
        case "broadcast_actions_yes":
          try {
            const { confirmBroadcastActions } = await import("./services/agent/tools/broadcast.js");
            const result = await confirmBroadcastActions(message.senderInboxId, message.conversationId);
            await conversation.send(result);
            console.log(`✅ Broadcast actions confirmation result: "${result}"`);
          } catch (confirmError: any) {
            await conversation.send(`❌ Broadcast actions confirmation failed: ${confirmError.message}`);
            console.error("❌ Broadcast actions confirmation error:", confirmError);
          }
          break;
        case "broadcast_actions_no":
          try {
            const { cancelBroadcast } = await import("./services/agent/tools/broadcast.js");
            const result = await cancelBroadcast(message.senderInboxId);
            await conversation.send(result);
            console.log(`✅ Broadcast actions cancelled: "${result}"`);
          } catch (cancelError: any) {
            await conversation.send(`❌ Cancel failed: ${cancelError.message}`);
            console.error("❌ Cancel error:", cancelError);
          }
          break;
        case "broadcast_join_yes":
          try {
            const { confirmBroadcastJoin } = await import("./services/agent/tools/broadcast.js");
            const result = await confirmBroadcastJoin(message.senderInboxId, message.conversationId);
            await conversation.send(result);
            console.log(`✅ Broadcast join confirmation result: "${result}"`);
          } catch (confirmError: any) {
            await conversation.send(`❌ Broadcast join confirmation failed: ${confirmError.message}`);
            console.error("❌ Broadcast join confirmation error:", confirmError);
          }
          break;
        case "broadcast_join_no":
          try {
            const { cancelBroadcast } = await import("./services/agent/tools/broadcast.js");
            const result = await cancelBroadcast(message.senderInboxId);
            await conversation.send(result);
            console.log(`✅ Broadcast join cancelled: "${result}"`);
          } catch (cancelError: any) {
            await conversation.send(`❌ Cancel failed: ${cancelError.message}`);
            console.error("❌ Cancel error:", cancelError);
          }
          break;
        case "confirm_join_events":
          // Handle confirmation to join events
          try {
            const { addMemberToBaseGlobalEvents } = await import("./services/agent/tools/activityGroups.js");
            const joinResult = await addMemberToBaseGlobalEvents(message.senderInboxId);
            await conversation.send(joinResult);
            console.log(`✅ Base Global Events join result: "${joinResult}"`);
          } catch (joinError: any) {
            await conversation.send(`❌ Failed to join Base Global Events: ${joinError.message}`);
            console.error("❌ Join events error:", joinError);
          }
          break;
        case "decline_join_events":
          // Handle decline to join events
          await conversation.send("👍 No problem! Feel free to ask me about the schedule, event information, or anything else regarding Basecamp 2025.");
          break;
        case "show_main_menu":
          // Send the main quick actions menu again
          const mainMenuActionsContent: ActionsContent = {
            id: "basecamp_welcome_actions",
            description: "Hi! I'm Rocky the DevConnect Agent. Here are things I can help you with:",
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
                id: "shuttles",
                label: "🚌 Shuttles",
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
              }
            ]
          };
          await (conversation as any).send(mainMenuActionsContent, ContentTypeActions);
          break;
        case "end_conversation":
          await conversation.send("Great! Message me 👋 if you want to view the option menu again!");
          break;
        default:
          // Handle sidebar group actions with dynamic IDs
          if (actionId.startsWith(`rocky_${agentId}_join_sidebar_`)) {
            const groupId = actionId.replace(`rocky_${agentId}_join_sidebar_`, '');
            console.log(`🎯 User joining sidebar group: ${groupId}`);
            const joinResult = await joinSidebarGroup(groupId, message.senderInboxId);
            await conversation.send(joinResult);
            break;
          }
          
          if (actionId.startsWith(`rocky_${agentId}_decline_sidebar_`)) {
            const groupId = actionId.replace(`rocky_${agentId}_decline_sidebar_`, '');
            console.log(`🎯 User declining sidebar group: ${groupId}`);
            const declineResult = await declineSidebarGroup(groupId, message.senderInboxId);
            await conversation.send(declineResult);
            break;
          }
          
          // Default fallback for unrecognized actions
          await conversation.send("Thanks for your selection!");
      }
      continue;
    }
    
    // Skip non-text messages
    if (message?.contentType?.typeId !== "text") {
      continue;
    }
      
      await handleMessage(message, client as any);
    }

  } catch (error) {
    console.error("❌ Error starting agent:", error);
    process.exit(1);
  }
}

main().catch(console.error);