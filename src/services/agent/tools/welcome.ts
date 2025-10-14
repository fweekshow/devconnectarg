import { tool } from "@langchain/core/tools";

export const showMenu = tool(
  () => {
    // Return Quick Actions menu for Base App (coinbase.com/actions:1.0)
    return JSON.stringify({
      contentType: "coinbase.com/actions:1.0",
      content: {
        id: "devconnect_welcome_actions",
        description: "Here's what I can help you with:",
        actions: [
          {
            id: "schedule",
            label: "📅 Schedule",
            style: "primary"
          },
          {
            id: "wifi",
            label: "📶 Wifi",
            style: "secondary"
          },
          {
            id: "event_logistics",
            label: "📋 Event Logistics",
            style: "secondary"
          },
          {
            id: "concierge_support",
            label: "🎫 Concierge Support", 
            style: "secondary"
          },
          {
            id: "join_groups",
            label: "👥 Join Groups",
            style: "secondary"
          },
          {
            id: "join_base_group",
            label: "Base Group",
            imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAP0AAADHCAMAAADlCqUFAAAAV1BMVEX6+voAAP////r09Pptbf5+fv3////39/r7+/76+vv8/Pqjo/xSUv4GBv9xcf7V1ft4eP3Pz/uZmf3o6PpJSf6trfx1df2Dg/1mZv7Hx/xDQ/63t/yRkf1C/xJ+AAABYklEQVR4nO3dS07DMBRAUSeAY4dPKS2U3/7XSdIJQirMHBv53BW8I1se+oUYY8pT6K0pp0UeYsy59ihVynnV92lfyzGkjvUp9Itf+KG/B++7nu2SJEmSJEmSJEmSJEmSJEn/rbFwc23gH83j7d1QsPuH3Vjb+HvjY0n7uX2z/PGpOH4YDq1e/vm4gf650cOfrzbADy9d66/pG4yenp6enp6enp6enp6enp6enp6enp6enp6evrbzcvT09PT09PT09PT09PT09PT09PT09PT09PT0tZ2Xo6enp6enp6enp6enp6enp6enp6enp6enp6ev7bwcPT09PT09fQf6aQv9qVF9GF830L+1qp935fHvc6v/54dxXxp/bBe/8A8fp5tyfe5bxq97Q8quTGkaL0mSJEmSJEmSJEmSJEmSpB9NtQeo2BRy7REqlkPql59TiB3rY4gx9+nPOa76mHJ/T9+U0yL/AqM6NXFSNkZxAAAAAElFTkSuQmCC",
            style: "secondary"
          },
          {
            id: "join_xmtp_group",
            label: "XMTP Group",
            imageUrl: "https://d392zik6ho62y0.cloudfront.net/images/xmtp-logo.png",
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
