# DevConnect 2025 Concierge Bot

An AI-powered XMTP concierge bot for DevConnect 2025 in Buenos Aires, Argentina (November 15-23, 2025). Built with TypeScript, XMTP Node SDK, and LangChain.

## 🌟 Overview

The DevConnect Concierge Bot helps attendees navigate the DevConnect event by providing:
- Event schedules and information
- Group chat management for activities
- Reminders and notifications
- Staff broadcast capabilities
- Emergency support system

## 🏗️ Architecture

The bot uses a modular tool-based architecture powered by LangChain, with specialized tools for different functionalities:

```
src/
├── services/
│   └── agent/
│       ├── tools/
│       │   ├── activityGroups.ts    # Activity group management
│       │   ├── broadcast.ts         # Staff broadcast system
│       │   ├── sidebarGroups.ts     # Dynamic sidebar groups
│       │   ├── schedule.ts          # Event schedule queries
│       │   ├── reminder.ts          # Reminder management
│       │   ├── logistics.ts         # Event information
│       │   ├── urgentMessage.ts     # Emergency support
│       │   ├── welcome.ts           # Welcome message
│       │   └── admin.ts             # Staff admin tools
│       └── prompt.ts                # AI agent prompt
```

---

## 📋 Tool Documentation

### 1. 👥 Activity Groups (`activityGroups.ts`)

**Purpose**: Manages pre-configured XMTP group chats for specific DevConnect activities/events.

**How it works**:
- Maintains a list of official DevConnect activity groups (ETHCON Argentina, Staking Summit, Builder Nights)
- Each group has a pre-assigned XMTP group ID
- Users can request to join groups via natural language or quick action buttons
- Agent automatically adds users to the appropriate XMTP group

**Key Features**:
- **Pre-configured Groups**: Three main activity groups with fixed IDs
- **Automatic Member Addition**: Seamlessly adds users to groups
- **Duplicate Protection**: Handles cases where users are already members
- **Group Discovery**: Lists all available activity groups
- **Quick Actions**: Generates interactive buttons for easy joining

**Usage Examples**:
```
User: "Add me to ETHCON Argentina"
User: "Join Builder Nights"
User: Clicks "🇦🇷 ETHCON Argentina 2025" button
```

**Technical Details**:
```typescript
// Group IDs are hardcoded
ACTIVITY_GROUPS = {
  ethcon_argentina: "6df533dc160bfdf8f9df6e859a4d05ef",
  staking_summit: "f83c9ea8f01a5a76c0038c487e0747fd",
  builder_nights: "66ffd36862150171d9940e4200e5a2a1"
}
```

---

### 2. 📢 Broadcast System (`broadcast.ts`)

**Purpose**: Allows authorized staff to send announcements to all bot users.

**How it works**:
1. Staff member sends a broadcast message to the bot
2. Bot verifies staff authorization (via wallet address)
3. Shows a preview with confirmation buttons
4. Upon confirmation, sends message to all DM conversations (excludes groups)
5. Messages are formatted with sender attribution

**Key Features**:
- **Staff-Only Authorization**: Uses `STAFF_WALLETS` list for access control
- **Preview & Confirm**: Two-step process prevents accidental broadcasts
- **Basename Resolution**: Shows sender's Base username or wallet address
- **DM-Only Delivery**: Broadcasts only to direct messages, not group chats
- **Multiple Broadcast Types**:
  - Regular broadcast (text only)
  - Broadcast with Quick Actions (interactive buttons)
  - Broadcast with join instructions

**Usage Flow**:
```
Staff: "/broadcast Important update about venue"
Bot: Shows preview with "✅ Yes, Send" and "❌ No, Cancel" buttons
Staff: Clicks "✅ Yes, Send"
Bot: Delivers to all DM conversations
```

**Authorization**:
```typescript
// Checks sender's wallet address against staff list
await isAuthorizedBroadcaster(senderInboxId)
// Uses STAFF_WALLETS from constant.ts
```

---

### 3. 💬 Sidebar Groups (`sidebarGroups.ts`)

**Purpose**: Creates ad-hoc focused discussion groups from existing group chats.

**How it works**:
1. User mentions bot in a group with "sidebar [GroupName]"
2. Bot creates a new XMTP group with the requester as admin
3. Adds "bankr" bot to all sidebars automatically
4. Sends invitation to the original group
5. Others can join via Quick Actions

**Key Features**:
- **Dynamic Creation**: Groups created on-demand
- **Admin Privileges**: Creator gets super admin status
- **Invitation System**: Quick Action buttons for easy joining
- **Automatic Bankr Addition**: Bankr bot joins all sidebars
- **Metadata Tracking**: Stores group name, creator, members, creation time

