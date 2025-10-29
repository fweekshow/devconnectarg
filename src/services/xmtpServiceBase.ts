import { base } from "viem/chains";
import { getName } from "@coinbase/onchainkit/identity";
import { MessageContext } from "@xmtp/agent-sdk";
import type { Client } from "@xmtp/node-sdk";

import { STAFF_WALLETS } from "@/constants/index.js";

export abstract class XMTPServiceBase {
  protected client: Client<any>;

  constructor(client: Client<any>) {
    if (!client) throw new Error("XMTP client is required.");
    this.client = client;
    console.log("✅ XMTPServiceBase initialized with XMTP client.");
  }

  protected async getAddressFromInboxId(
    senderInboxId: string
  ): Promise<string> {
    // Get the user's address from XMTP inbox state
    const inboxState = await this.client.preferences.inboxStateFromInboxIds([
      senderInboxId,
    ]);
    const addressFromInboxId = inboxState[0]?.identifiers[0]?.identifier;
    return addressFromInboxId;
  }

  protected async getFormattedAddress(
    senderInboxId: string
  ): Promise<`0x${string}` | null> {
    const address = await this.getAddressFromInboxId(senderInboxId);
    if (!address) return null;
    const lower = address.toLowerCase();
    return lower.startsWith("0x")
      ? (lower as `0x${string}`)
      : (`0x${lower}` as `0x${string}`);
  }

  protected async getSenderIdentifier(senderInboxId: string): Promise<string> {
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

  protected async isAuthorizedMember(senderInboxId: string): Promise<boolean> {
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
        `🔐 Checking permission for ${formattedAddress}: ${isAuthorized ? "ALLOWED" : "DENIED"}`
      );
      return isAuthorized;
    } catch (err) {
      console.error("❌ Error checking authorization:", err);
      return false;
    }
  }

  async handleTextCallback(
    ctx: MessageContext<string>,
    cleanContent: string
  ): Promise<boolean> {
    console.log("Base class Text Callback");
    return false;
  }

  async handleMessageCallback(ctx: MessageContext<unknown>): Promise<boolean> {
    console.log("Base class Message Callback");
    return false;
  }

  async handleIntentCallback(
    ctx: MessageContext<unknown>,
    actionId: any
  ): Promise<boolean> {
    console.log("Base class Intent Callback");
    return false;
  }
}
