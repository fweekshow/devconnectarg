# DevConnect Concierge Agent - Developer Testing Guide

## Overview
This guide provides comprehensive testing instructions for developers working on the DevConnect Concierge Agent refactoring. The agent serves as an event assistant for DevConnect 2025 in Buenos Aires, Argentina.

## 🗓️ Schedule Feature Testing

### Current Implementation
The schedule feature displays events from **Base**, **XMTP**, and **Ethereum** ecosystems for DevConnect 2025. It should show **3-4 examples at a time** to avoid overwhelming users.

### Test Scenarios

#### 1. Basic Schedule Display
**Test Command:** `"Show me the schedule"` or click "Schedule" button

**Expected Behavior:**
- ✅ Displays current day's events (3-4 most relevant)
- ✅ Shows events from all three ecosystems (Base takes priority, XMTP, Ethereum)
- ✅ Includes time, location, and organizer information
- ✅ Uses proper formatting with clear event details

**Sample Expected Output:**
```
📅 Today's Schedule (Monday Nov 17)

🔵 Base Events:
• 2:00 PM - 8:00 PM: Builder Nights Buenos Aires
  Organized by MetaMask, Linea, Ledger, Brevis, P2P, Pharos, Chainlink
  Location: TBD | Tickets Required | 300 capacity

🟢 XMTP Events:
• 10:00 AM - 6:00 PM: XMTP @ DevConnect
  Organized by XMTP Labs
  Location: La Rural | Included in Ticket | 500 capacity

🟡 Ethereum Events:
• All Day: ETH Day - Ethereum Day & Devconnect Opening Ceremony
  Organized by Devconnect Team
  Location: La Rural | Included in Ticket | Mixed Format
```

### 🎤 Real User Prompts for Testing

Here are 20 realistic prompts that DevConnect attendees would actually ask:

#### Speaker & Presentation Queries
1. **"What time does Vitalik speak?"**
   - Should search for Vitalik Buterin's talks across all days
   - Return specific time, location, and talk details

2. **"When is the Ethereum Foundation keynote?"**
   - Should find EF main presentations
   - Include time, location, and description

3. **"Is there a panel with Aave founders?"**
   - Search for Aave-related events and speakers
   - Return panel details and participants

4. **"What talks are happening on privacy?"**
   - Find privacy-focused sessions (zk, privacy tech)
   - Categorize by ecosystem and difficulty level

#### Interest-Based Recommendations
5. **"I'm interested in agents, what do you recommend I go see?"**
   - Search for AI agent, automation, and bot-related events
   - Prioritize by relevance and skill level

6. **"I want to learn about DeFi, what sessions should I attend?"**
   - Find DeFi workshops, talks, and hands-on sessions
   - Include beginner to advanced options

7. **"What's good for developers new to Ethereum?"**
   - Find beginner-friendly workshops and bootcamps
   - Focus on educational content

8. **"I'm into NFTs, any relevant events?"**
   - Search for NFT, digital art, and creative tech events
   - Include both technical and creative sessions

#### Time & Logistics Queries
9. **"What's happening right now?"**
   - Show currently live events
   - Include next few upcoming events

10. **"What's the first event tomorrow morning?"**
    - Find earliest event for next day
    - Include time, location, and registration info

11. **"Is there anything after 6 PM today?"**
    - Filter for evening events
    - Include social events and networking

12. **"What events don't require tickets?"**
    - Filter for included/free events
    - Show capacity and registration details

#### Location & Venue Queries
13. **"Where is the main stage?"**
    - Provide venue location details
    - Include directions and accessibility info

14. **"What's happening at La Rural?"**
    - Show all events at main venue
    - Include room/area details

15. **"Are there any off-site events?"**
    - Find events outside main venue
    - Include transportation details

#### Specific Technology Focus
16. **"What's there about Layer 2 solutions?"**
    - Find L2, scaling, and rollup-related events
    - Include both technical and business perspectives

17. **"I want to learn about zero-knowledge proofs"**
    - Find zk-related workshops and talks
    - Include hands-on coding sessions

18. **"Any events about account abstraction?"**
    - Search for AA, smart accounts, and wallet tech
    - Include both technical and UX discussions

#### Networking & Community
19. **"What are the best networking events?"**
    - Find social events, mixers, and community gatherings
    - Include capacity and registration requirements

20. **"Is there a hackathon happening?"**
    - Find ETHGlobal hackathon and other coding events
    - Include registration deadlines and prizes

#### 2. Specific Day Schedule
**Test Command:** `"What's happening on Tuesday?"` or `"Show me Tuesday's schedule"`

