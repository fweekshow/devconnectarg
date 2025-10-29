import fs from "node:fs";
import { createRequire } from "node:module";
import { Client, IdentifierKind, type Signer } from "@xmtp/node-sdk";
import { createWalletClient, http, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { ENV } from "@/config/index.js";

interface User {
  key: `0x${string}`;
  account: ReturnType<typeof privateKeyToAccount>;
  wallet: ReturnType<typeof createWalletClient>;
}

export class XMTPClient {
  static createUser(key: string): User {
    const account = privateKeyToAccount(
      (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`
    );
    return {
      key: (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`,
      account,
      wallet: createWalletClient({
        account,
        chain: sepolia,
        transport: http(),
      }),
    };
  }

  static createSigner(key: string): Signer {
    const sanitizedKey = key.startsWith("0x") ? key : `0x${key}`;
    const user = XMTPClient.createUser(sanitizedKey);
    return {
      type: "EOA",
      getIdentifier: () => ({
        identifierKind: IdentifierKind.Ethereum,
        identifier: user.account.address.toLowerCase(),
      }),
      signMessage: async (message: string) => {
        const signature = await user.wallet.signMessage({
          message,
          account: user.account,
        });
        return toBytes(signature);
      },
    };
  }

  static getDbPath(description = "xmtp"): string {
    let volumePath = ENV.RAILWAY_VOLUME_MOUNT_PATH ?? ".data/xmtp";

    if (ENV.TEST_WALLET === "true") {
      volumePath = ENV.RAILWAY_VOLUME_MOUNT_PATH ?? ".data/xmtp-test";
    }

    if (!fs.existsSync(volumePath))
      fs.mkdirSync(volumePath, { recursive: true });

    return `${volumePath}/${description}.db3`;
  }

  static async logAgentDetails(
    clients: Client<any> | Client<any>[]
  ): Promise<void> {
    const clientArray = Array.isArray(clients) ? clients : [clients];
    const clientsByAddress = clientArray.reduce<Record<string, Client<any>[]>>(
      (acc, client) => {
        const address = client.accountIdentifier?.identifier as string;
        acc[address] = acc[address] ?? [];
        acc[address].push(client);
        return acc;
      },
      {}
    );
    // Get XMTP SDK version from package.json
    const require = createRequire(import.meta.url);
    const packageJson = require("../../../package.json") as {
      dependencies: Record<string, string>;
    };
    const xmtpSdkVersion = packageJson.dependencies["@xmtp/node-sdk"];
    const bindingVersion = (
      require("../../../node_modules/@xmtp/node-bindings/package.json") as {
        version: string;
      }
    ).version;

    for (const [address, clientGroup] of Object.entries(clientsByAddress)) {
      const firstClient = clientGroup[0];
      const inboxId = firstClient.inboxId;
      const installationId = firstClient.installationId;
      const environments = clientGroup
        .map((c: Client<any>) => c.options?.env ?? "dev")
        .join(", ");
      console.log(`\x1b[38;2;252;76;52m
            ██╗  ██╗███╗   ███╗████████╗██████╗ 
            ╚██╗██╔╝████╗ ████║╚══██╔══╝██╔══██╗
             ╚███╔╝ ██╔████╔██║   ██║   ██████╔╝
             ██╔██╗ ██║╚██╔╝██║   ██║   ██╔═══╝ 
            ██╔╝ ██╗██║ ╚═╝ ██║   ██║   ██║     
            ╚═╝  ╚═╝╚═╝     ╚═╝   ╚═╝   ╚═╝     
          \x1b[0m`);

      const urls = [`http://xmtp.chat/dm/${address}`];

      const conversations = await firstClient.conversations.list();
      const inboxState = await firstClient.preferences.inboxState();
      const keyPackageStatuses =
        await firstClient.getKeyPackageStatusesForInstallationIds([
          installationId,
        ]);

      let createdDate = new Date();
      let expiryDate = new Date();

      // Extract key package status for the specific installation
      const keyPackageStatus = keyPackageStatuses[installationId];
      if (keyPackageStatus.lifetime) {
        createdDate = new Date(
          Number(keyPackageStatus.lifetime.notBefore) * 1000
        );
        expiryDate = new Date(
          Number(keyPackageStatus.lifetime.notAfter) * 1000
        );
      }
      console.log(`
        ✓ XMTP Client:
        • InboxId: ${inboxId}
        • SDK: ${xmtpSdkVersion}
        • Bindings: ${bindingVersion}
        • Version: ${Client.version}
        • Address: ${address}
        • Conversations: ${conversations.length}
        • Installations: ${inboxState.installations.length}
        • InstallationId: ${installationId}
        • Key Package created: ${createdDate.toLocaleString()}
        • Key Package valid until: ${expiryDate.toLocaleString()}
        • Networks: ${environments}
        ${urls.map((url) => `• URL: ${url}`).join("\n")}`);
    }
  }
}
