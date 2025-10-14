# Fresh Start - Fix Base App Connection

## The Problem
You have 2 installations:
- ✅ **Current**: `87e6ae45921dfe66...` (XMTP apps use this)
- ❌ **Old**: `c4b3c0f91bc7c1b5...` (Base App is stuck on this)

Base App cached the old installation, so it's not seeing messages from the new one.

## Solution: Fresh Installation

### Step 1: Kill running agents
```bash
pkill -f "devconnect-concierge.*tsx"
```

### Step 2: Backup current database (optional)
```bash
cp -r .data/xmtp .data/xmtp-backup-$(date +%Y%m%d)
```

### Step 3: Delete old database
```bash
rm -rf .data/xmtp/*
```

### Step 4: Start agent (creates fresh installation)
```bash
npm run dev:agent-sdk
```

You should see:
```
🚀 Starting DevConnect 2025 Concierge Agent (Agent SDK)
...
✓ Agent Address: 0x3dF8E2C423d0D02B5f95296aD40e13075a1D6eB5
✓ Agent Inbox ID: 1b202705df1415c60afa47c61f5c472da31c94afd6f03b00cb73c663b4a85273
✓ Current Installation ID: [NEW ID - only one]
```

### Step 5: Reconnect Base App
1. Open Base App
2. Search for your agent address: `0x3dF8E2C423d0D02B5f95296aD40e13075a1D6eB5`
3. Send a test message: "hello"
4. You should now get a response!

## Why This Works

- Fresh database = Only 1 installation
- Both XMTP and Base App will connect to the same installation
- No more conflicts

## Alternative: Use OLD Database (Keep History)

If you want to keep your message history:

### Option A: Force Base App to use NEW installation
Base App needs to refresh its cached installation list:
1. Close Base App completely
2. Clear Base App cache/data (if possible)
3. Reopen and reconnect to agent

### Option B: Continue with CURRENT setup
The current installation (`87e6ae45921dfe66...`) works in XMTP apps. Base App will eventually sync to it after 24-48 hours.

## Recommended: Fresh Start

For immediate fix, do the **Fresh Installation** (Steps 1-5 above).


