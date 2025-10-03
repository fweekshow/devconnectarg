import { tool } from "@langchain/core/tools";

export const sendWelcomeMessage = tool(
  () => {
    // Return Quick Actions for Base App (coinbase.com/actions:1.0)
    return JSON.stringify({
      contentType: "coinbase.com/actions:1.0",
      content: {
        id: "devconnect_welcome_actions",
        description: "Hi! I'm the DevConnect 2025 Concierge. Here are things I can help you with:",
        actions: [
          {
            id: "schedule",
            label: "📅 Schedule",
            style: "primary"
          },
          {
            id: "set_reminder", 
            label: "⏰ Set Reminder",
            style: "secondary"
          },
          {
            id: "event_info",
            label: "ℹ️ Event Info", 
            style: "secondary"
          },
          {
            id: "join_groups",
            label: "👥 Join Groups",
            style: "secondary"
          },
          {
            id: "sponsored_slot",
            label: "📣 Sponsored Slot",
            style: "secondary"
          }
        ]
      }
    });
  },
  {
    name: "SendWelcomeMessage",
    description: "Sends a welcome message with Quick Actions for new users to choose from (Schedule, Set Reminder, Concierge Support)",
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
