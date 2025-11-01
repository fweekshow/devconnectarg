import { MessageContext } from "@xmtp/agent-sdk";
import {
  RemoteAttachmentCodec,
  type RemoteAttachment,
  type Attachment,
} from "@xmtp/content-type-remote-attachment";
import type { Client } from "@xmtp/node-sdk";
import OpenAI from "openai";

import { TreasureHuntAdapter } from "@/adapters/index.js";
import { ENV } from "@/config/index.js";
import {
  TREASURE_HUNT_CONFIG,
  TREASURE_HUNT_GROUP_IDS,
} from "@/constants/index.js";
import { TreasureHuntTask, UserCurrentTaskResult } from "@/models/index.js";
import { XMTPServiceBase } from "@/services/xmtpServiceBase.js";
import {
  ActionsContent,
  ContentTypeActions,
} from "@/services/xmtp/xmtp-inline-actions/types/index.js";

import { PendingImages } from "./interfaces/index.js";

export class TreasureHuntService extends XMTPServiceBase {
  private pendingTreasureImages = new Map<string, PendingImages>();

  constructor(client: Client<any>) {
    super(client);
  }
  isTreasureHuntGroup(groupId: string): boolean {
    return TREASURE_HUNT_GROUP_IDS.includes(groupId);
  }
  async assignToTreasureHuntGroup(
    senderInboxId: string,
    walletAddress: string
  ): Promise<{
    success: boolean;
    groupId?: string;
    groupNumber?: number;
    message: string;
  }> {
    try {
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
        await this.client.conversations.sync();
        const conversations = await this.client.conversations.list();
        const group = conversations.find((c) => c.id === testGroupId);

        if (!group) {
          console.error(`❌ Test group ${testGroupId} not found`);
          return {
            success: false,
            message:
              "❌ Treasure hunt group not accessible. Please contact support.",
          };
        }

        await (group as any).addMembers([senderInboxId]);
        console.log(
          `✅ Added user ${senderInboxId} to treasure hunt test group`
        );

        // Check if there's an active task now
        const currentTask = await this.ensureAndGetCurrentTask(
          senderInboxId,
          walletAddress
        );

        // Send contextual welcome message to the GROUP CHAT
        let groupWelcomeMessage: string;
        
        if (currentTask?.currentTask && TreasureHuntAdapter.isTaskValid(currentTask.currentTask)) {
          // Task is active now - send it
          setTimeout(async () => {
            await this.sendCurrentTaskToGroup(
              testGroupId,
              senderInboxId,
              walletAddress
            );
          }, 2000);
          groupWelcomeMessage = "🏴‍☠️ Welcome to your Treasure Hunt Group!\n\nYour first challenge is ready - check the message above!";
        } else {
          // No active task - tell them when next one starts
          const allTasks = await TreasureHuntAdapter.getAllTasks();
          const now = new Date();
          const nextTask = allTasks.find(task => {
            const startTime = task.startTime ? new Date(task.startTime) : null;
            return startTime && now < startTime;
          });

          if (nextTask) {
            const startTime = new Date(nextTask.startTime);
            const formattedTime = startTime.toLocaleString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              timeZone: 'America/Argentina/Buenos_Aires'
            });
            groupWelcomeMessage = `🏴‍☠️ Welcome to your Treasure Hunt Group!\n\nYour next task starts at ${formattedTime} Argentina time.\n\nWe'll notify you here when it begins. Stay tuned!`;
          } else {
            groupWelcomeMessage = "🏴‍☠️ Welcome to your Treasure Hunt Group!\n\nWe'll notify you here when the next challenge begins. Stay tuned!";
          }
        }

        // Send welcome message to the group chat
        setTimeout(async () => {
          await group.send(groupWelcomeMessage);
        }, 1000);

