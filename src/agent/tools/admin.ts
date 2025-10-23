import { getName } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';
import { STAFF_WALLETS } from "../../../constant.js";

export async function addMembersToGroup(
  groupId: string,
  walletAddresses: string[],
  senderInboxId: string,
  client: any
): Promise<string> {
  try {
    // Convert inbox ID to wallet address for authorization check
    let senderAddress = "";
    try {
      const inboxState = await client.preferences.inboxStateFromInboxIds([senderInboxId]);
      const addressFromInboxId = inboxState[0]?.identifiers[0]?.identifier;
      
      if (addressFromInboxId) {
        senderAddress = addressFromInboxId.toLowerCase().startsWith('0x') 
          ? addressFromInboxId.toLowerCase()
          : `0x${addressFromInboxId}`.toLowerCase();
      }
    } catch (error) {
      console.warn("⚠️ Could not resolve inbox ID to address:", error);
    }
    
    // Check if sender is authorized using existing STAFF_WALLETS
    const isAuthorized = senderAddress && STAFF_WALLETS.includes(senderAddress);
    
    if (!isAuthorized) {
      return `❌ Unauthorized. Only staff members can add users to groups.\n\nSender address: ${senderAddress || 'Could not resolve'}\nAuthorized staff: ${STAFF_WALLETS.length} members`;
    }

    // Validate wallet addresses
    const validAddresses = walletAddresses.filter(addr => 
      addr.startsWith('0x') && addr.length === 42
    );

    if (validAddresses.length === 0) {
      return "❌ No valid wallet addresses provided. Addresses must start with 0x and be 42 characters long.";
    }

    // Get the group first
    const group = await client.conversations.getConversationById(groupId);
    
    if (!group) {
      return `❌ Group not found. Please check the group ID: ${groupId}`;
    }

    // Look up Base app identities and try to add members
    const results: string[] = [];
    const successfulAdds: string[] = [];
    const failedAdds: string[] = [];
    
    for (const address of validAddresses) {
      try {
        const basename = await getName({ 
          address: address as `0x${string}`,
          chain: base
        });
        
        if (basename) {
          console.log(`✅ Found Base app user ${address} (${basename})`);
          
          // Try to add the user to the group using their wallet address
          // XMTP should handle the conversion internally
          try {
            await (group as any).addMembers([address]);
            successfulAdds.push(`${address} (${basename})`);
            results.push(`✅ ${address} (${basename}) → Added to group`);
            console.log(`✅ Successfully added ${address} (${basename}) to group`);
          } catch (addError: any) {
            failedAdds.push(`${address} (${basename}) - ${addError.message}`);
            results.push(`❌ ${address} (${basename}) → Failed: ${addError.message}`);
            console.log(`❌ Failed to add ${address} (${basename}): ${addError.message}`);
          }
        } else {
          results.push(`⚠️ ${address} → No basename found, trying anyway`);
          console.log(`⚠️ No basename found for ${address}, trying to add anyway`);
          
          // Try to add even without basename
          try {
            await (group as any).addMembers([address]);
            successfulAdds.push(address);
            results.push(`✅ ${address} → Added to group (no basename)`);
            console.log(`✅ Successfully added ${address} to group (no basename)`);
          } catch (addError: any) {
            failedAdds.push(`${address} - ${addError.message}`);
            results.push(`❌ ${address} → Failed: ${addError.message}`);
            console.log(`❌ Failed to add ${address}: ${addError.message}`);
          }
        }
      } catch (error) {
        results.push(`❌ ${address} → Error: ${error}`);
        failedAdds.push(`${address} - ${error}`);
        console.error(`❌ Error processing ${address}:`, error);
      }
    }

    // Build result message
    let resultMessage = `🔍 Base App Group Management Results for Group ${groupId}:\n\n`;
    resultMessage += results.join('\n');
    
    if (successfulAdds.length > 0) {
      resultMessage += `\n\n✅ Successfully added ${successfulAdds.length} members:\n`;
      resultMessage += successfulAdds.map(addr => `• ${addr}`).join('\n');
    }
    
    if (failedAdds.length > 0) {
      resultMessage += `\n\n❌ Failed to add ${failedAdds.length} members:\n`;
      resultMessage += failedAdds.map(addr => `• ${addr}`).join('\n');
    }
    
    return resultMessage;

  } catch (error: any) {
    console.error(`❌ Error in addMembersToGroup:`, error);
    return `❌ An error occurred while processing the request.`;
  }
}
