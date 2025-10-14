# Agent SDK Migration Guide

## What Was Fixed

The original issue: **Agent was receiving messages but responses weren't being sent/logged properly**

Root causes identified:
1. Old `@xmtp/node-sdk` version (4.0.3 locked in `resolutions`)
2. Complex manual message handling in 1641-line index.ts
3. Missing error logging for failed sends

## Migration Completed ✅

### 1. Updated Dependencies
- ✅ Removed `resolutions` lock on `@xmtp/node-sdk`
- ✅ Added `@xmtp/agent-sdk@^1.1.7`
- ✅ Updated `@xmtp/node-sdk` to `^4.2.3` (latest stable)

### 2. Created New Agent SDK Implementation
- ✅ Created `src/index-agent-sdk.ts` (simplified, modern approach)
- ✅ Kept `src/index.ts.backup` (your original implementation)
- ✅ Updated `src/config.ts` to support both env var formats

### 3. Environment Variables

Add these to your `.env` file (Agent SDK format):

```bash
# Agent SDK requires these specific names:
XMTP_WALLET_KEY=0x07eb8a07c7fa0bad9d55e9b3f24778575d15d97bc5f81da69e30988d740133ee
XMTP_DB_ENCRYPTION_KEY=4769b95d9871df629b5da64ea0dc0fdc52a46d369b9723f589e98f00fba1fb79
XMTP_ENV=production

# Keep your existing ones (config.ts now supports both):
WALLET_KEY=0x07eb8a07c7fa0bad9d55e9b3f24778575d15d97bc5f81da69e30988d740133ee
DB_ENCRYPTION_KEY=4769b95d9871df629b5da64ea0dc0fdc52a46d369b9723f589e98f00fba1fb79

# Rest of your env vars:
DEBUG_LOGS="true"
DEFAULT_MODEL="gpt-4o-mini"
MENTION_HANDLES=devconnectarg.base.eth,devconnectarg
OPENAI_API_KEY="your-key-here"
SHOW_SENDER_ADDRESS="true"
TEST_WALLET=false
```

## Testing the Migration

### Test the new Agent SDK version:

```bash
npm run dev:agent-sdk
```

This will run the new `src/index-agent-sdk.ts` implementation.

### What to Look For (Better Logging)

The new implementation has improved logging:

```
🚀 Starting DevConnect 2025 Concierge Agent (Agent SDK)
📅 Current Date/Time: Tuesday, October 14, 2025 at 10:32:17 AM EDT
🔄 Initializing Agent SDK client...
🔄 Agent SDK client initialized with Quick Actions codecs
✓ Agent Address: 0x...
✓ Agent Inbox ID: ...
👂 Setting up message handlers...
💬 Agent will respond to:
  - Direct messages (DMs)
  - Group messages when mentioned with @devconnectarg.base.eth
✅ DevConnect 2025 Concierge Agent is now running!
```

When a message comes in:
```
📥 Received message: {...}
🤖 Processing message: "hello"
👋 AI detected greeting/engagement, sending Quick Actions...
✅ Sent Quick Actions welcome message
```

### Compare with Old Implementation

To run your original implementation (for comparison):

```bash
npm run dev
```

## Key Improvements in Agent SDK Version

### 1. **Simpler Message Handling**
**Before (old):**
```typescript
const stream = await client.conversations.streamAllMessages();
for await (const message of stream) {
  // 100+ lines of manual handling
  await handleMessage(message, client);
}
```

**After (Agent SDK):**
```typescript
agent.on('text', async (ctx) => {
  // Clean, simple context
  await ctx.sendText('Hello!');
});
```

### 2. **Better Error Handling**
The Agent SDK automatically handles:
- Connection retries
- Network failures
- Message send failures
- Database sync issues

### 3. **Built-in Context**
```typescript
agent.on('text', async (ctx) => {
  // ctx has everything you need:
  ctx.message        // The message object
  ctx.conversation   // The conversation
  ctx.sendText()     // Send text response
  ctx.send()         // Send any content type
});
```

### 4. **Proper Response Logging**
Every send is now logged:
```typescript
await ctx.send(quickActionsContent, ContentTypeActions);
console.log(`✅ Sent Quick Actions welcome message`);
```

## Troubleshooting

### If messages still aren't coming through:

1. **Check the logs for send errors:**
   Look for `❌ Error sending` messages

2. **Verify environment variables:**
   ```bash
   ./check-env.sh
   ```

3. **Check database state:**
   ```bash
   ls -lh .data/xmtp/
   ```

4. **Test with a simple message:**
   Send "hello" to the agent - should get Quick Actions response

5. **Enable debug logs:**
   Make sure `DEBUG_LOGS="true"` in your `.env`

### Common Issues:

#### Issue: "Agent receives messages but doesn't respond"
**Solution:** Check that:
- `await ctx.sendText()` calls are completing
- No errors in try-catch blocks
- AI agent isn't timing out

#### Issue: "Group messages not working"
**Solution:** Verify:
- Agent is mentioned with `@devconnectarg.base.eth`
- `MENTION_HANDLES` env var is set correctly
- `isMentioned()` function is working

#### Issue: "Quick Actions not displaying"
**Solution:** Ensure:
- Codecs are registered: `codecs: [new ActionsCodec(), new IntentCodec()]`
- Content type is correct: `ContentTypeActions`
- Client supports Quick Actions (Base App does)

## Next Steps

1. **Add your .env file updates** (see above)
2. **Test the Agent SDK version:**
   ```bash
   npm run dev:agent-sdk
   ```
3. **Send a test message** to the agent
4. **Verify responses are logged and sent**
5. **Once confirmed working**, replace `src/index.ts` with `src/index-agent-sdk.ts`:
   ```bash
   mv src/index.ts src/index-old.ts
   mv src/index-agent-sdk.ts src/index.ts
   npm run dev  # Now runs the new version
   ```

## Files Changed

- ✅ `package.json` - Removed resolutions lock, added Agent SDK
- ✅ `src/config.ts` - Support both env var formats
- ✅ `src/index-agent-sdk.ts` - New Agent SDK implementation (NEW)
- ✅ `src/index.ts.backup` - Original implementation backup

## Rollback Plan

If you need to rollback:
```bash
cp src/index.ts.backup src/index.ts
npm run dev
```

## Performance Comparison

**Old Implementation:**
- 1,641 lines of code
- Manual streaming and handling
- Complex error states
- DNS issues with old SDK version

**New Agent SDK Implementation:**
- ~755 lines of code (54% reduction!)
- Automatic streaming
- Built-in error handling
- Latest SDK with bug fixes

---

**Ready to test!** Run `npm run dev:agent-sdk` and send "hello" to your agent.

