import type { Client } from "@xmtp/node-sdk";
import { 
  RemoteAttachmentCodec,
  AttachmentCodec,
  ContentTypeRemoteAttachment,
  ContentTypeAttachment,
  type RemoteAttachment,
  type Attachment
} from "@xmtp/content-type-remote-attachment";
import OpenAI from "openai";

// Import treasure hunt data and functions from the model
import { 
  TREASURE_HUNT_CONFIG, 
  TREASURE_HUNT_TASKS, 
  TREASURE_HUNT_GROUP_IDS,
  isTreasureHuntGroup,
  assignToTreasureHuntGroup,
  getUserTreasureHuntGroup,
  recordTaskCompletion,
  getTreasureHuntLeaderboard
} from "../../models/treasureHunt.js";

// Store the client reference for treasure hunt management
let treasureHuntClient: Client<any> | null = null;

export function setTreasureHuntClient(client: Client<any>) {
  treasureHuntClient = client;
}

// TREASURE_HUNT_CONFIG is now imported from the model

// TREASURE_HUNT_TASKS is now imported from the model

// TREASURE_HUNT_GROUP_IDS and isTreasureHuntGroup are now imported from the model

// assignToTreasureHuntGroup is now imported from the model

// This is a tools-specific version that handles XMTP client operations
export async function assignToTreasureHuntGroupWithClient(userInboxId: string): Promise<{
  success: boolean;
  groupId?: string;
  groupNumber?: number;
  message: string;
}> {
  try {
    if (!treasureHuntClient) {
      return {
        success: false,
        message: "❌ Treasure hunt system not initialized. Please try again later.",
      };
    }

    // TODO: Check database if user is already in a group
    // const existingAssignment = await checkUserAssignment(userInboxId);
    // if (existingAssignment) {
    //   return { success: false, message: "You're already in a treasure hunt group!" };
    // }

    // For now, assign to test group
    const testGroupId = TREASURE_HUNT_GROUP_IDS[0];
    
    if (!testGroupId) {
      return {
        success: false,
        message: "🏴‍☠️ Treasure Hunt groups not yet created. Check back soon!",
      };
    }
    
    // Add user to the test group
    try {
      await treasureHuntClient.conversations.sync();
      const conversations = await treasureHuntClient.conversations.list();
      const group = conversations.find(c => c.id === testGroupId);
      
      if (!group) {
        console.error(`❌ Test group ${testGroupId} not found`);
        return {
          success: false,
          message: "❌ Treasure hunt group not accessible. Please contact support.",
        };
      }
      
      await (group as any).addMembers([userInboxId]);
      console.log(`✅ Added user ${userInboxId} to treasure hunt test group`);
      
      // TODO: Get group's current progress from database
      // const groupProgress = await getGroupProgress(testGroupId);
      // const currentTaskIndex = groupProgress.current_task_index;
      const currentTaskIndex = 0; // Placeholder
      const completedTasks = 0; // Placeholder
      
      const currentTask = TREASURE_HUNT_TASKS[currentTaskIndex];
      
      // TODO: Record in database
      // await recordParticipant(userInboxId, testGroupId);
      
      // Send the group's CURRENT task (not always task 1)
      setTimeout(async () => {
        await sendCurrentTaskToGroup(testGroupId);
      }, 2000);
      
      // Contextual welcome message based on progress
      const welcomeMessage = currentTaskIndex === 0 && completedTasks === 0
        ? "Welcome to the Base Hunt! You've been added to your team's group chat. Get ready to work together with your teammates as you dive into the adventure!"
        : `Welcome to the Base Hunt! You've been added to your team's group chat. Your team is currently working on Task ${currentTaskIndex + 1}: ${currentTask.title}. Jump in and help them complete it!`;
      
      return {
        success: true,
        groupId: testGroupId,
        groupNumber: 1,
        message: welcomeMessage,
      };
      
    } catch (addError: any) {
      console.log(`❌ Error adding to treasure hunt group: ${addError.message}`);
      
      if (addError.message?.includes('already') || addError.message?.includes('duplicate')) {
        return {
          success: true,
          message: "✅ You're already in a treasure hunt group! Check your group chat for your current challenge.",
        };
      } else if (addError.message?.includes('Failed to verify all installations') || addError.code === 'GenericFailure') {
        console.log(`⚠️ Installation verification failed for treasure hunt group - user is likely already in group`);
        return {
          success: true,
          message: "✅ You're already in a treasure hunt group! Check your group chat for your current challenge.",
        };
      } else {
        console.log(`❌ Unknown error for treasure hunt group:`, addError);
        throw addError;
      }
    }

  } catch (error: any) {
    console.error("❌ Error assigning to treasure hunt group:", error);
    return {
      success: false,
      message: "❌ Failed to join treasure hunt. Please try again later.",
    };
  }
}

