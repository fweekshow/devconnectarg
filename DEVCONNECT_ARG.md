# DevConnect 2025 Concierge — Codebase Guide

## Project Structure
```bash
devconnectarg/
└── src/
    ├── index.ts
    ├── adapters/
    │   ├── group.adapter.ts
    │   ├── index.ts
    │   ├── reminder.adapter.ts
    │   ├── schedule.adapter.ts
    │   ├── treasureHunt.adapter.ts
    │   └── user.adapter.ts
    ├── agent/
    │   ├── index.ts
    │   ├── prompt.ts
    │   └── tools/
    │       ├── index.ts
    │       ├── logistics.ts
    │       ├── reminder.ts
    │       ├── schedule.ts
    │       └── welcome.ts
    ├── config/
    │   ├── db.ts
    │   ├── env.ts
    │   └── index.ts
    ├── constants/
    │   ├── conversation.ts
    │   ├── event.ts
    │   ├── groups.ts
    │   ├── index.ts
    │   ├── logistics.ts
    │   ├── replies.ts
    │   ├── schedule.ts
    │   ├── staff.ts
    │   ├── treasureHunt.ts
    │   └── urls.ts
    ├── models/
    │   ├── group.model.ts
    │   ├── index.ts
    │   ├── reminder.model.ts
    │   ├── schedule.model.ts
    │   ├── treasureHunt.model.ts
    │   └── user.model.ts
    ├── scripts/
    │   ├── adminSchedule.ts
    │   ├── adminTreasureHunt.ts
    │   ├── generateKeys.ts
    │   └── revokeInstallations.ts
    ├── services/
    │   ├── xmtpServiceBase.ts
    │   ├── broadcast/
    │   │   ├── index.ts
    │   │   └── interfaces/
    │   │       ├── index.ts
    │   │       └── pendingBroadcast.interface.ts
    │   ├── conversation-memory/
    │   │   ├── index.ts
    │   │   └── interfaces/
    │   │       ├── conversation.interface.ts
    │   │       └── index.ts
    │   ├── groups/
    │   │   ├── groups-activity/
    │   │   │   └── index.ts
    │   │   └── groups-sidebar/
    │   │       ├── index.ts
    │   │       └── interfaces/
    │   │           ├── index.ts
    │   │           ├── pendingInvitation.interface.ts
    │   │           └── sidebarGroup.interface.ts
    │   ├── reminders/
    │   │   ├── dispatcher.ts
    │   │   ├── index.ts
    │   │   ├── reminder.ts
    │   │   ├── interfaces/
    │   │   │   ├── datetime.interface.ts
    │   │   │   ├── index.ts
    │   │   │   └── reminder.interface.ts
    │   │   └── schemas/
    │   │       ├── datetime.schema.ts
    │   │       ├── index.ts
    │   │       └── reminder.schema.ts
    │   ├── schedule/
    │   │   ├── index.ts
    │   │   ├── interfaces/
    │   │   │   ├── index.ts
    │   │   │   ├── schedule.interface.ts
    │   │   │   └── speaker.interface.ts
    │   │   └── schemas/
    │   │       ├── index.ts
    │   │       ├── schedule.schema.ts
    │   │       └── speaker.schema.ts
    │   ├── treasurehunt/
    │   │   ├── index.ts
    │   │   └── interfaces/
    │   │       ├── index.ts
    │   │       └── pendingImages.interface.ts
    │   ├── urgentmessage/
    │   │   └── index.ts
    │   └── xmtp/
    │       ├── xmtp-agent/
    │       │   ├── callbackRegistry.ts
    │       │   ├── callbackServices.type.ts
    │       │   ├── index.ts
    │       │   ├── handlers/
    │       │   │   ├── group.handler.ts
    │       │   │   ├── index.ts
    │       │   │   ├── message.handler.ts
    │       │   │   └── text.handler.ts
    │       │   └── interfaces/
    │       │       ├── handler.interface.ts
    │       │       └── index.ts
    │       ├── xmtp-client/
    │       │   ├── client.ts
    │       │   ├── cryptoUtils.ts
    │       │   └── index.ts
    │       └── xmtp-inline-actions/
    │           ├── README.md
    │           ├── index.ts
    │           ├── package.json
    │           ├── .env.example
    │           ├── handlers/
    │           │   ├── actionHandlers.ts
    │           │   ├── messageHandlers.ts
    │           │   ├── tokenHandler.ts
    │           │   └── transactionHandlers.ts
    │           └── types/
    │               ├── ActionsContent.ts
    │               ├── index.ts
    │               └── IntentContent.ts
    └── utils/
        └── mentions.ts
```