**Usage Examples**:
```
In Group Chat:
User: "@devconnectarg sidebar DeFi Discussion"
Bot: Creates group and posts invitation buttons

Other Users: Click "✅ Yes, Join" to join the sidebar
```

**Technical Details**:
```typescript
// Sidebar group storage
interface SidebarGroup {
  id: string;                    // XMTP group ID
  name: string;                  // Custom name
  originalGroupId: string;       // Source group
  createdBy: string;             // Creator inbox ID
  createdAt: Date;
  members: string[];
}
```

---

### 4. 📅 Schedule Tool (`schedule.ts`)

**Purpose**: Provides DevConnect event schedule information.

**How it works**:
- Stores complete DevConnect schedule data (Nov 15-23)
- Semantic search through schedule based on user queries
- Returns relevant events with times, locations, and details
- Can query by specific day or search all days for specific events

**Key Features**:
- **Full Event Calendar**: All DevConnect events from Nov 15-23
- **Semantic Search**: AI understands natural language queries
- **Day-Specific Queries**: "What's on Monday?" returns that day's schedule
- **Event-Specific Queries**: "When is Staking Summit?" searches all days
- **Speaker Information**: Details about organizers and presenters
- **Activity Times**: Specific timing for events

**Usage Examples**:
```
User: "What's happening on November 17?"
User: "When is the Staking Summit?"
User: "Schedule for Tuesday"
User: "Tell me about ETH Day"
```

**Schedule Structure**:
```typescript
SCHEDULE_DATA = {
  saturday_nov15: { title: "...", events: [...] },
  sunday_nov16: { title: "...", events: [...] },
  monday_nov17: { title: "...", events: [...] },
  // ... through november 23
}
```

---

### 5. ⏰ Reminder System (`reminder.ts`)

**Purpose**: Manages time-based reminders for users.

**How it works**:
1. User requests a reminder at a specific time
2. Bot converts to UTC and stores in SQLite database
3. Background process checks for due reminders
4. Sends reminder message to user at specified time
5. Supports timezone conversions (user time ↔ event time)

**Key Features**:
- **Flexible Time Input**: ISO format, simple format, or natural language
- **Timezone Support**: Automatically converts between user and event timezones
- **List Reminders**: View all pending reminders
- **Cancel Reminders**: Delete specific or all reminders
- **SQLite Storage**: Persistent reminder storage
- **Background Processing**: Automatic reminder delivery

**Usage Examples**:
```
User: "Remind me about the keynote tomorrow at 2pm"
User: "Remind me in 30 minutes"
User: "Show my reminders"
User: "Cancel reminder #5"
```

**Database Schema**:
```typescript
// reminders.db3
interface Reminder {
  id: number;
  inboxId: string;
  conversationId: string;
  targetTime: string;    // ISO format in UTC
  message: string;
  status: 'pending' | 'sent' | 'cancelled';
}
```

---

### 6. 📍 Logistics Tool (`logistics.ts`)

**Purpose**: Provides static event information and logistics.

**How it works**:
- Returns formatted information about DevConnect
- Includes dates, venue, tickets, tracks, and general logistics
- Simple lookup tool with comprehensive event details

**Key Features**:
- **Event Overview**: Dates, location, major milestones
- **Venue Information**: La Rural, DevConnect Cube details
- **Ticket Information**: Access requirements
- **Major Tracks**: List of event categories
- **Links**: Official website and resources

**Usage Examples**:
```
User: "Tell me about DevConnect"
User: "What's the venue?"
User: "When is the event?"
```

---

### 7. 🚨 Urgent Message System (`urgentMessage.ts`)

**Purpose**: Emergency communication channel to event staff.

**How it works**:
1. User reports an urgent issue
2. Bot forwards message to all staff members
3. Message includes user identification and timestamp
4. Staff can respond directly to the user

**Key Features**:
- **Emergency Routing**: Sends directly to staff conversations
- **User Attribution**: Includes sender's address/basename
- **Timestamp**: Records when message was sent
- **Direct Response**: Staff can reply in the user's DM
- **Privacy**: Only staff see urgent messages

**Usage Examples**:
```
User: "Urgent: Medical emergency at building 3"
User: "I need immediate help with badge access"
```

**Staff Authorization**:
- Uses same `STAFF_WALLETS` list as broadcast
- Only delivers to authorized staff conversations

---

### 8. 👋 Welcome Tool (`welcome.ts`)

**Purpose**: Sends interactive welcome message to new users.

**How it works**:
- Sends Quick Actions interface with main bot capabilities
- Users can tap buttons to trigger specific actions
- Provides easy onboarding for first-time users

**Key Features**:
- **Quick Actions Interface**: Interactive buttons
- **Capability Overview**: Shows all available features
- **Help Command**: Detailed command list

