import { tool } from "@langchain/core/tools";

export const showMenu = tool(
  () => {
    // Return Quick Actions menu for Base App (coinbase.com/actions:1.0)
    return JSON.stringify({
      contentType: "coinbase.com/actions:1.0",
      content: {
        id: "devconnect_welcome_actions",
        description: "Hi! I'm Rocky, your DevConnect 2025 Concierge. Here's what I can help you with:",
        actions: [
          {
            id: "schedule",
            label: "Schedule",
            imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760465562/ChatGPT_Image_Oct_14_2025_at_03_12_20_PM_p7jhdx.png",
            style: "primary"
          },
          {
            id: "wifi",
            label: "Wifi",
            imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/c_crop,w_1100,h_1100/v1760465369/vecteezy_simple-wifi-icon_8014226-1_jicvnk.jpg",
            style: "secondary"
          },
          {
            id: "event_logistics",
            label: "Event Logistics",
            imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760464845/checklist_gd3rpo.png",
            style: "secondary"
          },
          {
            id: "join_base_group",
            label: "Base Group",
            imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760466568/base_s5smwn.png",
            style: "secondary"
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
            imageUrl: "https://d392zik6ho62y0.cloudfront.net/images/xmtp-logo.png",
            style: "secondary"
          },
          {
            id: "join_groups",
            label: "More Groups",
            imageUrl: "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760464996/vecteezy_join-group-icon-in-trendy-outline-style-isolated-on-white_32201148_mkmtik.jpg",
            style: "secondary"
          }
        ]
      }
    });
  },
  {
    name: "ShowMenu",
    description: "CRITICAL: Shows the main menu with Quick Action buttons. Use this for: greetings (hi, hello, hey), vague messages, gibberish, casual acknowledgments (cool, thanks, okay), or when user asks what you can do. ALWAYS use this instead of listing menu options in text.",
  },
);

export const showHelp = tool(
  () => {
    return `🤖 DevConnect 2025 Concierge - Available Commands

📅 SCHEDULE COMMANDS:
• "schedule" - Get the event calendar
• "What's happening today?" - Get today's events
• "schedule [day]" - Get schedule for specific day

ℹ️ INFO COMMANDS:
• "info" or "about devconnect" - General information about DevConnect 2025
• "venue info" - Information about La Rural and event locations

⏰ REMINDER COMMANDS:
• "remind me [message] at [time]" - Set a reminder
• "remind me [message] in [X] minutes/hours" - Set relative reminder  
• "my reminders" - View all your reminders
• "delete reminder [number]" - Delete a specific reminder

💡 EXAMPLES:
• "What's happening on November 17?"
• "Tell me about DevConnect"
• "Remind me about the Staking Summit tomorrow"
• "When is ETH Day?"

Need more help? Just ask me naturally - I understand conversational requests too!

Official site: https://devconnect.org/calendar 
Updates: @efdevconnect`;
  },
  {
    name: "ShowHelp",
    description:
      "Shows detailed help information with available commands for DevConnect 2025",
  },
);
