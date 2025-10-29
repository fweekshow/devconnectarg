import { Agent } from "@xmtp/agent-sdk";

import { UserAdapter } from "@/adapters";
import {
  ActionsContent,
  ContentTypeActions,
  ContentTypeIntent,
} from "@/services/xmtp/xmtp-inline-actions/types";

import { ICallbackHandler } from "../interfaces";
import { CallbackServices } from "../callbackServices.type";

export class MessageCallbackHandler implements ICallbackHandler {
  constructor(
    private agent: Agent,
    private services: CallbackServices[]
  ) {}

  registerCallback(): void {
    this.agent.on("message", async (ctx) => {
      try {
        const contentTypeId = ctx.message.contentType?.typeId;
        const notIntent =
          contentTypeId !== ContentTypeIntent.toString() &&
          contentTypeId !== "coinbase.com/intent:1.0" &&
          contentTypeId !== "intent";

        let actionId: string | undefined;
        if (!notIntent) {
          const intentContent = ctx.message.content as any;
          actionId = intentContent.actionId;
          const originalActionsId = intentContent.id;

          console.log(`🎯 Received Quick Action intent: ${actionId}`);
          console.log(`🎯 Intent from actions ID: ${originalActionsId}`);
          console.log(`🎯 Message content type: ${contentTypeId}`);
        }

        if (actionId) {
          switch (actionId) {
            case "schedule":
              console.log("inside schedule");
              await UserAdapter.incrementActionClick(
                ctx.message.senderInboxId,
                "Schedule"
              );
              
              // Send schedule info text first (with URL)
              const scheduleText = `You can view the full schedule at https://devconnect.org/calendar and sign up for sessions. Feel free to ask me any questions about the schedule and I'll help you craft an epic DevConnect experience.
            
Examples:
•⁠  ⁠When is DevConnect Opening Ceremony?
•⁠  ⁠When is Builder Nights Buenos Aires?
•⁠  ⁠Tell me about ETH Day
•⁠  ⁠What events are on Thursday?

Just ask naturally - I understand conversational requests!`;
              
              await ctx.sendText(scheduleText);
              
              // Send followup actions separately
              const scheduleFollowupActionsContent: ActionsContent = {
                id: "schedule_followup_actions",
                description: "Is there anything else I can help with?",
                actions: [
                  {
                    id: "show_main_menu",
                    label: "✅ Yes",
                    style: "primary",
                  },
                  {
                    id: "end_conversation",
                    label: "❌ No",
                    style: "secondary",
                  },
                ],
              };
              const scheduleConversation =
                await ctx.client.conversations.getConversationById(
                  ctx.conversation.id
                );
              if (scheduleConversation) {
                await scheduleConversation.send(
                  scheduleFollowupActionsContent,
                  ContentTypeActions
                );
              }
              return;

            case "show_main_menu":
              const mainMenuActionsContent: ActionsContent = {
                id: "devconnect_welcome_actions",
                description:
                  "Hi! I'm Rocky, your event buddy at DevConnect. Here's what I can help you with:",
                actions: [
                  {
                    id: "schedule",
                    label: "Schedule",
                    imageUrl:
                      "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760465562/ChatGPT_Image_Oct_14_2025_at_03_12_20_PM_p7jhdx.png",
                    style: "primary",
                  },
                  {
                    id: "wifi",
                    label: "Wifi",
                    imageUrl:
                      "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760465369/vecteezy_simple-wifi-icon_8014226-1_jicvnk.jpg",
                    style: "secondary",
                  },
                  {
                    id: "event_logistics",
                    label: "Event Logistics",
                    imageUrl:
                      "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760464845/checklist_gd3rpo.png",
                    style: "secondary",
                  },
                  {
                    id: "join_base_group",
                    label: "Base Group",
                    imageUrl:
                      "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760466568/base_s5smwn.png",
                    style: "secondary",
                  },
                  // {
                  //   id: "join_eth_group",
                  //   label: "ETH Group",
                  //   imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760463829/Ethereum_Foundation_Logo_Vector_xddxiu.svg",
                  //   style: "secondary"
                  // },
                  {
                    id: "join_xmtp_group",
                    label: "XMTP Group",
                    imageUrl:
                      "https://d392zik6ho62y0.cloudfront.net/images/xmtp-logo.png",
                    style: "secondary",
                  },
                  {
                    id: "join_groups",
                    label: "More Groups",
                    imageUrl:
                      "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760464996/vecteezy_join-group-icon-in-trendy-outline-style-isolated-on-white_32201148_mkmtik.jpg",
                    style: "secondary",
                  },
                  {
                    id: "treasure_hunt",
                    label: "Treasure Hunt",
                    imageUrl:
                      "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760561042/ChatGPT_Image_Oct_15_2025_at_05_43_44_PM_wwnxiq.png",
                    style: "secondary",
                  },
                ],
              };
              console.log(
                `🎯 Sending main menu with ${mainMenuActionsContent.actions.length} actions`
              );
              const mainMenuConversation =
                await ctx.client.conversations.getConversationById(
                  ctx.conversation.id
                );
              if (mainMenuConversation) {
                console.log(`🎯 Conversation found, sending Quick Actions...`);
                await mainMenuConversation.send(
                  mainMenuActionsContent,
                  ContentTypeActions
                );
                console.log(`✅ Main menu Quick Actions sent successfully`);
              } else {
                console.error(
                  `❌ Could not find conversation ${ctx.conversation.id}`
                );
              }
              return;

            case "wifi":
              await UserAdapter.incrementActionClick(
                ctx.message.senderInboxId,
                "Wifi"
              );
              const wifiActionsContent: ActionsContent = {
                id: "wifi_followup_actions",
                description: `📶 DevConnect 2025 WiFi Information
                
WiFi details coming soon!

Check back closer to the event for network credentials to access high-speed internet at La Rural.

Is there anything else I can help with?`,
                actions: [
                  {
                    id: "show_main_menu",
                    label: "✅ Yes",
                    style: "primary",
                  },
                  {
                    id: "end_conversation",
                    label: "❌ No",
                    style: "secondary",
                  },
                ],
              };
              const wifiConversation =
                await ctx.client.conversations.getConversationById(
                  ctx.conversation.id
                );
              if (wifiConversation) {
                await wifiConversation.send(
                  wifiActionsContent,
                  ContentTypeActions
                );
              }
              return;

            case "event_logistics":
              await UserAdapter.incrementActionClick(
                ctx.message.senderInboxId,
                "EventLogistics"
              );
              await ctx.sendText(`Event Logistics

Dates: November 13-19, 2025
Location: La Rural Convention Center, Buenos Aires, Argentina

For detailed information about:
• Venue maps and directions
• Transportation and shuttles
• Accommodation recommendations  
• Local amenities

Visit: https://devconnect.org/calendar `);

              const logisticsFollowupActionsContent: ActionsContent = {
                id: "logistics_followup_actions",
                description: "Is there anything else I can help with?",
                actions: [
                  {
                    id: "show_main_menu",
                    label: "✅ Yes",
                    style: "primary",
                  },
                  {
                    id: "end_conversation",
                    label: "❌ No",
                    style: "secondary",
                  },
                ],
              };
              const logisticsConversation =
                await ctx.client.conversations.getConversationById(
                  ctx.conversation.id
                );
              if (logisticsConversation) {
                await logisticsConversation.send(
                  logisticsFollowupActionsContent,
                  ContentTypeActions
                );
              }
              return;

            case "concierge_support":
              await UserAdapter.incrementActionClick(
                ctx.message.senderInboxId,
                "ConciergeSupport"
              );
              const conciergeActionsContent: ActionsContent = {
                id: "concierge_support_actions",
                description: `Concierge Support

I'm here to help as your Concierge during DevConnect 2025! 

Concierge contact details coming soon. Check back closer to the event for support information.

Is there anything else I can help with?`,
                actions: [
                  {
                    id: "show_main_menu",
                    label: "✅ Yes",
                    style: "primary",
                  },
                  {
                    id: "end_conversation",
                    label: "❌ No",
                    style: "secondary",
                  },
                ],
              };
              const conciergeConversation =
                await ctx.client.conversations.getConversationById(
                  ctx.conversation.id
                );
              if (conciergeConversation) {
                await conciergeConversation.send(
                  conciergeActionsContent,
                  ContentTypeActions
                );
              }
              return;

            case "end_conversation":
              await ctx.sendText(
                "Great! Message me 👋 if you want to view the option menu again!"
              );
              return;
          }
        }
        let callbackHandled = false;
        for (const service of this.services) {
          if (notIntent) {
            callbackHandled = await service.handleMessageCallback(ctx);
          } else if (actionId) {
            callbackHandled = await service.handleIntentCallback(ctx, actionId);
          }
          if(callbackHandled) return;
        }
      } catch (err) {
        console.error("❌ Error processing message:", err);
      }
    });
  }
}
