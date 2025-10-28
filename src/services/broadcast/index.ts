import { MessageContext } from "@xmtp/agent-sdk";
import type { Client } from "@xmtp/node-sdk";

import {
  ContentTypeActions,
  type ActionsContent,
} from "@/services/xmtp/xmtp-inline-actions/types";
import { XMTPServiceBase } from "@/services/xmtpServiceBase";

import { PendingBroadcast } from "./interfaces";

export class BrodcastService extends XMTPServiceBase {
  private pendingBroadcasts = new Map<string, PendingBroadcast>();
  private broadcastTitle = "DEVCONNECT 2025";

  constructor(client: Client<any>) {
    super(client);
  }

  private storePendingBroadcast(pending: PendingBroadcast) {
    this.pendingBroadcasts.set(pending.senderInboxId, pending);
  }

  private async sendToDMs(
    content: string | ActionsContent,
    excludeConversationId?: string
  ): Promise<{
    success: number;
    failed: number;
    total: number;
    message: string;
  }> {
    await this.client.conversations.sync();
    const conversations = await this.client.conversations.list();

    if (conversations.length === 0) {
      console.log("⚠️ No conversations found to broadcast to.");
      return {
        success: 0,
        failed: 0,
        total: 0,
        message: "⚠️ No conversations found to broadcast to.",
      };
    }
    let success = 0;
    let failed = 0;

    for (const conv of conversations) {
      try {
        if (conv.id === excludeConversationId) continue;
        if (conv.constructor.name === "Group") {
          console.log(`⏭️ Skipping group conversation: ${conv.id}`);
          continue;
        }

        if (typeof content === "string") {
          await conv.send(content);
        } else {
          await (conv as any).send(content, "coinbase.com/actions:1.0");
        }

        success++;
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        console.error(
          `❌ Failed to send broadcast to conversation ${conv.id}:`,
          err
        );
        failed++;
      }
    }

    return { success, failed, total: conversations.length, message: "" };
  }

  async previewBroadcast(
    message: string,
    senderInboxId: string,
    currentConversationId: string
  ): Promise<string> {
    try {
      if (!message || message.trim().length === 0) {
        return "❌ Broadcast message cannot be empty. Use: /broadcast [your message]";
      }
      if (!(await this.isAuthorizedMember(senderInboxId))) {
        return "❌ Access denied. You are not authorized to send broadcast messages.";
      }
      const senderName = await this.getSenderIdentifier(senderInboxId);
      const broadcastContent = `📢 Announcement\n\n${message.trim()}\n\n---\nSent by: ${senderName}`;

      // Store pending broadcast
      this.storePendingBroadcast({
        message: message.trim(),
        senderInboxId,
        conversationId: currentConversationId,
        senderName,
        formattedContent: broadcastContent,
      });

      // Show preview and ask for confirmation with Quick Actions
      const previewActionsContent: ActionsContent = {
        id: "broadcast_confirmation",
        description: `📋 BROADCAST PREVIEW\n\n${broadcastContent}\n\n📊 Will be sent to all conversations.\n\nShould I send the message?`,
        actions: [
          {
            id: "broadcast_yes",
            label: "✅ Yes, Send",
            style: "primary",
          },
          {
            id: "broadcast_no",
            label: "❌ No, Cancel",
            style: "secondary",
          },
        ],
      };
      return JSON.stringify({
        contentType: "coinbase.com/actions:1.0",
        content: previewActionsContent,
      });
    } catch (err) {
      console.error("❌ Error creating broadcast preview:", err);
      return "❌ Failed to create broadcast preview. Please try again later.";
    }
  }

  async confirmBroadcast(senderInboxId: string): Promise<string> {
    try {
      const pending = this.pendingBroadcasts.get(senderInboxId);
      if (!pending) {
        return "❌ No pending broadcast found. Use /broadcast [message] first.";
      }
      console.log(
        `📢 Confirming broadcast from ${senderInboxId}: "${pending.message}"`
      );

      const { success, failed, total, message } = await this.sendToDMs(
        pending.formattedContent,
        pending.conversationId
      );
      if (total === 0) {
        return message;
      }
      // Clear pending broadcast
      this.pendingBroadcasts.delete(senderInboxId);
      const resultMessage =
        `✅ Broadcast sent successfully!\n\n` +
        `📊 Results:\n` +
        `• Delivered to: ${success} DM conversations\n` +
        `• Failed: ${failed} conversations\n` +
        `• Total conversations: ${total}`;

      console.log(
        `📢 Broadcast completed: ${success} success, ${failed} errors`
      );
      return resultMessage;
    } catch (err) {
      console.error("❌ Error confirming broadcast:", err);
      return "❌ Failed to send broadcast. Please try again later.";
    }
  }

