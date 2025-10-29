import {
  GroupAdapter,
  ReminderAdapter,
  ScheduleAdapter,
  UserAdapter,
} from "@/adapters/index.js";
import { connectDb, ENV } from "@/config/index.js";
import { CLEANUP_DURATION } from "@/constants/index.js";
import { ConversationMemoryService } from "@/services/conversation-memory/index.js";
import { XMTPAgent } from "@/services/xmtp/xmtp-agent/index.js";
import { ContentTypeActions } from "@/services/xmtp/xmtp-inline-actions/types/index.js";

console.log(`🚀 Starting DevConnect 2025 Concierge Agent (Agent SDK)`);
// Initialize database
await connectDb();
//Create Tables if necessary
await UserAdapter.createTable();
await ScheduleAdapter.createTable();
await ReminderAdapter.createTable();
await GroupAdapter.createTable();

// Run conversation cleanup every 30 minutes
setInterval(ConversationMemoryService.cleanup, CLEANUP_DURATION);

async function main() {
  try {
    // Get and log current date/time for agent context
    const now = new Date();
    const currentDateTime = now.toLocaleString("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
    console.log(`📅 Current Date/Time: ${currentDateTime}`);
    console.log(
      `📅 Agent Context: Today is ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`
    );

    console.log("🔄 Initializing Agent SDK client...");

    const xmtpAgent = new XMTPAgent();
    await xmtpAgent.initFromEnv();

    await xmtpAgent.initializeServices();

    process.on("SIGINT", xmtpAgent.cleanup.bind(xmtpAgent));
    process.on("SIGTERM", xmtpAgent.cleanup.bind(xmtpAgent));

    console.log("👂 Setting up message handlers...");
    console.log("💬 Agent will respond to:");
    console.log("  - Direct messages (DMs)");
    console.log(
      `  - Group messages when mentioned with @${ENV.MENTION_HANDLES.split(",")[0]}`
    );

    xmtpAgent.handleCallbacks();

    const agent = xmtpAgent.getAgent();

    console.log("🔄 Agent SDK client initialized with Quick Actions codecs");
    console.log(`✓ Agent Address: ${agent.address}`);
    console.log(`✓ Agent Inbox ID: ${agent.client.inboxId}`);

    // Verify codecs are registered
    console.log(`🔍 Registered codecs:`, (agent.client as any).codecRegistry);
    console.log(`🔍 ContentTypeActions:`, ContentTypeActions.toString());

    // Start the agent
    console.log("🚀 Starting Agent SDK agent...");
    await agent.start();
    console.log("✅ DevConnect 2025 Concierge Agent is now running!");
  } catch (err) {
    console.error("❌ Error starting agent:", err);
    process.exit(1);
  }
}

main().catch(console.error);