**Quick Action Buttons**:
- 📅 Schedule
- 📶 Wifi
- 📋 Event Logistics
- 🎫 Concierge Support
- 👥 Join Groups
- 🔵 Base Info
- 💬 XMTP Info

---

### 9. 🔧 Admin Tool (`admin.ts`)

**Purpose**: Staff-only group management capabilities.

**How it works**:
1. Staff member requests to add users to a group
2. Bot verifies staff authorization
3. Validates wallet addresses
4. Attempts to add each user to the specified group
5. Returns detailed results

**Key Features**:
- **Bulk Member Addition**: Add multiple users at once
- **Wallet Address Support**: Works with Ethereum addresses
- **Basename Resolution**: Looks up Base usernames
- **Authorization Check**: Staff-only access
- **Detailed Results**: Success/failure for each user

**Usage**:
```
Staff: "Add 0x123... and 0x456... to group abc123"
```

---

## 🔐 Authorization System

The bot uses wallet address-based authorization for staff functions:

```typescript
// constant.ts
export const STAFF_WALLETS = [
  "0x...",  // Staff wallet addresses
  "0x...",
];
```

**Authorized Features**:
- Broadcast messages
- Admin group management
- Receive urgent messages

**How it works**:
1. Bot resolves XMTP inbox ID → wallet address
2. Checks if address is in `STAFF_WALLETS` list
3. Grants or denies access accordingly

---

## 🎯 Quick Actions System

The bot uses XMTP's Quick Actions (coinbase.com/actions:1.0) for interactive buttons:

```typescript
interface ActionsContent {
  id: string;
  description: string;
  actions: Array<{
    id: string;
    label: string;
    style: "primary" | "secondary";
  }>;
}
```

**Used in**:
- Welcome message
- Group invitations
- Broadcast confirmations
- Sidebar group invitations

---

## 🗄️ Data Storage

**SQLite Database** (`reminders.db3`):
- Stores reminders
- Tracks reminder status
- Persistent across restarts

**In-Memory Storage**:
- Pending broadcasts (Map)
- Sidebar group metadata (Map)
- Pending invitations (Map)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20-23
- XMTP wallet key
- OpenAI API key

### Installation
```bash
npm install
```

### Environment Variables
```bash
# .env
KEY=your_xmtp_wallet_key
OPENAI_API_KEY=your_openai_key
```

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

---

## 📦 Key Dependencies

- **@xmtp/node-sdk**: XMTP messaging protocol
- **@langchain/core**: AI agent framework
- **@coinbase/onchainkit**: Base identity resolution
- **better-sqlite3**: SQLite database
- **luxon**: Date/time handling
- **viem**: Ethereum utilities

---

## 🏛️ Project Structure

```
devconnect-concierge/
├── src/
│   ├── services/
│   │   ├── agent/
│   │   │   ├── tools/           # All bot capabilities
│   │   │   ├── index.ts         # Agent initialization
│   │   │   └── prompt.ts        # AI instructions
│   │   └── helpers/
│   │       └── client.ts        # XMTP client setup
│   ├── xmtp-inline-actions/     # Quick Actions types
│   ├── config.ts                # Configuration
│   ├── constant.ts              # Constants & staff list
│   ├── dispatcher.ts            # Message routing
│   ├── mentions.ts              # Mention handling
│   ├── store.ts                 # Database operations
│   └── index.ts                 # Entry point
├── dist/                        # Compiled output
├── logs/                        # Analytics logs
├── reminders.db3               # Reminder database
└── package.json
```

---

## 🎫 DevConnect Event Details

**Event**: DevConnect 2025  
**Location**: Buenos Aires, Argentina  
**Dates**: November 15-23, 2025  
**Main Venue**: La Rural (DevConnect Cube)

**Key Events**:
- Nov 15-16: Pre-events (Staking Summit, Governance Day)
- Nov 17: ETH Day & DevConnect Cube Opening
- Nov 18-22: Main DevConnect activities
- Nov 21-23: ETHGlobal Hackathon

**Official Site**: https://devconnect.org/calendar

---

## 🤝 Contributing

This bot was built for DevConnect 2025. To adapt for other events:

1. Update `SCHEDULE_DATA` in `schedule.ts`
2. Modify `ACTIVITY_GROUPS` in `activityGroups.ts`
3. Update `STAFF_WALLETS` in `constant.ts`
4. Adjust event dates in `constant.ts`

---

## 📝 License

Private project for DevConnect 2025

---

## 👥 Support

For urgent issues during DevConnect, use the bot's urgent message feature or contact: concierge@base.org

---

**Built with ❤️ for DevConnect 2025 by the Base team**