  cancelBroadcast(senderInboxId: string): string {
    try {
      const pending = this.pendingBroadcasts.get(senderInboxId);

      if (!pending) {
        return "❌ No pending broadcast to cancel.";
      }
      this.pendingBroadcasts.delete(senderInboxId);
      console.log(`🚫 Broadcast cancelled by ${senderInboxId}`);

      return "✅ Broadcast cancelled successfully.";
    } catch (err) {
      console.error("❌ Error cancelling broadcast:", err);
      return "❌ Failed to cancel broadcast. Please try again later.";
    }
  }

  async previewBroadcastActions(
    message: string,
    senderInboxId: string,
    currentConversationId: string
  ): Promise<string> {
    try {
      if (!message || message.trim().length === 0) {
        return "❌ Broadcast message cannot be empty. Use: /broadcastactions [your message]";
      }
      if (!(await this.isAuthorizedMember(senderInboxId))) {
        return "❌ Access denied. You are not authorized to send broadcast messages.";
      }
      const senderName = await this.getSenderIdentifier(senderInboxId);
      const broadcastContent = `📢 ${this.broadcastTitle} BROADCAST\n\n${message.trim()}\n\n---\nSent by: ${senderName}`;

      this.storePendingBroadcast({
        message: message.trim(),
        senderInboxId,
        conversationId: currentConversationId,
        senderName,
        formattedContent: broadcastContent,
      });
      // Show preview and ask for confirmation with Quick Actions
      const previewActionsContent: ActionsContent = {
        id: "broadcast_actions_confirmation",
        description: `📋 BROADCAST WITH QUICK ACTIONS PREVIEW\n\n${broadcastContent}\n\n📊 Will be sent to all conversations with quick action buttons.\n\nShould I send the message?`,
        actions: [
          {
            id: "broadcast_actions_yes",
            label: "✅ Yes, Send with Actions",
            style: "primary",
          },
          {
            id: "broadcast_actions_no",
            label: "❌ No, Cancel",
            style: "secondary",
          },
        ],
      };

      return JSON.stringify({
        contentType: "coinbase.com/actions:1.0",
        content: previewActionsContent,
      });
    } catch (err) {
      console.error("❌ Error creating broadcast actions preview:", err);
      return "❌ Failed to create broadcast actions preview. Please try again later.";
    }
  }

  async confirmBroadcastActions(senderInboxId: string): Promise<string> {
    try {
      const pending = this.pendingBroadcasts.get(senderInboxId);
      if (!pending) {
        return "❌ No pending broadcast found. Use /broadcastactions [message] first.";
      }
      console.log(
        `📢 Confirming broadcast with actions from ${senderInboxId}: "${pending.message}"`
      );

      // Create the quick actions content for the broadcast with direct yes/no
      const broadcastActionsContent: ActionsContent = {
        id: "basecamp_broadcast_actions",
        description: pending.formattedContent,
        actions: [
          {
            id: "confirm_join_events",
            label: "✅ Yes, Join Group",
            style: "primary",
          },
          {
            id: "decline_join_events",
            label: "❌ No, Thanks",
            style: "secondary",
          },
        ],
      };

      const { success, failed, total, message } = await this.sendToDMs(
        broadcastActionsContent,
        pending.conversationId
      );
      if (total === 0) {
        return message;
      }
      // Clear pending broadcast
      this.pendingBroadcasts.delete(senderInboxId);

      const resultMessage =
        `✅ Broadcast with quick actions sent successfully!\n\n` +
        `📊 Results:\n` +
        `• Delivered to: ${success} conversations\n` +
        `• Failed: ${failed} conversations\n` +
        `• Total conversations: ${total}`;

      console.log(
        `📢 Broadcast with actions completed: ${success} success, ${failed} errors`
      );
      return resultMessage;
    } catch (err) {
      console.error("❌ Error confirming broadcast with actions:", err);
      return "❌ Failed to send broadcast with actions. Please try again later.";
    }
  }

