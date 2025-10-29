import { Agent } from "@xmtp/agent-sdk";
import { type Client } from "@xmtp/node-sdk";
import { ReactionCodec } from "@xmtp/content-type-reaction";
import {
  RemoteAttachmentCodec,
  AttachmentCodec,
} from "@xmtp/content-type-remote-attachment";

import { ENV } from "@/config/index.js";
import {
  ActionsCodec,
  IntentCodec,
} from "@/services/xmtp/xmtp-inline-actions/types/index.js";
import { XMTPClient } from "@/services/xmtp/xmtp-client/index.js";
import { BrodcastService } from "@/services/broadcast/index.js";
import { ActivityGroupsService } from "@/services/groups/groups-activity/index.js";
import { SidebarGroupsService } from "@/services/groups/groups-sidebar/index.js";
import { DynamicGroupsService } from "@/services/groups/groups-dynamic/index.js";
import { TreasureHuntService } from "@/services/treasurehunt/index.js";
import { ReminderDispatcher } from "@/services/reminders/index.js";

import { CallbackRegistry } from "./callbackRegistry.js";
import {
  GroupCallbackHandler,
  MessageCallbackHandler,
  TextCallbackHandler,
} from "./handlers/index.js";

export class XMTPAgent {
  private agent: Agent | null = null;
  private client: Client<any> | null = null;
  private servicesClient: {
    broadcast?: BrodcastService;
    activityGroups?: ActivityGroupsService;
    sidebarGroups?: SidebarGroupsService;
    dynamicGroups?: DynamicGroupsService;
    treasureHunt?: TreasureHuntService;
    reminderDispatcher?: ReminderDispatcher;
  } = {};

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

  async initializeServices(): Promise<void> {
    const client = this.getClient();
    this.servicesClient.broadcast = new BrodcastService(client);
    this.servicesClient.activityGroups = new ActivityGroupsService(client);
    this.servicesClient.sidebarGroups = new SidebarGroupsService(client);
    this.servicesClient.dynamicGroups = new DynamicGroupsService(client);
    this.servicesClient.treasureHunt = new TreasureHuntService(client);

    // Initialize groups
    await this.servicesClient.activityGroups.initializeAgentInGroups();
    await this.servicesClient.activityGroups.listAllAgentGroups();

    this.servicesClient.reminderDispatcher = new ReminderDispatcher();
    this.servicesClient.reminderDispatcher.start(this.getClient());
  }

  cleanup() {
    console.log("🛑 Shutting down agent...");
    this.servicesClient.reminderDispatcher?.stop();
    process.exit(0);
  }

  handleCallbacks(): void {
    if (!this.agent) throw new Error("Agent not initialized");
    CallbackRegistry.registerHandlers([
      new GroupCallbackHandler(this.agent),
      new TextCallbackHandler(this.agent, [
        this.servicesClient.broadcast!,
        this.servicesClient.treasureHunt!,
        this.servicesClient.sidebarGroups!,
         this.servicesClient.dynamicGroups!
      ]),
      new MessageCallbackHandler(this.agent, [
        this.servicesClient.activityGroups!,
        this.servicesClient.treasureHunt!,
        this.servicesClient.broadcast!,
        this.servicesClient.dynamicGroups!,
        this.servicesClient.sidebarGroups!, //default case always at the last for sidebar group
      ]),
    ]);
  }
}