## Project Overview

This project is an XMTP-powered AI concierge for DevConnect 2025. It uses a clear separation of concerns:
- **adapters**: database DDL/DML with a fixed pattern
- **models**: TypeScript interfaces/types describing DB entities and insert params
- **services**: business logic; XMTP-integrated services extend `xmtpServiceBase`
- **agent**: LLM prompt, tool wiring, and agent entrypoint
- **constants**: feature-specific constants grouped per file
- **config**: environment and database wiring
- **scripts**: admin/utility scripts
- **utils**: small helpers


## Directory-by-directory

### adapters/
- **Purpose**: All database-related operations in a consistent pattern: create tables, perform updates/inserts, read queries.
- **Pattern**: Each adapter is a class with static methods and uses the shared `db` instance from config. Adapters do not contain business logic; they are thin persistence layers.

#### Example pattern (based on `src/adapters/user.adapter.ts`)
```ts
import { db } from "@/config/index.js";
import { UserInsertParams } from "@/models/index.js";

export class UserAdapter {
  static async createTable(): Promise<void> {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          inbox_id TEXT UNIQUE NOT NULL,
          wallet_address TEXT,
          total_messages INTEGER DEFAULT 0,
          reminders_created INTEGER DEFAULT 0,
          first_seen_at TIMESTAMP DEFAULT NOW(),
          last_message_at TIMESTAMP DEFAULT NOW(),
          action_clicks JSONB DEFAULT '{}'::jsonb
        );
      `);
      console.log("Users table created or already exists.");
    } catch (error) {
      console.error("Error creating users table:", error);
    }
  }

  static async incrementMessageCount(params: UserInsertParams): Promise<void> {
    const { inboxId, walletAddress } = params;
    await db.query(
      `INSERT INTO users (inbox_id, wallet_address, total_messages)
       VALUES ($1, $2, 1)
       ON CONFLICT (inbox_id) DO UPDATE
       SET total_messages = users.total_messages + 1,
           last_message_at = NOW()`,
      [inboxId, walletAddress || null]
    );
  }
}
```

#### Template: New Adapter
```ts
import { db } from "@/config/index.js";
import { MyEntityInsertParams } from "@/models/index.js";

export class MyEntityAdapter {
  static async createTable(): Promise<void> {
    await db.query(`
      CREATE TABLE IF NOT EXISTS my_entities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  static async insert(params: MyEntityInsertParams): Promise<void> {
    const { name } = params;
    await db.query(
      `INSERT INTO my_entities (name) VALUES ($1)`,
      [name]
    );
  }

  static async findById(id: number) {
    const { rows } = await db.query(
      `SELECT id, name, created_at FROM my_entities WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }
}
```

### models/
- **Purpose**: Type definitions/interfaces used by adapters and services. These mirror DB schema columns using camelCase in code and snake_case in DB when needed.

#### Example (based on `src/models/user.model.ts`)
```ts
export interface UserInsertParams {
  inboxId: string;
  walletAddress?: string;
}

export interface User extends UserInsertParams {
  id: number;
  totalMessages: number;
  remindersCreated: number;
  firstSeenAt: string;
  lastMessageAt: string;
  actionClicks: Record<string, number>;
}
```

#### Template: New Model
```ts
export interface MyEntityInsertParams {
  name: string;
}

export interface MyEntity {
  id: number;
  name: string;
  createdAt: string; // ISO string
}
```

### constants/
- **Purpose**: Shared constants organized by feature, in separate files (`conversation`, `event`, `logistics`, `replies`, `schedule`, `staff`, `treasureHunt`, `urls`). Import these from services or the agent.

### agent/
- **Purpose**: LLM prompt, tools, and the class that runs the agent.
- **Behavior**: The `AIAgent` class wires ChatOpenAI and LangChain’s tool-calling agent with the system prompt and tools.

#### Example: Agent Entrypoint (based on `src/agent/index.ts`)
```ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";

import { ENV } from "@/config/index.js";
import { DEFAULT_REPLY } from "@/constants/index.js";

import { SYSTEM_PROMPT } from "./prompt.js";
import { DEFAULT_TOOLS } from "./tools/index.js";

export class AIAgent {
  private model: ChatOpenAI;
  constructor() {
    this.model = new ChatOpenAI({
      model: ENV.DEFAULT_MODEL,
      apiKey: ENV.OPENAI_API_KEY,
      temperature: 0.2,
    });
  }