**Expected Behavior:**
- ✅ Returns Tuesday Nov 18 events
- ✅ Shows 3-4 most relevant events
- ✅ Maintains ecosystem categorization (Base takes priority)
- ✅ Includes all necessary event details

#### What's happening Today!!! Super important that on the day of the event the agent knows to give results for that day.


#### 3. Event Search
**Test Command:** `"When is the Staking Summit?"` or `"Find Base events"`

**Expected Behavior:**
- ✅ Searches across all days for specific events
- ✅ Returns relevant events with full context
- ✅ Highlights matching events clearly
- ✅ Provides time and location details

#### 4. Current Day Logic
**Test Scenarios:**
- **Before Nov 15:** Should show "No events today" or upcoming events
- **Nov 15-16:** Should show pre-events (Staking Summit, Governance Day)
- **Nov 17:** Should show ETH Day and DevConnect Cube opening
- **Nov 18-22:** Should show main event days
- **After Nov 23:** Should show "Event has ended" message

### Data Structure Requirements

### Key Test Data Points

#### Base Ecosystem Events
- Builder Nights Buenos Aires (Nov 17, 2-8 PM)
- Base @ DevConnect events
- Base-specific workshops and talks

#### XMTP Ecosystem Events  
- XMTP @ DevConnect (Nov 18, 10 AM-6 PM)
- XMTP workshops and developer sessions
- Privacy and messaging focused events

#### Ethereum Ecosystem Events
- ETH Day Opening Ceremony (Nov 17, All Day)
- DevConnect Cube (Nov 17-22, All Day)
- Ethereum Foundation events
- Core protocol discussions

### Error Handling Tests

#### 1. Database Connection Issues
**Test:** Disconnect database, request schedule
**Expected:** Graceful fallback to static data or error message

#### 2. Invalid Date Requests
**Test:** `"Show me the schedule for December 1st"`
**Expected:** "No events scheduled for that date" or current day fallback

#### 3. Empty Schedule
**Test:** Request schedule when no events exist
**Expected:** "No events scheduled for today" message

### Performance Requirements
- ✅ Schedule queries should complete within 2 seconds
- ✅ Should handle 100+ concurrent schedule requests
- ✅ Database queries should be optimized with proper indexes
- ✅ Response should be cached for 5 minutes to reduce load

### Integration Points
- **Quick Actions:** Schedule button in main menu
- **Database:** PostgreSQL with proper indexing
- **Time Zone:** Buenos Aires time (UTC-3)
- **Event Dates:** November 15-23, 2025

---

## 🔧 WiFi Feature Testing

### Current Implementation
Provides WiFi credentials and network information for DevConnect venues.

### Test Scenarios

#### 1. WiFi Information Request
**Test Command:** `"What's the WiFi password?"` or click "Wifi" button

**Expected Behavior:**
- ✅ Shows network name (SSID)
- ✅ Provides password
- ✅ Includes venue-specific information
- ✅ Shows connection instructions if needed

#### 2. Venue-Specific WiFi
**Test Command:** `"WiFi at La Rural"` or `"WiFi for the main venue"`

**Expected Behavior:**
- ✅ Returns venue-specific WiFi details
- ✅ Clear location identification

---

## 🎯 Event Logistics Testing

### Current Implementation
Provides general event information, venue details, and logistics support.

### Test Scenarios

#### 1. General Logistics
**Test Command:** `"What do I need to know about the event?"` or click "Event Logistics"

**Expected Behavior:**
- ✅ Shows venue information
- ✅ Provides check-in instructions
- ✅ Lists important event details
- ✅ Includes contact information

#### 2. Specific Logistics Questions
**Test Command:** `"Where is registration?"` or `"What time does it start?"`

**Expected Behavior:**
- ✅ Provides specific logistics information
- ✅ Direct answers to common questions
- ✅ Links to relevant resources

---

## 🏴‍☠️ Treasure Hunt Feature Testing

### Current Implementation
Interactive treasure hunt game with image validation using OpenAI Vision API.

### Test Scenarios

#### 1. Treasure Hunt Assignment
**Test Command:** Click "Treasure Hunt" button in DM

**Expected Behavior:**
- ✅ Assigns user to a treasure hunt group
- ✅ Shows current task for that group
- ✅ Provides submission instructions

**If group is already on a 3rd task the agent needs to know what task that group is on**

