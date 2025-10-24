import type { Client } from "@xmtp/node-sdk";
import { XMTPAgent } from "@/services/xmtp/xmtp-agent";

export abstract class XMTPServiceBase {
  protected client: Client<any>;

  constructor(xmtpAgent: XMTPAgent) {
    if (!xmtpAgent) {
      throw new Error("XMTPAgent instance is required.");
    }

    const client = xmtpAgent.getClient();
    if (!client) {
      throw new Error("XMTP client could not be initialized from XMTPAgent.");
    }

    this.client = client;
    console.log("✅ XMTPServiceBase initialized with XMTP client.");
  }
}