/**
 * Validate a treasure hunt photo submission
 * Uses OpenAI Vision to check if the photo matches the task requirements
 * Returns valid=true only if confidence >= 60%
 */
export async function validateTreasureHuntSubmission(
  groupId: string,
  taskIndex: number,
  imageUrl: string,
  submittedBy: string
): Promise<{
  valid: boolean;
  response: string;
  confidence: number;
}> {
  try {
    const task = TREASURE_HUNT_TASKS[taskIndex];
    
    if (!task) {
      return {
        valid: false,
        response: "Invalid task index",
        confidence: 0,
      };
    }

    // Call OpenAI Vision API
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    console.log(`🤖 Calling OpenAI Vision for task: ${task.title}`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { 
            type: "text", 
            text: `${task.validationPrompt}

Please also provide a confidence score (0-100) for your assessment at the end of your response.

Format: YES/NO, explanation, then "Confidence: X%"`
          },
          { 
            type: "image_url", 
            image_url: { url: imageUrl }
          }
        ]
      }],
      max_tokens: 300
    });
    
    const aiResponse = completion.choices[0].message.content || "";
    console.log(`🤖 OpenAI response: ${aiResponse}`);
    
    // Parse YES/NO from response
    const isYes = aiResponse.toUpperCase().includes("YES");
    
    // Extract confidence score (look for "Confidence: 85%" or "85%")
    const confidenceMatch = aiResponse.match(/(?:confidence:?\s*)?(\d+)%/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
    
    console.log(`📊 Validation result: ${isYes ? 'YES' : 'NO'}, Confidence: ${confidence}%`);
    
    // Validation succeeds only if:
    // 1. AI says YES
    // 2. Confidence >= 60%
    const valid = isYes && confidence >= TREASURE_HUNT_CONFIG.minConfidenceThreshold;
    
    // TODO: Store submission in database
    // await storeSubmission({
    //   groupId,
    //   taskIndex,
    //   imageUrl,
    //   submittedBy,
    //   aiResponse,
    //   isValid: valid,
    //   confidence
    // });
    
    return {
      valid,
      response: aiResponse,
      confidence,
    };

  } catch (error: any) {
    console.error("❌ Error validating submission:", error);
    return {
      valid: false,
      response: `❌ Validation error: ${error.message}`,
      confidence: 0,
    };
  }
}

/**
 * Get the current task for a group
 */
export async function getCurrentTask(groupId: string): Promise<typeof TREASURE_HUNT_TASKS[0] | null> {
  try {
    // TODO: Query database for group's current_task_index
    // const group = await getGroupProgress(groupId);
    // return TREASURE_HUNT_TASKS[group.current_task_index];
    
    return null;
  } catch (error) {
    console.error("❌ Error getting current task:", error);
    return null;
  }
}

/**
 * Move group to next task after successful validation
 */
export async function advanceGroupToNextTask(groupId: string): Promise<boolean> {
  try {
    // TODO: Update database - increment current_task_index
    // await db.query(
    //   'UPDATE treasure_hunt_groups SET current_task_index = current_task_index + 1 WHERE xmtp_group_id = $1',
    //   [groupId]
    // );
    
    return false;
  } catch (error) {
    console.error("❌ Error advancing group:", error);
    return false;
  }
}

/**
 * Check if a group has completed all tasks
 */