  generatePrompt(/* ... */) { /* builds ChatPromptTemplate */ }

  async run(/* ... */) {
    const toolCallingAgent = createToolCallingAgent({
      llm: this.model,
      tools: DEFAULT_TOOLS,
      prompt: this.generatePrompt(/* ... */),
    });

    const agentExecutor = new AgentExecutor({
      agent: toolCallingAgent,
      tools: DEFAULT_TOOLS,
      maxIterations: 10,
      verbose: false,
    });

    const aiMessage = await agentExecutor.invoke({ /* inputs */ });
    return aiMessage.output as string;
  }
}
```

- The prompt in `agent/prompt.ts` defines behavior guidelines and tool usage rules.
- Tools are exposed in `agent/tools`; their logic is implemented in services.

### services/
- **Purpose**: Business logic. Any service that needs the XMTP client should extend `xmtpServiceBase` and implement the callbacks. Services register and interpret intents/handlers and call adapters as needed.
- **Pattern**: A service extends `XMTPServiceBase`, uses `ctx` from XMTP Agent SDK, and implements `handleTextCallback`/`handleIntentCallback`/`handleMessageCallback`. Authorization, identity resolution, and helper utilities are provided by the base.

#### XMTP base class (excerpt from `src/services/xmtpServiceBase.ts`)
```ts
import { MessageContext } from "@xmtp/agent-sdk";
import type { Client } from "@xmtp/node-sdk";

export abstract class XMTPServiceBase {
  protected client: Client<any>;

  constructor(client: Client<any>) {
    if (!client) throw new Error("XMTP client is required.");
    this.client = client;
  }

  protected async getAddressFromInboxId(senderInboxId: string): Promise<string> { /* ... */ }
  protected async getSenderIdentifier(senderInboxId: string): Promise<string> { /* ... */ }
  protected async isAuthorizedMember(senderInboxId: string): Promise<boolean> { /* ... */ }

  async handleTextCallback(ctx: MessageContext<string>, cleanContent: string): Promise<boolean> { return false }
  async handleMessageCallback(ctx: MessageContext<unknown>): Promise<boolean> { return false }
  async handleIntentCallback(ctx: MessageContext<unknown>, actionId: any): Promise<boolean> { return false }
}
```

#### Concrete example: Broadcast (excerpt of `src/services/broadcast/index.ts`)
```ts
import { MessageContext } from "@xmtp/agent-sdk";
import type { Client } from "@xmtp/node-sdk";
import { XMTPServiceBase } from "@/services/xmtpServiceBase.js";

export class BrodcastService extends XMTPServiceBase {
  constructor(client: Client<any>) {
    super(client);
  }

  async handleTextCallback(ctx: MessageContext<string>, cleanContent: string): Promise<boolean> {
    if (cleanContent.toLowerCase().startsWith("/broadcast ")) {
      // preview + quick actions logic
      return true;
    }
    return false;
  }

