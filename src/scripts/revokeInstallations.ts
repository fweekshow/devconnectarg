import { Client } from "@xmtp/node-sdk";

import { CryptoUtils, XMTPClient } from "@/services/xmtp/xmtp-client";
import { ENV } from "@/config";

const {WALLET_KEY, DB_ENCRYPTION_KEY, XMTP_ENV} = ENV;

if (!WALLET_KEY) {
  throw new Error("WALLET_KEY or XMTP_WALLET_KEY is required");
}

if (!DB_ENCRYPTION_KEY) {
  throw new Error("DB_ENCRYPTION_KEY or XMTP_DB_ENCRYPTION_KEY is required");
}

if (!XMTP_ENV) {
  throw new Error("XMTP_ENV is required");
}

async function main() {
  console.log("🔄 Revoking old installations...");
  
  const signer = XMTPClient.createSigner(WALLET_KEY!);
  const encryptionKey = CryptoUtils.getEncryptionKeyFromHex(DB_ENCRYPTION_KEY!);
  const dbPath = XMTPClient.getDbPath("devconnect-agent");

  const client = await Client.create(signer, {
    dbEncryptionKey: encryptionKey,
    env: XMTP_ENV as "local" | "dev" | "production",
    dbPath,
  });

  console.log(`✓ Connected as: ${client.accountIdentifier}`);
  console.log(`✓ Inbox ID: ${client.inboxId}`);
  console.log(`✓ Current Installation ID: ${client.installationId}`);

  // Get inbox state
  const inboxState = await client.preferences.inboxState();
  console.log(`\n📊 Total installations: ${inboxState.installations.length}`);

  if (inboxState.installations.length > 1) {
    console.log("\n🔍 Found multiple installations:");
    
    for (const installation of inboxState.installations) {
      const isCurrent = installation.id === client.installationId;
      console.log(`  ${isCurrent ? '✅' : '❌'} ${installation.id.slice(0, 16)}... ${isCurrent ? '(CURRENT)' : '(OLD)'}`);
    }

    console.log("\n⚠️  Revoking old installations...");
    
    const oldInstallations = inboxState.installations
      .filter(i => i.id !== client.installationId)
      .map(i => i.id);

    if (oldInstallations.length > 0) {
      try {
        // Try revoking with the proper format
        await (client as any).revokeInstallations(oldInstallations);
        console.log(`✅ Revoked ${oldInstallations.length} old installation(s)`);
      } catch (error: any) {
        console.log(`⚠️  Direct revocation failed: ${error.message}`);
        console.log("\n💡 Alternative: Delete and recreate database");
        console.log("   Run: rm -rf .data/xmtp/* && npm run dev:agent-sdk");
        console.log("   This will create a fresh installation that Base App can connect to.");
      }
      console.log("\n🎉 Done! Base App should now connect to the current installation.");
      console.log("💡 You may need to restart Base App for changes to take effect.");
    }
  } else {
    console.log("\n✅ Only one installation found. No cleanup needed.");
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});

