import { TREASURE_HUNT_GROUP_IDS } from "@/constants/index.js";
import { ActionsContent } from "@/services/xmtp/xmtp-inline-actions/types/index.js";

/**
 * Generates the appropriate menu based on the conversation type
 * - Treasure Hunt groups: Shows only Treasure Hunt quick action
 * - Other contexts: Shows full menu with all quick actions
 */
export function generateMenuForContext(conversationId: string): ActionsContent {
  const isTreasureHuntGroup = TREASURE_HUNT_GROUP_IDS.includes(conversationId);

  console.log(`🎯 Menu Generator - Conversation ID: ${conversationId}`);
  console.log(`🏴‍☠️ Is Treasure Hunt Group: ${isTreasureHuntGroup}`);
  console.log(`📋 Configured Treasure Hunt Group IDs:`, TREASURE_HUNT_GROUP_IDS);

  if (isTreasureHuntGroup) {
    // Treasure Hunt group menu - only show Treasure Hunt action
    console.log(`✅ Sending TREASURE HUNT MENU (1 action only)`);
    return {
      id: "treasure_hunt_menu",
      description:
        "Hi! I'm Rocky, your event buddy. Here in the treasure hunt group, I can help you with:",
      actions: [
        {
          id: "treasure_hunt",
          label: "Treasure Hunt",
          imageUrl:
            "https://res.cloudinary.com/dg5qvbxjp/image/upload/v1760561042/ChatGPT_Image_Oct_15_2025_at_05_43_44_PM_wwnxiq.png",
          style: "primary",
        },
      ],
    };
  }

  // Full menu for DMs and other groups
  console.log(`✅ Sending FULL MENU (7 actions)`);
  return {
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
}

