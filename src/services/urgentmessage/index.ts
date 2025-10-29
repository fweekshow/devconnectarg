import type { Client } from "@xmtp/node-sdk";

import { STAFF_WALLETS } from "@/constants/index.js";
import { XMTPServiceBase } from "@/services/xmtpServiceBase.js";

export class UrgentMessageService extends XMTPServiceBase {
  constructor(client: Client<any>) {
    super(client);
  }

  async forwardUrgentMessage(
    message: string,
    senderInboxId: string,
    currentConversationId: string
  ): Promise<string> {
    try {
      if (!message || message.trim().length === 0) {
        return "❌ Urgent message cannot be empty. Please provide details about your concern.";
      }

      console.log(
        `🚨 Forwarding urgent message from inbox ${senderInboxId}: "${message}"`
      );

      // Get sender identifier
      const senderInfo = await this.getSenderIdentifier(senderInboxId);
      const senderInfoAddress = await this.getFormattedAddress(senderInboxId);

      // Format the urgent message for staff
      const urgentContent = `🚨 URGENT MESSAGE FROM BASECAMP ATTENDEE
  
  From: ${senderInfoAddress}${senderInfo ? ` (${senderInfo})` : ""}
  Time: ${new Date().toLocaleString()}
  Message: ${message.trim()}
  
  Please respond directly to the attendee.`;

      // Use the exact same logic as broadcast system
      await this.client.conversations.sync();
      const conversations = await this.client.conversations.list();

      if (conversations.length === 0) {
        return "❌ No conversations found to send urgent message to. Please contact concierge@base.org directly.";
      }

      let successCount = 0;
      let errorCount = 0;

      // Send only to staff conversations (reverse of broadcast)
      for (const conversation of conversations) {
        try {
          // Skip current conversation
          if (conversation.id === currentConversationId) {
            continue;
          }

          // Check if this conversation is with a staff member
          const peerInboxId = (conversation as any).peerInboxId;

          // Staff basenames for direct matching (keep this for now since it works)

          let isStaff = false;

          // Check if peerInboxId is directly a staff basename (current working method)

          // Check if peerInboxId is directly a staff wallet address
          if (
            peerInboxId &&
            STAFF_WALLETS.includes(peerInboxId.toLowerCase())
          ) {
            console.log(`🔐 Direct staff wallet match: ${peerInboxId}`);
            isStaff = true;
          }
          // Otherwise check using full authorization logic
          else if (peerInboxId) {
            isStaff = await this.isAuthorizedMember(peerInboxId);
          }

          if (isStaff) {
            console.log(
              `📤 Sending urgent message to staff conversation: ${conversation.id} (${peerInboxId})`
            );
            await conversation.send(urgentContent);
            successCount++;
          } else {
            console.log(
              `⏭️ Skipping non-staff conversation: ${conversation.id} (${peerInboxId})`
            );
          }

          // Add small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error: any) {
          console.error(
            `❌ Failed to send urgent message to conversation ${conversation.id}:`,
            error
          );
          errorCount++;
        }
      }

      const resultMessage =
        `✅ Your urgent message has been forwarded to the event staff!\n\n` +
        `📊 Results:\n` +
        `• Delivered to: ${successCount} conversations\n` +
        `• Failed: ${errorCount} conversations\n\n` +
        `The staff will respond directly to you. Thank you for bringing this to our attention!`;

      console.log(
        `🚨 Urgent message forwarding completed: ${successCount} success, ${errorCount} errors`
      );

      return resultMessage;
    } catch (error: any) {
      console.error("❌ Error forwarding urgent message:", error);
      return "❌ Failed to forward urgent message. Please contact concierge@base.org directly.";
    }
  }
}