  async previewBroadcastJoin(
    message: string,
    senderInboxId: string,
    currentConversationId: string
  ): Promise<string> {
    try {
      if (!message || message.trim().length === 0) {
        return "❌ Broadcast message cannot be empty. Use: /broadcastjoin [your message]";
      }

      // Check authorization
      if (!(await this.isAuthorizedMember(senderInboxId))) {
        return "❌ Access denied. You are not authorized to send broadcast messages.";
      }

      // Get sender identifier
      const senderName = await this.getSenderIdentifier(senderInboxId);

      // Format the broadcast content with join instruction
      const broadcastContent = `📢 ${this.broadcastTitle} BROADCAST\n\n${message.trim()}\n\n💡 To join Base @ DevConnect, simply reply with: "Join Base @ DevConnect"\n\n---\nSent by: ${senderName}`;

      // Store pending broadcast
      this.storePendingBroadcast({
        message: message.trim(),
        senderInboxId,
        conversationId: currentConversationId,
        senderName,
        formattedContent: broadcastContent,
      });

      // Show preview and ask for confirmation with Quick Actions
      const previewActionsContent: ActionsContent = {
        id: "broadcast_join_confirmation",
        description: `📋 BROADCAST WITH JOIN INSTRUCTION PREVIEW\n\n${broadcastContent}\n\n📊 Will be sent to all conversations.\n\nShould I send the message?`,
        actions: [
          {
            id: "broadcast_join_yes",
            label: "✅ Yes, Send with Join Instruction",
            style: "primary",
          },
          {
            id: "broadcast_join_no",
            label: "❌ No, Cancel",
            style: "secondary",
          },
        ],
      };

      return JSON.stringify({
        contentType: "coinbase.com/actions:1.0",
        content: previewActionsContent,
      });
    } catch (err) {
      console.error("❌ Error creating broadcast join preview:", err);
      return "❌ Failed to create broadcast join preview. Please try again later.";
    }
  }

  async confirmBroadcastJoin(senderInboxId: string): Promise<string> {
    try {
      const pending = this.pendingBroadcasts.get(senderInboxId);

      if (!pending) {
        return "❌ No pending broadcast found. Use /broadcastjoin [message] first.";
      }

      console.log(
        `📢 Confirming broadcast with join instruction from ${senderInboxId}: "${pending.message}"`
      );

      const { success, failed, total, message } = await this.sendToDMs(
        pending.formattedContent,
        pending.conversationId
      );
      if (total === 0) {
        return message;
      }

      // Clear pending broadcast
      this.pendingBroadcasts.delete(senderInboxId);

      const resultMessage =
        `✅ Broadcast with join instruction sent successfully!\n\n` +
        `📊 Results:\n` +
        `• Delivered to: ${success} DM conversations\n` +
        `• Failed: ${failed} conversations\n` +
        `• Total conversations: ${total}`;

      console.log(
        `📢 Broadcast with join instruction completed: ${success} success, ${failed} errors`
      );
      return resultMessage;
    } catch (err) {
      console.error(
        "❌ Error confirming broadcast with join instruction:",
        err
      );
      return "❌ Failed to send broadcast with join instruction. Please try again later.";
    }
  }

  async sendBroadcast(
    message: string,
    senderInboxId: string,
    currentConversationId: string
  ): Promise<string> {
    try {
      if (!message || message.trim().length === 0) {
        return "❌ Broadcast message cannot be empty. Use: /broadcast [your message]";
      }

      console.log(
        `📢 Initiating broadcast from inbox ${senderInboxId}: "${message}"`
      );

      const addressFromInboxId =
        await this.getAddressFromInboxId(senderInboxId);

      if (!addressFromInboxId) {
        console.log("⚠️ Could not resolve wallet address from inbox ID");
        return "❌ Could not verify sender address.";
      }

      console.log(
        `📋 Resolved inbox ID to wallet address: ${addressFromInboxId}`
      );

      if (!(await this.isAuthorizedMember(senderInboxId))) {
        return "❌ Access denied. You are not authorized to send broadcast messages.";
      }

      const senderName = await this.getSenderIdentifier(senderInboxId);

      const broadcastContent = `📢 ${this.broadcastTitle} BROADCAST\n\n${message.trim()}\n\n---\nSent by: ${senderName}`;

      const {
        success,
        failed,
        total,
        message: errorMessage,
      } = await this.sendToDMs(broadcastContent, currentConversationId);
      if (total === 0) {
        return errorMessage;
      }

      const resultMessage =
        `✅ Broadcast sent successfully!\n\n` +
        `📊 Results:\n` +
        `• Delivered to: ${success} DM conversations\n` +
        `• Failed: ${failed} conversations\n` +
        `• Total conversations: ${total}`;

      console.log(
        `📢 Broadcast completed: ${success} success, ${failed} errors`
      );

      return resultMessage;
    } catch (error: any) {
      console.error("❌ Error sending broadcast:", error);
      return "❌ Failed to send broadcast message. Please try again later.";
    }
  }

