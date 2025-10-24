import type { Client } from "@xmtp/node-sdk";
import { getName } from "@coinbase/onchainkit/identity";
import { base } from "viem/chains";

import type { ActionsContent } from "@/services/xmtp/xmtp-inline-actions/types";
import { STAFF_WALLETS } from "@/constants";
import { XMTPAgent } from "@/services/xmtp/xmtp-agent";
import { formatWalletAddress } from "@/utils/address";
import { PendingBroadcast } from "./interfaces";

export class BrodcastService {
  private client: Client<any>;
  private pendingBroadcasts = new Map<string, PendingBroadcast>();
  private broadcastTitle = "BASECAMP 2025";

  constructor(xmtpAgent: XMTPAgent) {
    if (!xmtpAgent) {
      throw new Error(
        "XMTPAgent instance is required to initialize BroadcastService."
      );
    }
    const client = xmtpAgent.getClient();
    if (!client) {
      throw new Error("XMTP client could not be initialized from XMTPAgent.");
    }

    this.client = client;

    console.log(
      "✅ BroadcastService initialized successfully with XMTP client."
    );
  }

  private async getAddressFromInboxId(senderInboxId: string): Promise<string> {
    // Get the user's address from XMTP inbox state
    const inboxState = await this.client.preferences.inboxStateFromInboxIds([
      senderInboxId,
    ]);
    const addressFromInboxId = inboxState[0]?.identifiers[0]?.identifier;
    return addressFromInboxId;
  }

  private async getFormattedAddress(
    senderInboxId: string
  ): Promise<`0x${string}` | null> {
    const address = await this.getAddressFromInboxId(senderInboxId);
    if (!address) return null;
    return formatWalletAddress(address);
  }

  private async isAuthorizedBroadcaster(
    senderInboxId: string
  ): Promise<boolean> {
    try {
      const formattedAddress = await this.getFormattedAddress(senderInboxId);
      if (!formattedAddress) {
        console.log(
          "⚠️ Could not resolve wallet address from inbox ID for authorization"
        );
        return false;
      }
      const isAuthorized = STAFF_WALLETS.map((wallet) =>
        wallet.toLowerCase()
      ).includes(formattedAddress);
      console.log(
        `🔐 Checking broadcast permission for ${formattedAddress}: ${isAuthorized ? "ALLOWED" : "DENIED"}`
      );
      return isAuthorized;
    } catch (err) {
      console.error("❌ Error checking broadcast authorization:", err);
      return false;
    }
  }

  private async getSenderIdentifier(senderInboxId: string): Promise<string> {
    try {
      console.log(
        `🔍 Resolving sender identifier for inbox ${senderInboxId}...`
      );
      const formattedAddress = await this.getFormattedAddress(senderInboxId);
      if (!formattedAddress) {
        console.log(
          "⚠️ Could not resolve wallet address from inbox ID for authorization"
        );
        return `inbox-${senderInboxId.slice(0, 6)}...`;
      }
      try {
        // Try to resolve address to basename using OnchainKit
        const basename = await getName({
          address: formattedAddress,
          chain: base,
        });

        // If basename exists, use it; otherwise fall back to truncated address
        const displayName =
          basename ||
          `${formattedAddress.slice(0, 6)}...${formattedAddress.slice(-4)}`;

        console.log(`✅ Final display name: ${displayName}`);
        return displayName;
      } catch (basenameError) {
        console.log(
          `⚠️ Basename resolution failed, using wallet address:`,
          basenameError
        );
        return `${formattedAddress.slice(0, 6)}...${formattedAddress.slice(-4)}`;
      }
    } catch (err) {
      console.error(`❌ Failed to get sender identifier:`, err);
      return `inbox-${senderInboxId.slice(0, 6)}...`;
    }
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
      if (!(await this.isAuthorizedBroadcaster(senderInboxId))) {
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

  async cancelBroadcast(senderInboxId: string): Promise<string> {
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
      if (!(await this.isAuthorizedBroadcaster(senderInboxId))) {
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
      if (!(await this.isAuthorizedBroadcaster(senderInboxId))) {
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

      if (!(await this.isAuthorizedBroadcaster(senderInboxId))) {
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
}
