import type { Client } from "@xmtp/node-sdk";
import { getName } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';
import { STAFF_WALLETS } from "@/constant.js";

// Store the client reference for urgent message functionality
let urgentMessageClient: Client<any> | null = null;

export function setUrgentMessageClient(client: Client<any>) {
  urgentMessageClient = client;
}

// Check if someone is staff (using wallet addresses)
async function isStaffMember(senderInboxId: string): Promise<boolean> {
  // STAFF WALLET ADDRESSES - Event staff and organizers
  
  try {
    if (!urgentMessageClient) return false;
    
    // Get the user's address from XMTP inbox state
    const inboxState = await urgentMessageClient.preferences.inboxStateFromInboxIds([senderInboxId]);
    const addressFromInboxId = inboxState[0]?.identifiers[0]?.identifier;
    
    if (!addressFromInboxId) return false;
    
    // Ensure address is properly formatted
    const formattedAddress = addressFromInboxId.toLowerCase().startsWith('0x') 
      ? addressFromInboxId.toLowerCase()
      : `0x${addressFromInboxId}`.toLowerCase();
    
    // Check if wallet address is in staff list
    const isStaff = STAFF_WALLETS.includes(formattedAddress);
    console.log(`🔐 Checking staff status for ${formattedAddress}: ${isStaff ? 'STAFF' : 'NOT STAFF'}`);
    return isStaff;
    
  } catch (error) {
    return false;
  }
}

// Function to resolve inbox ID to basename with fallback to wallet address
async function getSenderIdentifier(senderInboxId: string): Promise<{ address: string; basename?: string }> {
  try {
    if (!urgentMessageClient) {
      return { address: `inbox-${senderInboxId.slice(0, 6)}...` };
    }
    
    // Get the user's address from XMTP inbox state
    const inboxState = await urgentMessageClient.preferences.inboxStateFromInboxIds([senderInboxId]);
    const addressFromInboxId = inboxState[0]?.identifiers[0]?.identifier;
    
    if (!addressFromInboxId) {
      return { address: `inbox-${senderInboxId.slice(0, 6)}...` };
    }
    
    // Ensure address is properly formatted
    const formattedAddress = addressFromInboxId.toLowerCase().startsWith('0x') 
      ? addressFromInboxId as `0x${string}`
      : `0x${addressFromInboxId}` as `0x${string}`;
    
    try {
      // Try to resolve address to basename
      const basename = await getName({ 
        address: formattedAddress, 
        chain: base 
      });
      
      return { 
        address: formattedAddress, 
        basename: basename || undefined 
      };
      
    } catch (basenameError) {
      return { address: formattedAddress };
    }
    
  } catch (error) {
    return { address: `inbox-${senderInboxId.slice(0, 6)}...` };
  }
}

// Main function to forward urgent message to staff
export async function forwardUrgentMessage(
  message: string,
  senderInboxId: string,
  currentConversationId: string
): Promise<string> {
  try {
    if (!urgentMessageClient) {
      return "❌ Urgent message system not initialized. Please try again later.";
    }

    if (!message || message.trim().length === 0) {
      return "❌ Urgent message cannot be empty. Please provide details about your concern.";
    }

    console.log(`🚨 Forwarding urgent message from inbox ${senderInboxId}: "${message}"`);

    // Get sender identifier
    const senderInfo = await getSenderIdentifier(senderInboxId);

    // Format the urgent message for staff
    const urgentContent = `🚨 URGENT MESSAGE FROM BASECAMP ATTENDEE

From: ${senderInfo.address}${senderInfo.basename ? ` (${senderInfo.basename})` : ''}
Time: ${new Date().toLocaleString()}
Message: ${message.trim()}

Please respond directly to the attendee.`;

    // Use the exact same logic as broadcast system
    await urgentMessageClient.conversations.sync();
    const conversations = await urgentMessageClient.conversations.list();
    
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
        if (peerInboxId && STAFF_WALLETS.includes(peerInboxId.toLowerCase())) {
          console.log(`🔐 Direct staff wallet match: ${peerInboxId}`);
          isStaff = true;
        }
        // Otherwise check using full authorization logic
        else if (peerInboxId) {
          isStaff = await isStaffMember(peerInboxId);
        }
        
        if (isStaff) {
          console.log(`📤 Sending urgent message to staff conversation: ${conversation.id} (${peerInboxId})`);
          await conversation.send(urgentContent);
          successCount++;
        } else {
          console.log(`⏭️ Skipping non-staff conversation: ${conversation.id} (${peerInboxId})`);
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`❌ Failed to send urgent message to conversation ${conversation.id}:`, error);
        errorCount++;
      }
    }

    const resultMessage = `✅ Your urgent message has been forwarded to the event staff!\n\n` +
      `📊 Results:\n` +
      `• Delivered to: ${successCount} conversations\n` +
      `• Failed: ${errorCount} conversations\n\n` +
      `The staff will respond directly to you. Thank you for bringing this to our attention!`;

    console.log(`🚨 Urgent message forwarding completed: ${successCount} success, ${errorCount} errors`);
    
    return resultMessage;
    
  } catch (error: any) {
    console.error("❌ Error forwarding urgent message:", error);
    return "❌ Failed to forward urgent message. Please contact concierge@base.org directly.";
  }
}