  async handleTextCallback(
    ctx: MessageContext<string>,
    cleanContent: string
  ): Promise<boolean> {
    try {
      const senderInboxId = ctx.message.senderInboxId;
      const conversationId = ctx.conversation.id;
      const isGroup = ctx.isGroup();

      if (!isGroup && cleanContent.toLowerCase().startsWith("/broadcast ")) {
        const broadcastMessage = cleanContent.substring(11).trim();
        try {
          const result = await this.previewBroadcast(
            broadcastMessage,
            senderInboxId,
            conversationId
          );
          let actionsData:any;
          try{
            actionsData = JSON.parse(result);
          }
          catch(err){
            await ctx.sendText(result)
            return true;
          }
          const broadcastConversation =
          await ctx.client.conversations.getConversationById(conversationId);
          if (broadcastConversation) {
            await broadcastConversation.send(
              actionsData.content,
              ContentTypeActions
            );
            console.log(`✅ Sent broadcast preview with quick actions`);
            return true
          }
        } catch (broadcastError: any) {
          await ctx.sendText(
            `❌ Broadcast preview failed: ${broadcastError.message}`
          );
          console.error("❌ Broadcast error:", broadcastError);
          return true
        }
        return false;
      }
      return false
    } catch (err) {
      console.error("Error in broadcast text callback");
      await ctx.sendText(
        "Sorry, I encountered an error while processing your request. Please try again later."
      );
      return true
    }
  }

  async handleIntentCallback(
    ctx: MessageContext<unknown>,
    actionId: any
  ): Promise<boolean> {
    try {
      switch (actionId) {
        case "broadcast_yes":
          try {
            const result = await this.confirmBroadcast(
              ctx.message.senderInboxId
            );
            await ctx.sendText(result);
            console.log(
              `✅ Broadcast confirmed and sent by ${ctx.message.senderInboxId}`
            );
          } catch (error: any) {
            await ctx.sendText(
              `❌ Broadcast confirmation failed: ${error.message}`
            );
            console.error("❌ Broadcast confirmation error:", error);
          }
          return true

        case "broadcast_no":
          try {
            const result = this.cancelBroadcast(ctx.message.senderInboxId);
            await ctx.sendText(result);
            console.log(
              `🚫 Broadcast cancelled by ${ctx.message.senderInboxId}`
            );
          } catch (error: any) {
            await ctx.sendText(
              `❌ Broadcast cancellation failed: ${error.message}`
            );
            console.error("❌ Broadcast cancellation error:", error);
          }
          return true;

        case "broadcast_actions_yes":
          try {
            const result = await this.confirmBroadcastActions(
              ctx.message.senderInboxId
            );
            await ctx.sendText(result);
            console.log(
              `✅ Broadcast with actions confirmed and sent by ${ctx.message.senderInboxId}`
            );
          } catch (error: any) {
            await ctx.sendText(
              `❌ Broadcast with actions confirmation failed: ${error.message}`
            );
            console.error(
              "❌ Broadcast with actions confirmation error:",
              error
            );
          }
          return true;

        case "broadcast_actions_no":
          try {
            const result = this.cancelBroadcast(ctx.message.senderInboxId);
            await ctx.sendText(result);
            console.log(
              `🚫 Broadcast with actions cancelled by ${ctx.message.senderInboxId}`
            );
          } catch (error: any) {
            await ctx.sendText(
              `❌ Broadcast with actions cancellation failed: ${error.message}`
            );
            console.error(
              "❌ Broadcast with actions cancellation error:",
              error
            );
          }
          return true;

        case "broadcast_join_yes":
          try {
            const result = await this.confirmBroadcastJoin(
              ctx.message.senderInboxId
            );
            await ctx.sendText(result);
            console.log(
              `✅ Broadcast with join instruction confirmed and sent by ${ctx.message.senderInboxId}`
            );
          } catch (error: any) {
            await ctx.sendText(
              `❌ Broadcast with join instruction confirmation failed: ${error.message}`
            );
            console.error(
              "❌ Broadcast with join instruction confirmation error:",
              error
            );
          }
          return true;

        case "broadcast_join_no":
          try {
            const result = this.cancelBroadcast(ctx.message.senderInboxId);
            await ctx.sendText(result);
            console.log(
              `🚫 Broadcast with join instruction cancelled by ${ctx.message.senderInboxId}`
            );
          } catch (error: any) {
            await ctx.sendText(
              `❌ Broadcast with join instruction cancellation failed: ${error.message}`
            );
            console.error(
              "❌ Broadcast with join instruction cancellation error:",
              error
            );
          }
          return true;
      }
      return false
    } catch (err) {
      console.error("Error in broadcast intent callback");
      await ctx.sendText(
        "Sorry, I encountered an error while processing your request. Please try again later."
      );
      return true
    }
  }
}
