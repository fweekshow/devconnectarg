import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";

import { ENV } from "@/config";
import { DEFAULT_REPLY } from "@/constants";

import { SYSTEM_PROMPT } from "./prompt.js";
import { DEFAULT_TOOLS } from "./tools";

export class AIAgent {
  private model: ChatOpenAI;
  constructor() {
    this.model = new ChatOpenAI({
      model: ENV.DEFAULT_MODEL,
      apiKey: ENV.OPENAI_API_KEY,
      temperature: 0.2,
    });
  }

  generatePrompt(
    query: string,
    senderInboxId: string,
    conversationId: string,
    isGroupMention: string,
    walletAddress: string,
    eventContext?: string
  ) {
    const promptTemplate = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_PROMPT],
      [
        "user",
        `Sender Inbox Id: ${senderInboxId}
        Conversation ID: ${conversationId}
        isGroupMentioned: ${isGroupMention}
        Wallet Address: ${walletAddress}
        ${eventContext ? `Event Context: ${eventContext}` : ""}
        
        IMPORTANT: When using SendBroadcastMessage tool, use these exact values:
        - walletAddress: ${walletAddress}
        - currentConversationId: ${conversationId}
        
        Query: ${query}`,
      ],
      ["placeholder", "{agent_scratchpad}"],
    ]);
    return promptTemplate;
  }

  async run(
    query: string,
    senderInboxId: string,
    conversationId: string,
    isGroupMention: boolean,
    walletAddress: string,
    eventContext?: string
  ) {
    try {
      const promptTemplate = this.generatePrompt(
        query,
        senderInboxId,
        conversationId,
        String(isGroupMention),
        walletAddress,
        eventContext
      );

      // Use all tools in both DMs and groups - reminder privacy is handled by conversationId
      const toolCallingAgent = createToolCallingAgent({
        llm: this.model,
        tools: DEFAULT_TOOLS,
        prompt: promptTemplate,
      });

      const agentExecutor = new AgentExecutor({
        agent: toolCallingAgent,
        tools: DEFAULT_TOOLS,
        maxIterations: 10,
        verbose: false, // Disabled - too noisy
      });

      const aiMessage = await agentExecutor.invoke({
        input: query,
        senderInboxId,
        conversationId,
        isGroupMention: String(isGroupMention),
        walletAddress,
        currentConversationId: conversationId,
      });

      console.log(`✅ Agent completed successfully`);
      return aiMessage.output as string;
    } catch (e) {
      console.log(`⚠️ Unable to generate result: ${e}`);
      console.error(`Full error:`, e);
      return DEFAULT_REPLY;
    }
  }

  async runWithPromt(prompt: string): Promise<string> {
    const input = [{ role: "user", content: prompt }];
    const response = await this.model.invoke(input);
    return response.content as string;
  }
}