  async handleIntentCallback(ctx: MessageContext<unknown>, actionId: any): Promise<boolean> {
    switch (actionId) {
      case "broadcast_yes":
        // confirm + send broadcast
        return true;
      case "broadcast_no":
        // cancel
        return true;
    }
    return false;
  }
}
```

#### Template: New XMTP service
```ts
import { MessageContext } from "@xmtp/agent-sdk";
import type { Client } from "@xmtp/node-sdk";
import { XMTPServiceBase } from "@/services/xmtpServiceBase.js";

export class MyFeatureService extends XMTPServiceBase {
  constructor(client: Client<any>) {
    super(client);
  }

  // Handle plain text messages
  async handleTextCallback(
    ctx: MessageContext<string>,
    cleanContent: string
  ): Promise<boolean> {
    if (cleanContent.toLowerCase().startsWith("/mycmd ")) {
      const arg = cleanContent.substring(7).trim();
      await ctx.sendText(`Received: ${arg}`);
      return true;
    }
    return false;
  }

  // Handle intent actions (Quick Actions)
  async handleIntentCallback(
    ctx: MessageContext<unknown>,
    actionId: string
  ): Promise<boolean> {
    switch (actionId) {
      case "myfeature_confirm":
        await ctx.sendText("Confirmed.");
        return true;
    }
    return false;
  }
}
```

### Registering callbacks and handlers
- Services are typically wired into the XMTP agent’s callback registry layer (see `services/xmtp/xmtp-agent/*`). Each service should:
  1) Extend `xmtpServiceBase`
  2) Implement the necessary callbacks
  3) Be registered so the global handlers delegate to it

### config/
- **Purpose**: Shared configuration such as ENV parsing and db client setup. Adapters import `db` from here.

### scripts/
- **Purpose**: Operational/admin utilities like generating keys, seeding/creating tables, running admin flows.

### utils/
- **Purpose**: Small helpers such as mentions parsing.

## How to add a new feature end-to-end

1) Define model
```ts
// src/models/myEntity.model.ts
export interface MyEntityInsertParams { name: string }
export interface MyEntity { id: number; name: string; createdAt: string }
```

2) Create adapter
```ts
// src/adapters/myEntity.adapter.ts
import { db } from "@/config/index.js";
import { MyEntityInsertParams } from "@/models/index.js";

export class MyEntityAdapter {
  static async createTable(): Promise<void> {
    await db.query(`
      CREATE TABLE IF NOT EXISTS my_entities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  static async insert(params: MyEntityInsertParams) {
    await db.query(`INSERT INTO my_entities (name) VALUES ($1)`, [params.name]);
  }
}
```

3) Implement service
```ts
// src/services/myFeature/index.ts
import type { Client } from "@xmtp/node-sdk";
import { MessageContext } from "@xmtp/agent-sdk";
import { XMTPServiceBase } from "@/services/xmtpServiceBase";
import { MyEntityAdapter } from "@/adapters/myEntity.adapter";

export class MyFeatureService extends XMTPServiceBase {
  constructor(client: Client<any>) { super(client) }

  async handleTextCallback(ctx: MessageContext<string>, cleanContent: string) {
    if (cleanContent.toLowerCase().startsWith("/save ")) {
      const name = cleanContent.substring(6).trim();
      await MyEntityAdapter.insert({ name });
      await ctx.sendText("Saved.");
      return true;
    }
    return false;
  }
}
```

4) Register service with handlers
- Add an instance of your service to the XMTP callbacks registry so that text and intent events reach it. Follow the existing broadcast/message/group handlers pattern under `services/xmtp/xmtp-agent/`.

### Agent tool usage
- The agent composes a system prompt (`agent/prompt.ts`) and exposes tools in `agent/tools`. Tool logic lives in services. When the agent calls a tool, the tool delegates to the corresponding service.

### Notes and conventions
- **Keep adapters thin**; no business logic or branching beyond SQL.
- **Keep models in sync** with DB schema; use camelCase in code and map to DB snake_case.
- **Services own business rules** and integrate with XMTP; extend `xmtpServiceBase` for client, identity, and authorization helpers.
- **Constants** live under `constants/` and should be feature-scoped.
- **Avoid tight coupling**: services depend on adapters and constants, not vice-versa.

## Codebase Inventory and Descriptions

### adapters (src/adapters)
- `index.ts`: Barrel export file aggregating adapters for easier imports.
- `user.adapter.ts`: Manages the `users` table. Creates the table with columns like `inbox_id`, `wallet_address`, `total_messages`, `reminders_created`, timestamps, and `action_clicks` JSONB. Provides update helpers such as `incrementActionClick`, `incrementRemindersCreated`, and `incrementMessageCount` (upsert on `inbox_id`).
- `group.adapter.ts`: Database operations for groups. Follows the same pattern: static class methods, `createTable`, and CRUD helpers for group membership/state. Used by group-related services (e.g., joining group chats, sidebar listings).
- `reminder.adapter.ts`: Persistence for reminders. Handles creation/listing/canceling reminders tied to an inbox and conversation. Coordinates with reminder services to schedule and manage pending reminders.
- `schedule.adapter.ts`: Data access for schedule entities. The schedule services use it for fetching curated event data by day/topic and any downstream tooling.
- `treasureHunt.adapter.ts`: Data layer for the Treasure Hunt feature (pending images, submissions, progress). Follows the same fixed adapter pattern.

### models (src/models)
- `index.ts`: Barrel exports for model interfaces.
- `user.model.ts`: Interfaces for `User` and `UserInsertParams`. Mirrors columns defined in `user.adapter.ts`.
- `group.model.ts`: Interfaces describing group-related records used by the groups services and adapters.
- `reminder.model.ts`: Types for reminder payloads and insert params used by `reminder.adapter.ts` and `services/reminders`.
- `schedule.model.ts`: Interfaces for schedule records and structures used by `services/schedule`.
- `treasureHunt.model.ts`: Interfaces for treasure-hunt entities used across treasureHunt adapter/service.

### services (src/services)
- `xmtpServiceBase.ts`: Abstract base for XMTP-integrated services. Provides helpers to resolve wallet from inbox ID, derive a friendly sender identifier, and check authorization (via `STAFF_WALLETS`). Exposes overridable callbacks: `handleTextCallback`, `handleMessageCallback`, `handleIntentCallback`.

- `broadcast/`: Allows authorized staff to preview, confirm, and send broadcast messages to all DM conversations (excluding the current one). It supports Quick Actions (preview confirmation, send/cancel). Internally, it:
  - syncs and lists conversations via XMTP client
  - filters out group conversations for DM-only broadcast
  - formats previews with the sender’s display name
  - tracks pending broadcast state in-memory keyed by sender inbox ID
  - supports variants: plain preview/send, action-based preview/send, and join-instruction preview/send
  - `interfaces/`: Type definitions such as `PendingBroadcast`

- `conversation-memory/`: Manages in-memory or persisted conversational context for the agent. This helps the agent respond with continuity across messages.

- `groups/`: Group-focused functionality.
  - `groups-activity/`: Activity utilities around groups.
  - `groups-sidebar/`: Produces a curated sidebar set of groups for easy access and joining. Includes interfaces like `PendingInvitation` and `SidebarGroup`.

- `reminders/`: End-to-end reminder logic.
  - `dispatcher.ts`: Schedules/dispatches reminders for delivery at the correct time back to the original conversation.
  - `reminder.ts` + `index.ts`: Core reminder orchestration (create, list, cancel) using `reminder.adapter.ts` and schemas.
  - `interfaces/`: Shared reminder types (date/time, reminder payloads).
  - `schemas/`: Zod/yup-like schemas for validating reminder inputs (datetime, reminder).

- `schedule/`: Fetches and formats schedule details for DevConnect.
  - `index.ts`: Public API for querying schedule, often called by agent tools.
  - `interfaces/`: Types for schedule data and speakers.
  - `schemas/`: Validation for schedule inputs and normalization of outputs.

- `treasurehunt/`: Business logic for treasure-hunt feature flows (image handling, submissions, progress). Uses `treasureHunt.adapter.ts` for persistence.

- `urgentmessage/`: Flows for urgent, high-priority messaging (separate from broadcast), likely with special formatting or recipients.

- `xmtp/`: XMTP integration submodule.
  - `xmtp-client/`: Instantiates the XMTP client and crypto utilities; provides the client instance to services and handlers.
  - `xmtp-agent/`: Callback registry and handlers binding XMTP events to services.
    - `handlers/`: Splits handlers by concern (group, message, text) and aggregates them. Services are registered here so callbacks delegate into service methods.
    - `callbackRegistry.ts` + `callbackServices.type.ts`: Types and registry logic for mapping XMTP events to concrete service callbacks.
  - `xmtp-inline-actions/`: Support for Coinbase Actions (Quick Actions) content type, with handlers and types (`ActionsContent`, `IntentContent`, `tokens`).

### constants (src/constants)
- `index.ts`: Barrel export.
- `conversation.ts`: Conversation-level constants and default behaviors.
- `event.ts`: Event-related constants (names, filters, mappings) used by schedule/services.
- `groups.ts`: Group identifiers, mappings, and labels for group-related services.
- `logistics.ts`: Logistics-related canned responses, keys, and rules.
- `replies.ts`: Standardized response strings used across features.
- `schedule.ts`: Schedule-specific constants and helpers.
- `staff.ts`: `STAFF_WALLETS` and related authorization lists for privileged actions (e.g., broadcasts).
- `treasureHunt.ts`: Constants supporting the treasure-hunt flows.
- `urls.ts`: Centralized URLs for official resources and references.

### agent (src/agent)
- `index.ts`: The `AIAgent` wiring: ChatOpenAI model, tool-calling agent creation, and the run method. It injects runtime context (`senderInboxId`, `conversationId`, `walletAddress`, `isGroupMention`) into the prompt and tool calls.
- `prompt.ts`: System prompt describing persona, constraints, strict tool usage rules (e.g., schedule via tools only, Quick Actions formatting), group vs DM behavior, broadcast constraints, link formatting rules, etc.
- `tools/`: Tool entrypoints that delegate to services.
  - `index.ts`: Barrel export for `DEFAULT_TOOLS`.
  - `logistics.ts`: Tool(s) surfacing logistics help content from services/constants.
  - `reminder.ts`: Tool(s) for creating/listing/canceling reminders; delegates to `services/reminders` and returns formatted responses or actions.
  - `schedule.ts`: Tool(s) for schedule queries; strictly used for any schedule-related user question.
  - `welcome.ts`: Tool(s) to present onboarding/help menus with Quick Actions.

### config (src/config)
- `env.ts`: Loads and validates environment variables (e.g., `OPENAI_API_KEY`, `DEFAULT_MODEL`), exports `ENV`.
- `db.ts`: Exposes the db client used by adapters for SQL queries.
- `index.ts`: Barrel export for config’s public API.

### scripts (src/scripts)
- `generateKeys.ts`: Utility for generating local keys/creds.
- `revokeInstallations.ts`: Admin script for revoking bot/app installations.
- `adminSchedule.ts`: Admin helper around schedule operations (seeding/exporting/testing).
- `adminTreasureHunt.ts`: Admin helper around treasure-hunt tasks.

### utils (src/utils)
- `mentions.ts`: Helpers to parse mentions/clean content in group vs DM contexts.

## How these parts work together (high-level)
- The agent receives a message via XMTP → xmtp-agent handlers parse and build a `MessageContext` → registered services’ callbacks are invoked.
- Services implement feature logic. If they need persistence, they call adapters. If they send messages or Quick Actions, they use the XMTP client methods made available via `xmtpServiceBase`.
- Agent tools provide LLM-accessible capabilities; when the model picks a tool, it calls into services which perform the action and return user-facing output or structured Quick Actions.
- Constants provide a single source of truth for strings, mappings, and configuration per feature. Models ensure type safety across services and adapters.
