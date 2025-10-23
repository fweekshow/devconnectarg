# Clanking Flow - Quick Action Based

## User Flow

### Step 1: User Clicks "Clank" Button
- User sees a Quick Action button in the menu or somewhere
- Button ID: `clank_start`
- User clicks it

### Step 2: Rocky Asks for Details  
- Rocky sends a message: "🪙 **Let's create your Clanking Group!**\n\nPlease reply with:\n1. Your group name\n2. Upload an image (will be your token logo)"
- System stores user's inbox ID in a "waiting for clanking response" state

### Step 3: User Replies with Name + Image
- User types: "My Awesome Group"
- User uploads an image
- System detects this is a clanking response

### Step 4: Rocky Creates Everything
- Creates sidebar group using existing sidebar tool
- Launches token via Clanker API with the image
- Waits for both to complete

### Step 5: Rocky Shares Token Info in New Group
- Rocky sends welcome message in the new group chat
- Includes token address, trading link, etc.
- "🎉 Welcome to [GroupName]!\n\n🪙 **Your Token:**\n• Address: 0x...\n• View on Clanker: https://clanker.world/token/0x..."

## Implementation Plan

1. **Add "Clank" button to menu Quick Actions**
2. **Create state tracking** (in-memory Map for now)
3. **Handle clank_start action** → Ask for details
4. **Detect clanking response** → Create group + token
5. **Send token info** in the new group

## State Machine

```
IDLE 
  ↓ (user clicks "Clank")
WAITING_FOR_CLANKING_DETAILS
  ↓ (user sends name + image)
CREATING_GROUP_AND_TOKEN
  ↓ (both complete)
TOKEN_INFO_SENT
  ↓
IDLE
```

## Code Changes Needed

1. Add to menu actions
2. Create clanking state Map
3. Add handler for `clank_start`
4. Add detection for clanking response  
5. Integrate with sidebar + Clanker API
6. Send token info to new group

Much simpler than command-based approach!

