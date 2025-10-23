# Clanking System - Implementation Complete! 🪙

## ✅ What We Built

A complete Quick Action-based system for creating token-backed group chats using the Clanker API v4.0.0.

### **User Flow**

1. **User clicks "🪙 Clank" button** (in main menu)
2. **Rocky asks for details**: "Please reply with group name + image"
3. **User sends**: "My Awesome Group" + uploads image
4. **Rocky creates group immediately** (user gets instant access)
5. **Rocky launches token** (awaits Clanker API)
6. **Rocky shares token info** in the new group chat

### **Key Features**

- ✅ State machine tracks clanking flow
- ✅ RemoteAttachment support for images
- ✅ Group created first (immediate access)
- ✅ Token creation awaited, then info shared in group
- ✅ 80%/20% reward split (creator/Rocky)
- ✅ Static 1%/1% fees
- ✅ 10 WETH initial market cap
- ✅ Base chain deployment
- ✅ Error handling for failed token creation

---

## 🔧 Technical Implementation

### **Files Modified**

1. **`src/services/agent/tools/clankingGroups.ts`**
   - State machine for tracking users in clanking flow
   - `startClankingFlow()` - Initiates the process
   - `isInClankingFlow()` - Checks if user is waiting
   - `handleClankingResponse()` - Processes name + image
   - `createClankerToken()` - Calls Clanker API v4.0.0
   - `sendGroupInvitation()` - Sends Quick Actions to original group

2. **`src/index-agent-sdk.ts`**
   - Added "🪙 Clank" button to main menu
   - Added `clank_start` case handler
   - Added clanking flow detection for DMs
   - Extract RemoteAttachment image URLs
   - Handles clanking join/decline actions

---

## 📋 Configuration

### **Clanker API v4.0.0 Settings**

```javascript
{
  token: {
    name: "[User's Group Name]",
    symbol: "[First 5 letters uppercase]",
    image: "[User's uploaded image URL]",
    tokenAdmin: "[Creator's wallet address]",
    requestKey: "[32-char unique string]"
  },
  rewards: [
    {
      admin: "[Creator's address]",
      recipient: "[Creator's address]",
      allocation: 80,  // 80% to creator
      rewardsToken: "Both"
    },
    {
      admin: "0x6CBA9857c1593927800575dBD7d61ddf0A048DEA",
      recipient: "0x6CBA9857c1593927800575dBD7d61ddf0A048DEA",
      allocation: 20,  // 20% to Rocky
      rewardsToken: "Both"
    }
  ],
  pool: {
    type: "standard",
    pairedToken: "0x4200000000000000000000000000000000000006", // WETH
    initialMarketCap: 10  // 10 WETH (~$30k)
  },
  fees: {
    type: "static",
    clankerFee: 1,    // 1% on token trades
    pairedFee: 1       // 1% on WETH trades
  },
  chainId: 8453  // Base
}
```

---

## 🎯 User Experience Flow

### **Step-by-Step**

**1. User Action:**
```
User: [Clicks "🪙 Clank" button in menu]
```

**2. Rocky Response:**
```
Rocky: 🪙 Let's create your Clanking Group!

Please reply with:
1️⃣ Your group name
2️⃣ Upload an image (will be your token logo)

Example: "My Awesome Group" + [image attachment]
```

**3. User Reply:**
```
User: Crypto Friends
User: [uploads cool_logo.png]
```

**4. Rocky Creates Group:**
```
[Group "Crypto Friends" is created]
[User instantly becomes member & super admin]
[Bankr added automatically]
```

**5. In the New Group:**
```
Rocky: 🎉 Welcome to "Crypto Friends"!

🪙 Creating your custom token... This will take a moment.
```

**6. After Token Creation:**
```
Rocky: ✅ Token Created Successfully!

🪙 Your Custom Token:
• Address: `0x1234...abcd`
• View on Clanker: https://clanker.world/clanker/0x1234...abcd
• View on Base: https://basescan.org/token/0x1234...abcd

💰 Revenue Split:
• You receive 80% of trading fees
• Rocky receives 20% of trading fees

You are now a group admin and can manage this space!
```

**7. In Original Group:**
```
Rocky: 🎯 "Crypto Friends" clanking group created with custom token! 
Would you like to join this exclusive group?

[✅ Yes, Join] [❌ No Thanks]
```

---

## 🧪 Ready to Test!

### **What to Test:**

1. **Click Clank Button** ✅
   - Verify prompt appears
   - Check state is tracked

2. **Send Name + Image** ✅
   - Test with RemoteAttachment
   - Verify image URL extraction

3. **Group Creation** ✅
   - User gets instant access
   - User is super admin
   - Bankr is added

4. **Token Creation** ✅
   - Verify API call succeeds
   - Check token address returned
   - Confirm on clanker.world

5. **Token Info Sharing** ✅
   - Verify message in group
   - Check links work
   - Confirm reward split visible

6. **Error Handling** ✅
   - Test without image
   - Test with invalid name
   - Test if Clanker API fails

---

## 🚀 Next Steps

### **Before Production:**

- [ ] Test with real Clanker API
- [ ] Verify token appears on clanker.world
- [ ] Confirm rewards accumulate correctly
- [ ] Test with multiple users
- [ ] Monitor for errors in production logs

### **Future Enhancements:**

- [ ] Add token vaulting (lockup periods)
- [ ] Support social media URLs
- [ ] Dynamic fees for volatile tokens
- [ ] Multiple token deployment options
- [ ] Token analytics dashboard

---

## 📚 Resources

- [Clanker API v4.0.0 Documentation](https://clanker.gitbook.io/clanker-documentation/authenticated/deploy-token-v4.0.0)
- [Creator Rewards & Fees](https://clanker.gitbook.io/clanker-documentation/general/creator-rewards-and-fees)
- [Supported Quote Tokens](https://clanker.gitbook.io/clanker-documentation/references/supported-quote-tokens)
- Rocky's Wallet: `0x6CBA9857c1593927800575dBD7d61ddf0A048DEA`
- API Key: `rocky-bon2i-0svuh0wouh-infgjbk`

---

## 🎉 Success Metrics

When a user successfully clanks:

1. ✅ Group created with custom name
2. ✅ User is super admin
3. ✅ Token deployed on Base
4. ✅ 80%/20% split configured
5. ✅ Token visible on clanker.world
6. ✅ Trading fees accumulate to both parties
7. ✅ Other users can join via Quick Actions

**The clanking system is ready for testing!** 🚀