export async function isGroupComplete(groupId: string): Promise<boolean> {
  try {
    // TODO: Check if current_task_index >= total tasks
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Get leaderboard/progress stats
 */
// getTreasureHuntLeaderboard is now imported from the model

/**
 * Download and decrypt a remote attachment from XMTP
 * Returns a base64 data URI that can be sent to OpenAI Vision
 */
export async function downloadAndDecryptAttachment(
  remoteAttachment: RemoteAttachment
): Promise<{ dataUri: string; mimeType: string; filename: string } | null> {
  try {
    console.log(`🔄 Downloading attachment from: ${remoteAttachment.url}`);
    
    // Fetch the encrypted file from the remote URL
    const response = await fetch(remoteAttachment.url);
    if (!response.ok) {
      console.error(`❌ Failed to fetch: ${response.statusText}`);
      return null;
    }
    
    const encryptedData = await response.arrayBuffer();
    console.log(`📦 Downloaded ${encryptedData.byteLength} bytes`);
    
    // Load the RemoteAttachment and decrypt it
    const attachment = await RemoteAttachmentCodec.load(remoteAttachment, treasureHuntClient as any) as Attachment;
    
    // Convert to base64 data URI for OpenAI
    const base64 = Buffer.from(attachment.data).toString('base64');
    const dataUri = `data:${attachment.mimeType};base64,${base64}`;
    
    console.log(`✅ Decrypted: ${attachment.filename} (${attachment.mimeType})`);
    return {
      dataUri,
      mimeType: attachment.mimeType,
      filename: attachment.filename
    };
    
  } catch (error: any) {
    console.error("❌ Decryption error:", error);
    return null;
  }
}

/**
 * Handle image submission in treasure hunt group
 * Called when user sends an image with @mention in a treasure hunt group
 */
export async function handleTreasureHuntImageSubmission(
  groupId: string,
  userInboxId: string,
  remoteAttachment: RemoteAttachment | Attachment,
  messageId: string
): Promise<string> {
  try {
    console.log(`🎯 Processing treasure hunt image submission in group ${groupId}`);
    
    // TODO: Get group's current task from database
    // const groupProgress = await getGroupProgress(groupId);
    // const currentTaskIndex = groupProgress.current_task_index;
    const currentTaskIndex = 0; // Placeholder
    
    const task = TREASURE_HUNT_TASKS[currentTaskIndex];
    if (!task) {
      return "❌ Invalid task state. Please contact support.";
    }
    
    // Download and decrypt the image
    let imageDataUri: string;
    
    // Check if it's a remote attachment or inline attachment
    if ('url' in remoteAttachment) {
      // Remote attachment (most common) - download and decrypt
      const decrypted = await downloadAndDecryptAttachment(remoteAttachment as RemoteAttachment);
      if (!decrypted) {
        return "❌ Failed to process your image. Please try uploading again.";
      }
      imageDataUri = decrypted.dataUri;
      console.log(`✅ Decrypted remote attachment: ${decrypted.filename}`);
    } else {
      // Inline attachment (< 1MB, less common)
      const attachment = remoteAttachment as Attachment;
      const base64 = Buffer.from(attachment.data).toString('base64');
      imageDataUri = `data:${attachment.mimeType};base64,${base64}`;
      console.log(`✅ Using inline attachment: ${attachment.filename}`);
    }
    
    // Validate the image
    console.log(`🔍 Validating image for task: ${task.title}`);
    const validation = await validateTreasureHuntSubmission(
      groupId,
      currentTaskIndex,
      imageDataUri,
      userInboxId
    );
    
    // TODO: Store submission in database regardless of validation result
    
    if (validation.valid && validation.confidence >= TREASURE_HUNT_CONFIG.minConfidenceThreshold) {
      // Success! Advance to next task
      console.log(`✅ Task ${currentTaskIndex} validated successfully (${validation.confidence}% confidence)`);
      
      // TODO: Advance group to next task in database
      // await advanceGroupToNextTask(groupId);
      
      const nextTaskIndex = currentTaskIndex + 1;
      if (nextTaskIndex >= TREASURE_HUNT_CONFIG.totalTasks) {
        // Group completed all tasks!
        return `🎉 CONGRATULATIONS! Your team completed the Treasure Hunt!

🏆 You found all ${TREASURE_HUNT_CONFIG.totalTasks} items!

${validation.response}

Check the leaderboard to see your ranking! 📊`;
      } else {
        const nextTask = TREASURE_HUNT_TASKS[nextTaskIndex];
        return `✅ Task ${currentTaskIndex + 1} Complete! (+${task.points} points)

${validation.response}

🎯 Next Challenge: **${nextTask.title}**
${nextTask.description}

💡 Hint: ${nextTask.hint}

📊 Progress: ${nextTaskIndex + 1}/${TREASURE_HUNT_CONFIG.totalTasks} tasks completed`;
      }
    } else {
      // Validation failed
      console.log(`❌ Task ${currentTaskIndex} validation failed (${validation.confidence}% confidence)`);
      
      return `❌ Submission not validated

${validation.response}

🔄 Try again! Make sure your photo clearly shows: ${task.description}

💡 Hint: ${task.hint}`;
    }
    
  } catch (error: any) {
    console.error("❌ Error handling image submission:", error);
    return "❌ Failed to process your submission. Please try again.";
  }
}

/**
 * Generate Quick Action for submitting current task
 * Shows current task description and progress
 */
export function generateTaskSubmissionAction(groupId: string, taskIndex: number) {
  const task = TREASURE_HUNT_TASKS[taskIndex];
  
  if (!task) return null;
  
  return {
    id: `treasure_hunt_task_${taskIndex}`,
    description: `🏴‍☠️ Task ${taskIndex + 1}/${TREASURE_HUNT_CONFIG.totalTasks}: ${task.title}

${task.description}

📸 How to submit:
1. Take a photo that matches the challenge
2. Tag @devconnectarg.base.eth [image]
3. Rocky will validate it automatically

💡 Hint: ${task.hint}`,
    actions: [
      {
        id: "treasure_hunt_status",
        label: "📊 View Progress",
        style: "secondary" as const,
      },
      {
        id: "treasure_hunt_rules",
        label: "📖 Rules",
        style: "secondary" as const,
      },
    ],
  };
}

/**
 * Send current task Quick Action to treasure hunt group
 */
export async function sendCurrentTaskToGroup(groupId: string): Promise<void> {
  try {
    if (!treasureHuntClient) {
      console.error("❌ Treasure hunt client not initialized");
      return;
    }
    
    // TODO: Get current task index from database
    const currentTaskIndex = 0; // Placeholder
    
    const taskAction = generateTaskSubmissionAction(groupId, currentTaskIndex);
    if (!taskAction) {
      console.error("❌ Failed to generate task action");
      return;
    }
    
    const group = await treasureHuntClient.conversations.getConversationById(groupId);
    if (group) {
      // Import ContentTypeActions
      const { ContentTypeActions } = await import("../../../xmtp-inline-actions/types/ActionsContent.js");
      await (group as any).send(taskAction, ContentTypeActions);
      console.log(`✅ Sent task ${currentTaskIndex + 1} to group ${groupId}`);
    }
  } catch (error) {
    console.error("❌ Error sending task to group:", error);
  }
}

/**
 * Get current task status/progress for a group
 * Returns formatted text response
 */
export async function getTreasureHuntStatus(groupId: string): Promise<string> {
  try {
    // TODO: Get progress from database
    const currentTaskIndex = 0; // Placeholder
    const completedTasks = 0; // Placeholder
    const totalPoints = 0; // Placeholder
    
    const currentTask = TREASURE_HUNT_TASKS[currentTaskIndex];
    
    if (!currentTask) {
      return "❌ No active treasure hunt found.";
    }
    
    return `📊 Progress: ${completedTasks}/${TREASURE_HUNT_CONFIG.totalTasks} tasks completed
⭐ Points: ${totalPoints}

🎯 Current Task ${currentTaskIndex + 1}: ${currentTask.title}
${currentTask.description}

💡 Hint: ${currentTask.hint}

📸 Send a photo and tag @devconnectarg.base.eth to submit!`;
    
  } catch (error) {
    console.error("❌ Error getting treasure hunt status:", error);
    return "❌ Failed to retrieve treasure hunt status.";
  }
}