#### 2. Image Submission
**Test Command:** In treasure hunt group, send image with `@devconnectarg' or '@devconnectarg.base.eth

**Expected Behavior:**
- ✅ Validates image using OpenAI Vision
- ✅ Checks if image matches current task
- ✅ Provides feedback on submission
- ✅ Moves group to next task if successful

#### 3. Progress Tracking
**Test Command:** `"View Progress"` in treasure hunt group
**Quick Action Treasure Hunt** in a group chat the treasure hunt button gives them their current task rather than having them join a group"

**Expected Behavior:**
- ✅ Shows current task number
- ✅ Shows remaining tasks
- ✅ Provides encouragement

### Database Requirements
- Group assignment tracking
- Task progress per group
- Image submission history
- Validation results

---

## 👥 Group Features Testing

### Current Implementation
The agent supports three types of group management:
1. **Built-in Ecosystem Groups** - Direct Quick Actions for Base, XMTP, and ETH groups
2. **Activity Groups** - Pre-defined DevConnect groups (ETHCON Argentina, Staking Summit, Builder Nights)
3. **Sidebar Groups** - User-created focused discussion groups

### Built-in Group Joining (Quick Actions Menu)

#### 1. Base Group
**Test Command:** Click "Base Group" button in main menu

**Expected Behavior:**
- ✅ Adds user to Base ecosystem group
- ✅ Sends confirmation message
- ✅ Handles group not found errors gracefully
- ✅ Uses proper Base branding and messaging

#### 2. XMTP Group  
**Test Command:** Click "XMTP Group" button in main menu

**Expected Behavior:**
- ✅ Adds user to XMTP ecosystem group
- ✅ Sends confirmation message
- ✅ Handles group not found errors gracefully
- ✅ Uses proper XMTP branding and messaging

#### 3. ETH Group
**Test Command:** Click "ETH Group" button in main menu (if enabled)

**Expected Behavior:**
- ✅ Adds user to Ethereum ecosystem group
- ✅ Sends confirmation message
- ✅ Handles group not found errors gracefully
- ✅ Uses proper Ethereum branding and messaging

#### 4. Main Menu Group Buttons Testing
**Test Command:** Click each group button in the main Quick Actions menu

**Expected Behavior:**
- ✅ All group buttons are visible and properly styled
- ✅ Base Group button has Base branding/image
- ✅ XMTP Group button has XMTP branding/image  
- ✅ ETH Group button has Ethereum branding/image (if enabled)
- ✅ Each button triggers appropriate group joining logic
- ✅ Error handling works consistently across all buttons

### Activity Groups Testing

#### 1. Group Joining
**Test Commands:** 
- Click "More Groups" → Select specific group
- `"Join Builder Nights"` or `"Add me to ETHCON Argentina"`

**Expected Behavior:**
- ✅ Shows group selection Quick Actions
- ✅ Successfully adds user to selected group
- ✅ Sends confirmation message with group details
- ✅ Handles group not found errors gracefully

**Available Activity Groups:**
- 🇦🇷 ETHCON Argentina 2025
- ⛰️ Staking Summit  
- 🔨 Builder Nights Buenos Aires

#### 2. Group Selection Menu
**Test Command:** Click "More Groups" button

**Expected Behavior:**
- ✅ Shows Quick Actions with all available groups
- ✅ Each group has proper emoji and descriptive name
- ✅ Groups are properly categorized and styled

#### 3. Error Handling
**Test Scenarios:**
- Group not found in agent's conversations
- User already in group
- Network/installation verification failures

**Expected Behavior:**
- ✅ Clear error messages explaining the issue
- ✅ Suggests contacting support when appropriate
- ✅ Handles temporary network issues gracefully

### Sidebar Groups Testing

#### 1. Creating Sidebar Groups
**Test Command:** `"@devconnectarg sidebar MyGroupName"` in any group chat

**Expected Behavior:**
- ✅ Creates new XMTP group with requester and agent
- ✅ Automatically adds bankr to the group
- ✅ Sets requester as super admin
- ✅ Sends welcome message to the new group
- ✅ Provides invitation Quick Actions for others to join

#### 2. Joining Sidebar Groups
**Test Command:** Click "✅ Yes, Join" Quick Action from sidebar invitation

**Expected Behavior:**
- ✅ Successfully adds user to sidebar group
- ✅ Sends welcome message to group
- ✅ Updates member tracking
- ✅ Handles already-member scenarios
- ✅ **CRITICAL**: Intent handling must be properly configured in agent SDK

#### 3. Sidebar Group Management
**Test Features:**
- Group naming and metadata storage
- Member tracking and updates
- Admin privileges for creators
- Integration with bankr user

**Expected Behavior:**
- ✅ Proper group metadata storage
- ✅ Accurate member count tracking
- ✅ Admin privileges work correctly
- ✅ Bankr integration functions

### Group Feature Database Requirements

#### Activity Groups Schema
```sql
-- Groups are managed via XMTP, no local storage needed
-- Group IDs are hardcoded in ACTIVITY_GROUPS constant
```

#### Sidebar Groups Schema
```sql
CREATE TABLE group_details (
  id SERIAL PRIMARY KEY,
  group_id TEXT UNIQUE NOT NULL,
  group_name TEXT NOT NULL,
  group_type TEXT NOT NULL, -- 'sidebar' or 'activity'
  created_by TEXT NOT NULL,
  member_count INTEGER DEFAULT 0,
  description TEXT,
  original_group_id TEXT, -- For sidebar groups
  total_messages INTEGER DEFAULT 0,
  total_mentioned_messages INTEGER DEFAULT 0,
  total_leaves INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📢 Broadcast Feature Testing

### Current Implementation
Allows authorized users to send messages to all DM conversations (not groups) with preview and confirmation.

### Test Scenarios

#### 1. Basic Broadcast
**Test Command:** `"/broadcast Welcome to DevConnect! The opening ceremony starts in 30 minutes."`

**Expected Behavior:**
- ✅ Shows preview of formatted message
- ✅ Asks for confirmation with Quick Actions
- ✅ Sends to all DM conversations (skips groups)
- ✅ Provides delivery statistics
- ✅ Includes sender identification

#### 2. Broadcast with Quick Actions
**Test Command:** `"/broadcastactions Join us for the networking event! Click below to RSVP."`

**Expected Behavior:**
- ✅ Shows preview with Quick Actions
- ✅ Sends formatted message with action buttons
- ✅ Delivers to all DM conversations
- ✅ Includes proper formatting and sender info

#### 3. Authorization Testing
**Test Scenarios:**
- Authorized user (should work)
- Unauthorized user (should be denied)
- Invalid commands (should show help)

**Expected Behavior:**
- ✅ Authorized users can send broadcasts
- ✅ Unauthorized users get access denied message
- ✅ Invalid commands show usage instructions

#### 4. Broadcast Preview
**Test Command:** Any `/broadcast` command

**Expected Behavior:**
- ✅ Shows formatted message preview
- ✅ Displays sender information
- ✅ Shows delivery scope (all DM conversations)
- ✅ Provides Yes/No confirmation options

#### 5. Broadcast Confirmation
**Test Commands:** 
- Click "✅ Yes, Send" after preview
- Click "❌ No, Cancel" after preview

**Expected Behavior:**
- ✅ Sends broadcast when confirmed
- ✅ Cancels broadcast when declined
- ✅ Clears pending broadcast state
- ✅ Provides delivery results

### Broadcast Data Structure

#### Pending Broadcasts
```typescript
interface PendingBroadcast {
  message: string;
  senderInboxId: string;
  conversationId: string;
  senderName: string;
  formattedContent: string;
}
```

#### Authorization
- Uses basename-based authorization
- Checks against authorized broadcaster list
- Validates sender identity before allowing broadcast

### Error Handling Tests

#### 1. System Not Initialized
**Test:** Broadcast when system is down
**Expected:** "Broadcast system not initialized" message

#### 2. No Conversations
**Test:** Broadcast when no DM conversations exist
**Expected:** "No conversations found to broadcast to" message

#### 3. Delivery Failures
**Test:** Some conversations fail to receive broadcast
**Expected:** Shows success/failure counts in results

---

## ⏰ Reminders Feature Testing

### Current Implementation
Allows users to set time-based reminders that are sent back to the conversation where they were created.

### Test Scenarios

#### 1. Setting Reminders
**Test Commands:**
- `"Remind me in 30 minutes to check the schedule"`
- `"Set a reminder for tomorrow at 2pm to attend the keynote"`
- `"Remind me today at 3:30pm to go to the networking event"`

**Expected Behavior:**
- ✅ Parses natural language time expressions
- ✅ Converts to user's timezone and event timezone
- ✅ Stores reminder in database
- ✅ Shows confirmation with both timezones
- ✅ Validates time is in the future

#### 2. Time Zone Handling
**Test Scenarios:**
- User in different timezone than event
- Auto-detection of user timezone
- Conversion between user time and event time

**Expected Behavior:**
- ✅ Auto-detects user timezone
- ✅ Shows times in both user and event timezones
- ✅ Stores reminders in UTC for consistency
- ✅ Handles timezone conversion correctly

#### 3. Viewing Reminders
**Test Command:** `"Show my reminders"` or `"What reminders do I have?"`

**Expected Behavior:**
- ✅ Lists all pending reminders
- ✅ Shows times in user's timezone
- ✅ Includes reminder IDs and messages
- ✅ Shows "No pending reminders" when empty

#### 4. Canceling Reminders
**Test Commands:**
- `"Cancel reminder #123"`
- `"Cancel all my reminders"`

**Expected Behavior:**
- ✅ Cancels specific reminder by ID
- ✅ Cancels all reminders for user
- ✅ Confirms cancellation
- ✅ Handles invalid reminder IDs

#### 5. Reminder Delivery
**Test:** Set reminder for 1 minute in future, wait for delivery

**Expected Behavior:**
- ✅ Delivers reminder to correct conversation
- ✅ Sends at correct time
- ✅ Marks reminder as sent
- ✅ Includes reminder message

### Time Parsing Tests

#### Supported Formats
- `"in 30 minutes"`
- `"tomorrow at 2pm"`
- `"today at 3:30pm"`
- `"2025-11-18 14:00"`
- `"next Tuesday at 10am"`

#### Expected Behavior
- ✅ Parses all supported formats
- ✅ Handles relative times correctly
- ✅ Validates times are in the future
- ✅ Shows helpful error for invalid formats

### Reminder Dispatcher Testing

#### 1. Background Processing
**Test:** Set multiple reminders, verify they're processed

**Expected Behavior:**
- ✅ Checks for due reminders every 30 seconds
- ✅ Sends reminders at correct times
- ✅ Marks reminders as sent
- ✅ Handles multiple reminders correctly

#### 2. Conversation Targeting
**Test:** Set reminders in different conversations

**Expected Behavior:**
- ✅ Sends reminders to correct conversation
- ✅ Doesn't send to wrong conversations
- ✅ Handles conversation not found errors

---

## 🚀 Deployment Testing

### Railway Deployment
1. **Environment Variables:**
   - `XMTP_WALLET_KEY`: Agent wallet private key
   - `XMTP_DB_ENCRYPTION_KEY`: Database encryption key
   - `XMTP_ENV`: Set to "production"
   - `OPENAI_API_KEY`: For treasure hunt image validation
   - `DATABASE_URL`: PostgreSQL connection string

2. **Build Process:**
   - TypeScript compilation
   - Dependency installation
   - Database schema creation

3. **Runtime Checks:**
   - Agent starts successfully
   - Database connection established
   - All tools loaded correctly
   - Quick Actions working

### Local Development
1. **Database Setup:**
   - PostgreSQL running locally
   - Database created and migrated
   - Test data populated

2. **Environment:**
   - `.env` file configured
   - All required keys present
   - Development mode enabled

---

## 📊 Success Criteria

### Schedule Feature
- ✅ Shows 3-4 events per request
- ✅ Includes all three ecosystems
- ✅ Proper time zone handling
- ✅ Fast response times (<2s)
- ✅ Accurate event information

### Overall Agent
- ✅ Responds to all Quick Actions
- ✅ Handles group and DM conversations
- ✅ Maintains context across messages
- ✅ Provides helpful, accurate information
- ✅ Graceful error handling

### Performance
- ✅ 99% uptime
- ✅ <2 second response times
- ✅ Handles 100+ concurrent users
- ✅ Database queries optimized

---

## 🐛 Common Issues to Watch For

1. **Schedule Display:**
   - Too many events shown (should be 3-4 max)
   - Missing ecosystem categorization
   - Incorrect time zone handling
   - Database connection failures

2. **Treasure Hunt:**
   - Image validation not working
   - Group assignment failures
   - Progress not tracking correctly
   - OpenAI API errors

3. **General Agent:**
   - Quick Actions not responding
   - Database connection issues
   - Environment variable problems
   - TypeScript compilation errors

---

## 📝 Testing Checklist

### Pre-Deployment
- [ ] All TypeScript compiles without errors
- [ ] Database schema created successfully
- [ ] All environment variables set
- [ ] Local testing completed
- [ ] All Quick Actions working

### Post-Deployment
- [ ] Agent starts successfully on Railway
- [ ] Database connection established
- [ ] Schedule feature working
- [ ] WiFi information accessible
- [ ] Event logistics responding
- [ ] Treasure hunt functional
- [ ] All group features working

### User Acceptance Testing
- [ ] Schedule shows 3-4 events correctly
- [ ] All ecosystems represented
- [ ] Time zone accurate
- [ ] Quick Actions responsive
- [ ] Error messages helpful
- [ ] Performance acceptable

---

*This guide should be updated as new features are added or existing features are modified.*