        // Return simple success message for DM
        return {
          success: true,
          groupId: testGroupId,
          groupNumber: 1,
          message: "Welcome to the Base Hunt! You've been added to your team's group chat. Get ready to work together with your teammates as you dive into the adventure!",
        };
      } catch (addError: any) {
        if (addError.message?.includes("already")) {
          return {
            success: true,
            message:
              "✅ You're already in a treasure hunt group! Check your group chat for your current challenge.",
          };
        }
        throw addError;
      }
    } catch (error: any) {
      console.error("❌ Error assigning to treasure hunt group:", error);
      return {
        success: false,
        message: "❌ Failed to join treasure hunt. Please try again later.",
      };
    }
  }

  async validateTreasureHuntSubmission(
    task: UserCurrentTaskResult,
    imageUrl: string
  ): Promise<{ valid: boolean; response: string; confidence: number }> {
    try {
      const currentTask = task.currentTask!;
      if (TreasureHuntAdapter.isTaskValid(currentTask)) {
        const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });
        console.log(`🤖 Calling OpenAI Vision for task: ${currentTask.title}`);
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `${currentTask.validationPrompt}

Please also provide a confidence score (0-100) for your assessment at the end of your response.

Format: YES/NO, explanation, then "Confidence: X%"`,
                },
                {
                  type: "image_url",
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
          max_tokens: 300,
        });

        const aiResponse = completion.choices[0].message.content || "";
        console.log(`🤖 OpenAI response: ${aiResponse}`);

        // Parse YES/NO from response
        const isYes = aiResponse.toUpperCase().includes("YES");

        // Extract confidence score (look for "Confidence: 85%" or "85%")
        const confidenceMatch = aiResponse.match(/(?:confidence:?\s*)?(\d+)%/i);
        const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;

        console.log(
          `📊 Validation result: ${isYes ? "YES" : "NO"}, Confidence: ${confidence}%`
        );

        // Validation succeeds only if:
        // 1. AI says YES
        // 2. Confidence >= 60%
        const valid =
          isYes && confidence >= TREASURE_HUNT_CONFIG.minConfidenceThreshold;

        return {
          valid,
          response: aiResponse,
          confidence,
        };
      }
      return {
        valid: false,
        response: "Submitting before start time or after end time",
        confidence: 0,
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

  private async downloadAndDecryptAttachment(
    remoteAttachment: RemoteAttachment
  ) {
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

      const attachment = (await RemoteAttachmentCodec.load(
        remoteAttachment,
        this.client as any
      )) as Attachment;

      // Convert to base64 data URI for OpenAI
      const base64 = Buffer.from(attachment.data).toString("base64");
      const dataUri = `data:${attachment.mimeType};base64,${base64}`;

      console.log(
        `✅ Decrypted: ${attachment.filename} (${attachment.mimeType})`
      );
      return {
        dataUri,
        mimeType: attachment.mimeType,
        filename: attachment.filename,
      };
    } catch (error: any) {
      console.error("❌ Decryption error:", error);
      return null;
    }
  }

  async handleTreasureHuntImageSubmission(
    groupId: string,
    senderInboxId: string,
    walletAddress: string,
    remoteAttachment: RemoteAttachment | Attachment
  ): Promise<string> {
    try {
      console.log(
        `🎯 Processing treasure hunt image submission in group ${groupId}`
      );

      let imageDataUri: string;
      if ("url" in remoteAttachment) {
        const decrypted = await this.downloadAndDecryptAttachment(
          remoteAttachment as RemoteAttachment
        );
        if (!decrypted)
          return "❌ Failed to process your image. Please try uploading again.";
        imageDataUri = decrypted.dataUri;
        console.log(`✅ Decrypted remote attachment: ${decrypted.filename}`);
      } else {
        // Inline attachment (< 1MB, less common)
        const attachment = remoteAttachment as Attachment;
        const base64 = Buffer.from(attachment.data).toString("base64");
        imageDataUri = `data:${attachment.mimeType};base64,${base64}`;
        console.log(`✅ Using inline attachment: ${attachment.filename}`);
      }

      // Get the CURRENTLY ACTIVE task based on time (including 15-min grace period before AND after)
      console.log(`🔍 Finding currently active task based on time...`);
      const allTasks = await TreasureHuntAdapter.getAllTasks();
      const now = new Date();
      const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes
      
      const activeTask = allTasks.find(task => {
        const startTime = task.startTime ? new Date(task.startTime) : null;
        const endTime = task.endTime ? new Date(task.endTime) : null;
        if (!startTime || !endTime) return false;
        
        // Task is valid from 15 min BEFORE start to 15 min AFTER end
        const startTimeWithGrace = new Date(startTime.getTime() - GRACE_PERIOD_MS);
        const endTimeWithGrace = new Date(endTime.getTime() + GRACE_PERIOD_MS);
        return now >= startTimeWithGrace && now <= endTimeWithGrace;
      });

      if (!activeTask) {
        return `❌ No treasure hunt is currently active. Please wait for the next challenge announcement!`;
      }

      console.log(`🎯 Active task found: Task ${activeTask.id} - ${activeTask.title}`);

      // Now get user's current task assignment for tracking
      let current = await this.ensureAndGetCurrentTask(
        senderInboxId,
        walletAddress
      );
      
      if (!current) {
        return `❌ Submission not validated`;
      }

      // Validate against the ACTIVE task
      const validation = await this.validateTreasureHuntSubmission(
        { ...current, currentTask: activeTask },
        imageDataUri
      );

      if (
        validation.valid &&
        validation.confidence >= TREASURE_HUNT_CONFIG.minConfidenceThreshold
      ) {
        // Success! Advance to next task
        console.log(
          `✅ Task ${activeTask.id} validated successfully (${validation.confidence}% confidence)`
        );

        await TreasureHuntAdapter.submitCurrentTask(senderInboxId);

        const stats =
          await TreasureHuntAdapter.calculateUserStatsForToday(senderInboxId);
        const totalTasks = await TreasureHuntAdapter.getTotalTasksForDate();
        
        // Find the NEXT task by time (not by user progress)
        const sortedTasks = [...allTasks].sort((a, b) => {
          const aStart = a.startTime ? new Date(a.startTime).getTime() : 0;
          const bStart = b.startTime ? new Date(b.startTime).getTime() : 0;
          return aStart - bStart;
        });
        
        const nextTaskByTime = sortedTasks.find(task => {
          const startTime = task.startTime ? new Date(task.startTime) : null;
          return startTime && now < startTime;
        });

        if (!nextTaskByTime) {
          return `🎉 CONGRATULATIONS! You completed the Treasure Hunt!

🏆 All ${totalTasks} challenges done.

${validation.response}

📊 Final Score: ${stats.totalPoints ?? 0}`;
        }

        const nextStartTime = new Date(nextTaskByTime.startTime);
        const formattedTime = nextStartTime.toLocaleString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'America/Argentina/Buenos_Aires'
        });

        return `✅ Task ${activeTask.id} Complete! (+${
          activeTask.points
        } points)

${validation.response}

📊 Progress: ${stats.totalCompleted ?? 0}/${totalTasks} tasks completed

⏰ Next challenge starts at ${formattedTime} Argentina time. Stay tuned for the announcement! 🏴‍☠️`;
      } else {
        // Validation failed
        console.log(
          `❌ Validation failed (${validation.confidence}% confidence)`
        );

        return `❌ Submission not validated

${validation.response}

🔄 Try again! Make sure your photo clearly shows: ${activeTask.description}

💡 Hint: ${activeTask.hint}`;
      }
    } catch (error: any) {
      console.error("❌ Error handling image submission:", error);
      return "❌ Failed to process your submission. Please try again.";
    }
  }

  async generateTaskSubmissionAction(task: TreasureHuntTask) {
    if (!task) return null;

    return {
      id: `treasure_hunt_task_${task.id}`,
      description: `🏴‍☠️ Task ${task.id}: ${task.title}

${task.description}

📸 How to submit:
1. Take a photo that matches the challenge
2. Tag @devconnectarg.base.eth [image]
3. Rocky will validate it automatically

💡 Hint: ${task.hint}`,
      actions: [
        {
          id: "treasure_hunt_status",
          label: "📊 My Progress & Next Task",
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

  private async ensureAndGetCurrentTask(
    senderInboxId: string,
    walletAddress: string
  ): Promise<UserCurrentTaskResult | null> {
    let task = await TreasureHuntAdapter.getUserCurrentTask(senderInboxId);

    if (!task) {
      await TreasureHuntAdapter.initializeCurrentTaskForToday(
        senderInboxId,
        walletAddress
      );
      task = await TreasureHuntAdapter.getUserCurrentTask(senderInboxId);
    }
    return task;
  }

  async sendCurrentTaskToGroup(
    groupId: string,
    senderInboxId: string,
    walletAddress: string
  ) {
    try {
      const task = await this.ensureAndGetCurrentTask(
        senderInboxId,
        walletAddress
      );
      if (task?.currentTask) {
        const taskAction = await this.generateTaskSubmissionAction(
          task.currentTask
        );
        const group =
          await this.client.conversations.getConversationById(groupId);
        if (group) {
          await (group as any).send(taskAction, ContentTypeActions);
          console.log(
            `✅ Sent task ${task.currentTask.id} to group ${groupId}`
          );
        }
      } else {
        console.log("❌ Failed to generate task action");
        return;
      }
    } catch (error) {
      console.error("❌ Error sending task to group:", error);
    }
  }

  async getTreasureHuntStatus(
    senderInboxId: string,
    walletAddress: string
  ): Promise<string> {
    try {
      const task = await this.ensureAndGetCurrentTask(
        senderInboxId,
        walletAddress
      );
      const stats =
        await TreasureHuntAdapter.calculateUserStatsForToday(senderInboxId);
      const totalTasks = await TreasureHuntAdapter.getTotalTasksForDate();

      const allDone =
        await TreasureHuntAdapter.areAllTasksCompletedForToday(senderInboxId);
      if (allDone) {
        return `🎉 All your tasks for today are completed!

📊 Progress: ${stats.totalCompleted ?? 0}/${totalTasks} tasks completed
⭐ Points: ${stats.totalPoints ?? 0}`;
      }

      const currentTask = task?.currentTask;

      if (!currentTask) {
        // No active task - check when next one starts
        const allTasks = await TreasureHuntAdapter.getAllTasks();
        const now = new Date();
        const nextTask = allTasks.find(t => {
          const startTime = t.startTime ? new Date(t.startTime) : null;
          return startTime && now < startTime;
        });

        if (nextTask) {
          const startTime = new Date(nextTask.startTime);
          const formattedTime = startTime.toLocaleString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'America/Argentina/Buenos_Aires'
          });
          return `📊 Your Progress

📈 Tasks Completed: ${stats.totalCompleted ?? 0}/${totalTasks}
⭐ Points Earned: ${stats.totalPoints ?? 0}

⏰ Next challenge starts at ${formattedTime} Argentina time

You'll be notified here when it begins! 🏴‍☠️`;
        }
        return `📊 Your Progress

📈 Tasks Completed: ${stats.totalCompleted ?? 0}/${totalTasks}
⭐ Points Earned: ${stats.totalPoints ?? 0}

⏸️ No active challenges right now. Stay tuned for announcements! 🏴‍☠️`;
      }

      // Show progress for active task (no spoilers about future tasks)
      return `📊 Your Progress

📈 Tasks Completed: ${stats.totalCompleted ?? 0}/${totalTasks}
⭐ Points Earned: ${stats.totalPoints ?? 0}

🎯 Current Challenge: ${currentTask.title}

You know what to do - submit your photo! 📸`;
    } catch (error) {
      console.error("❌ Error getting treasure hunt status:", error);
      return "❌ Failed to retrieve treasure hunt status.";
    }
  }

  private isAttachmentMessage(contentTypeId?: string): boolean {
    if (!contentTypeId) return false;
    const isRemote =
      contentTypeId.includes("remoteStaticAttachment") ||
      contentTypeId.includes("RemoteAttachment");
    const isInline = contentTypeId.includes("attachment") && !isRemote;
    if (isRemote || isInline) {
      console.log(`📸 Detected ${isRemote ? "remote" : "inline"} attachment!`);
    }
    return isRemote || isInline;
  }

  async handleTextCallback(
    ctx: MessageContext<string>,
    cleanContent: string
  ): Promise<boolean> {
    try {
      const senderInboxId = ctx.message.senderInboxId;
      const conversationId = ctx.conversation.id;
      const walletAddress = (await ctx.getSenderAddress()) || "";
      const isGroup = ctx.isGroup();

      // Check for treasure hunt image submissions (mention in treasure hunt group)
      if (
        isGroup &&
        cleanContent.trim() === "" &&
        this.isTreasureHuntGroup(conversationId)
      ) {
        console.log(
          `🏴‍☠️ Mention in treasure hunt group - checking Map for stored image...`
        );

        // Check the Map for the user's stored image
        const key = `${conversationId}:${senderInboxId}`;
        const storedImage = this.pendingTreasureImages.get(key);

        console.log(
          `🗺️ Map has ${this.pendingTreasureImages.size} pending images`
        );
        console.log(`🔑 Looking for key: ${key}`);

        if (storedImage) {
          const ageSeconds = (Date.now() - storedImage.timestamp) / 1000;
          console.log(
            `✅ Found stored image from ${ageSeconds.toFixed(1)}s ago!`
          );

          const response = await this.handleTreasureHuntImageSubmission(
            conversationId,
            senderInboxId,
            walletAddress,
            storedImage.content
          );

          // Remove from Map (one-time use)
          this.pendingTreasureImages.delete(key);
          console.log(`🗑️ Removed image from Map`);

          if (response && response.trim() !== "") {
            await ctx.sendText(response);
            return true;
          }
        } else {
          console.log(`❌ No stored image in Map - showing current task...`);

          const status = await this.getTreasureHuntStatus(
            senderInboxId,
            walletAddress
          );
          await ctx.sendText(status);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Error in treasure hunt text callback");
      await ctx.sendText(
        "Sorry, I encountered an error while processing your request. Please try again later."
      );
      return true;
    }
  }

  async handleMessageCallback(ctx: MessageContext<unknown>): Promise<boolean> {
    try {
      const isGroup = ctx.isGroup();
      const contentTypeId = ctx.message.contentType?.typeId;

      if (this.isAttachmentMessage(contentTypeId)) {
        if (ctx.message.senderInboxId === this.client.inboxId) {
          return true;
        }
        const isTreasureGroup = this.isTreasureHuntGroup(ctx.conversation.id);
        console.log(
          `🔍 Is group: ${isGroup}, Is treasure hunt: ${isTreasureGroup}, Group ID: ${ctx.conversation.id}`
        );
        if (!isGroup || !isTreasureGroup) {
          console.log(`⏭️ Not a treasure hunt group, skipping attachment`);
          return false; // Not a treasure hunt group
        }

        const key = `${ctx.conversation.id}:${ctx.message.senderInboxId}`;
        this.pendingTreasureImages.set(key, {
          content: ctx.message.content,
          messageId: ctx.message.id,
          timestamp: Date.now(),
        });
        console.log(
          `📸 Stored image for user ${ctx.message.senderInboxId.substring(0, 12)}... (waiting for mention)`
        );

        // Clean up old images (older than 2 minutes)
        for (const [k, v] of this.pendingTreasureImages.entries()) {
          if (Date.now() - v.timestamp > 120000) {
            this.pendingTreasureImages.delete(k);
          }
        }
        return false;
      }

      return false;
    } catch (err) {
      console.error("Error in treasure hunt message callback");
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
      const walletAddress = (await ctx.getSenderAddress()) || "";
      const senderInboxId = ctx.message.senderInboxId;
      switch (actionId) {
        case "treasure_hunt":
          // If clicked from within a treasure hunt group, just show current task
          if (ctx.isGroup() && this.isTreasureHuntGroup(ctx.conversation.id)) {
            console.log(
              `🏴‍☠️ Treasure hunt button clicked in group - showing current task`
            );

            const allDone =
              await TreasureHuntAdapter.areAllTasksCompletedForToday(
                senderInboxId
              );
            if (allDone) {
              const stats =
                await TreasureHuntAdapter.calculateUserStatsForToday(
                  senderInboxId
                );
              const totalTasks =
                await TreasureHuntAdapter.getTotalTasksForDate();

              const completedActions: ActionsContent = {
                id: "treasure_hunt_completed",
                description: `🎉 All your tasks for today are completed!\n\n📊 Progress: ${
                  stats.totalCompleted ?? 0
                }/${totalTasks} tasks completed\n⭐ Points: ${
                  stats.totalPoints ?? 0
                }`,
                actions: [
                  {
                    id: "treasure_hunt_status",
                    label: "📊 My Progress & Next Task",
                    style: "secondary" as const,
                  },
                  {
                    id: "treasure_hunt_rules",
                    label: "📖 Rules",
                    style: "secondary" as const,
                  },
                ],
              };

              const group = await ctx.client.conversations.getConversationById(
                ctx.conversation.id
              );
              if (group) {
                await (group as any).send(completedActions, ContentTypeActions);
              }
              return true;
            }

            await this.sendCurrentTaskToGroup(
              ctx.conversation.id,
              senderInboxId,
              walletAddress
            );
            return true;
          }

          // In DM - assign to group with welcome message
          const treasureHuntResult = await this.assignToTreasureHuntGroup(
            senderInboxId,
            walletAddress
          );

          const treasureHuntActionsContent: ActionsContent = {
            id: "treasure_hunt_join_response",
            description: `${treasureHuntResult.message}
        
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
          const treasureHuntConversation =
            await ctx.client.conversations.getConversationById(
              ctx.conversation.id
            );
          if (treasureHuntConversation) {
            await (treasureHuntConversation as any).send(
              treasureHuntActionsContent,
              ContentTypeActions
            );
          }
          return true;

        case "treasure_hunt_status":
          const statusMessage = await this.getTreasureHuntStatus(
            senderInboxId,
            walletAddress
          );
          await ctx.sendText(statusMessage);
          return true;

        case "treasure_hunt_rules":
          await ctx.sendText(`🏴‍☠️ Treasure Hunt Rules

📋 How it works:
1️⃣ Complete photo challenges within their time windows
2️⃣ Send photos in this group chat and tag @devconnectarg.base.eth
3️⃣ Rocky validates each photo with AI
4️⃣ Pass requires YES + 60%+ confidence
5️⃣ When a task window ends, we'll broadcast the next challenge to this group
6️⃣ First team to complete all tasks wins!

⏱️ Each task has a specific time window - complete it before time runs out!
📣 You'll be notified here when new challenges begin!
⭐ Most tasks worth 10 points each

🎯 Work together and have fun! 🍀`);
          return true;
      }
      return false;
    } catch (err) {
      console.error("Error in treasure intent callback");
      await ctx.sendText(
        "Sorry, I encountered an error while processing your request. Please try again later."
      );
      return true;
    }
  }
}
