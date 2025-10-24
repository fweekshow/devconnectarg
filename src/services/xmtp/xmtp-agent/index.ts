import { Agent } from "@xmtp/agent-sdk";
import { type Client } from "@xmtp/node-sdk";
import { ReactionCodec } from "@xmtp/content-type-reaction";
import {
  RemoteAttachmentCodec,
  AttachmentCodec,
} from "@xmtp/content-type-remote-attachment";

import { ENV } from "@/config";
import {
  ActionsCodec,
  IntentCodec,
} from "@/services/xmtp/xmtp-inline-actions/types";
import { XMTPClient } from "@/services/xmtp/xmtp-client";

export class XMTPAgent {
  private agent: Agent | null = null;
  private client: Client<any> | null = null;

  async initFromEnv(): Promise<void> {
    try {
      const dbPath = XMTPClient.getDbPath("xmtp-agent");
      this.agent = await Agent.createFromEnv({
        env: (ENV.XMTP_ENV as "dev" | "production") || "production",
        dbPath,
        codecs: [
          new ActionsCodec(),
          new IntentCodec(),
          new ReactionCodec(),
          new RemoteAttachmentCodec(),
          new AttachmentCodec(),
        ],
      });
      this.client = this.agent.client;
      console.log("🤖 XMTP Agent initialized");
    } catch (err) {
      console.log("Error creating XMTP Agent", err);
    }
  }

  getClient(): Client<any> {
    if (!this.client) throw new Error("XMTP client not initialized");
    return this.client;
  }

  getAgent(): Agent {
    if (!this.agent) throw new Error("XMTP agent not initialized");
    return this.agent;
  }
}
