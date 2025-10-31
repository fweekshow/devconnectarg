# Treasure Hunt Menu Customization

## Overview
This document describes the changes made to show a custom menu in treasure hunt groups, displaying only the "Treasure Hunt" quick action instead of the full menu.

## Changes Made

### 1. Created Menu Generator Utility
**File:** `src/services/xmtp/xmtp-agent/utils/menuGenerator.ts`

Created a new utility function `generateMenuForContext()` that:
- Detects if the conversation is a treasure hunt group using `TREASURE_HUNT_GROUP_IDS`
- Returns a simplified menu with only the Treasure Hunt quick action for treasure hunt groups
- Returns the full menu with all quick actions for DMs and other groups

### 2. Updated Message Handler
**File:** `src/services/xmtp/xmtp-agent/handlers/message.handler.ts`

Modified the `show_main_menu` case to:
- Import the `generateMenuForContext` utility
- Use `generateMenuForContext(ctx.conversation.id)` instead of hardcoded menu
- Dynamically generate the appropriate menu based on conversation context

### 3. Updated Text Handler
**File:** `src/services/xmtp/xmtp-agent/handlers/text.handler.ts`

Updated two menu generation locations:
1. **Generic message detection fallback**: When AI tries to list menu in text, now uses `generateMenuForContext()`
2. **ShowMenu tool response handler**: When AI tool returns Quick Actions, now generates context-aware menu

## How It Works

### For Treasure Hunt Groups:
When a user interacts with the bot in a treasure hunt group (identified by group ID being in `TREASURE_HUNT_GROUP_IDS`):
- Menu shows: "Hi! I'm Rocky, your event buddy. Here in the treasure hunt group, I can help you with:"
- Only one quick action displayed: **Treasure Hunt** (primary style)

### For Other Contexts (DMs & Other Groups):
Full menu is displayed with all quick actions:
- Schedule
- Wifi
- Event Logistics
- Base Group
- XMTP Group
- More Groups
- Treasure Hunt

## Testing

To test this feature:
1. Build the project: `npm run build`
2. Ensure treasure hunt group IDs are configured in `TREASURE_HUNT_GROUP_IDS`
3. Trigger the menu in a treasure hunt group (say "hi", "menu", or click "show_main_menu")
4. Verify only the Treasure Hunt quick action appears
5. Test in a DM to verify full menu still appears

## Configuration

Treasure hunt groups are identified in `src/constants/treasurehunt.ts`:
```typescript
export const TREASURE_HUNT_GROUP_IDS = [
  // Add treasure hunt group IDs here
];
```

## Branch
This feature was developed on branch: `feature/treasure-hunt-menu`

## Future Enhancements

Potential improvements:
- Add more group-specific menu customizations
- Make menu configuration more dynamic/database-driven
- Add analytics tracking for treasure hunt group interactions

