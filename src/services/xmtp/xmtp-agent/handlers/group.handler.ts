import { Agent } from "@xmtp/agent-sdk";
import { ICallbackHandler } from "../interfaces/index.js";
import { GroupAdapter } from "@/adapters/index.js";

export class GroupCallbackHandler implements ICallbackHandler {
  constructor(private agent: Agent) {}

  registerCallback(): void {
    this.agent.on("group-update", async (ctx) => {
      const content = ctx.message.content as any;

      if (content.addedInboxes?.length > 0) {
        await GroupAdapter.incrementGroupMemberJoin(ctx.message.conversationId);
        console.log(`New members added: ${JSON.stringify(content.addedInboxes)}`);
      }

      if (content.removedInboxes?.length > 0) {
        await GroupAdapter.incrementGroupMemberLeave(ctx.message.conversationId);
        console.log(`Members removed: ${JSON.stringify(content.removedInboxes)}`);
      }
    });
  }
}
