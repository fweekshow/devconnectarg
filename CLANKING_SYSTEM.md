# Clanking System Documentation

## Overview
The Clanking System transforms group creation into a token-based community platform by integrating with the Clanker API v4.0.0. When users create a "clanking group," a custom token is automatically deployed on Base chain with configurable rewards split between the creator and Rocky.

## Features

### 🎯 Core Functionality
- **Token Creation**: Automatically deploys ERC-20 tokens via Clanker API v4.0.0
- **Group Management**: Creates XMTP groups with custom token integration
- **Image Support**: Requires image uploads for token branding
- **Reward Splits**: 80% creator / 20% Rocky reward allocation
- **Database Integration**: Stores token metadata with group information

### 💰 Reward Configuration
Based on [Clanker v4.0.0 API Documentation](https://clanker.gitbook.io/clanker-documentation/authenticated/deploy-token-v4.0.0):

- **Creator**: 80% allocation
  - Admin: Creator's wallet address
  - Recipient: Creator's wallet address
  - Rewards Token: "Both" (Clanker token + paired token)
  
- **Rocky**: 20% allocation
  - Admin: Rocky's wallet address
  - Recipient: Rocky's wallet address
  - Rewards Token: "Both" (Clanker token + paired token)

### 🏊 Pool Configuration
- **Type**: Standard pool with single LP position
- **Paired Token**: WETH (0x4200000000000000000000000000000000000006)
- **Initial Market Cap**: 10 WETH
- **Chain**: Base (chainId: 8453)

### 💸 Fee Configuration
- **Type**: Static fees
- **Clanker Fee**: 1% on Clanker token inputs
- **Paired Fee**: 1% on paired token (WETH) inputs

## User Flow

### Creating a Clanking Group

1. **User uploads an image** in a group chat
2. **User types**: `clank MyAwesomeGroup`
3. **System processes**:
   - Extracts image URL from message
   - Calls Clanker API v4.0.0 to deploy token
   - Creates XMTP group with user as super admin
   - Adds Bankr to the group automatically
   - Stores token metadata in database
4. **System responds** with:
   - Token deployment confirmation
   - Token address and details
   - Group invitation with Quick Actions

### Joining a Clanking Group

1. **User sees invitation** with Quick Actions in original group
2. **User clicks** "✅ Yes, Join"
3. **System adds user** to the clanking group
4. **User receives** welcome message with token details

## Technical Implementation

### API Integration

**Endpoint**: `https://www.clanker.world/api/tokens/deploy/v4`

**Headers**:
```
x-api-key: rocky-bon2i-0svuh0wouh-infgjbk
Content-Type: application/json
```

**Payload Structure**:
```json
{
  "token": {
    "name": "GroupName",
    "symbol": "GRPNM",
    "image": "https://example.com/image.png",
    "tokenAdmin": "0x...", // Creator's address
    "description": "Exclusive token for GroupName clanking group members",
    "requestKey": "32-char-unique-string"
  },
  "rewards": [
    {
      "admin": "0x...", // Creator
      "recipient": "0x...", // Creator
      "allocation": 80,
      "rewardsToken": "Both"
    },
    {
      "admin": "0x...", // Rocky
      "recipient": "0x...", // Rocky
      "allocation": 20,
      "rewardsToken": "Both"
    }
  ],
  "pool": {
    "type": "standard",
    "pairedToken": "0x4200000000000000000000000000000000000006",
    "initialMarketCap": 10
  },
  "fees": {
    "type": "static",
    "clankerFee": 1,
    "pairedFee": 1
  },
  "chainId": 8453
}
```

### File Structure

**Main Files**:
- `src/services/agent/tools/clankingGroups.ts` - Core clanking functionality
- `src/index-agent-sdk.ts` - Agent integration and message handling

**Key Functions**:
- `createClankerToken()` - Deploys token via Clanker API
- `handleClankingRequest()` - Processes group creation requests
- `joinClankingGroup()` - Adds users to existing groups
- `declineClankingGroup()` - Handles invitation declines
- `parseClankingCommand()` - Extracts group name from messages
- `isClankingRequest()` - Detects clanking commands

### Database Schema

Groups are stored with metadata including:
```typescript
{
  groupId: string,
  groupName: string,
  groupType: 'clanking',
  createdBy: string, // Creator's address
  memberCount: number,
  description: string,
  originalGroupId: string,
  metadata: {
    tokenAddress: string,
    tokenId: string,
    imageUrl: string
  }
}
```

## Configuration

### Environment Variables
- `CLANKER_API_KEY`: rocky-bon2i-0svuh0wouh-infgjbk

### Constants
- `ROCKY_WALLET_ADDRESS`: 0x742d35Cc6634C0532925a3b8D4C9db7cd4b5b31D (needs to be updated with actual address)
- `BANKR_INBOX_ID`: 062b31e55329b63c5eb6889e89893ac40a5680e97b2bd2444ae98cb0af72fa9b

## Testing Checklist

### ✅ Completed
- [x] Created clankingGroups.ts with v4.0.0 API integration
- [x] Integrated into main agent (index-agent-sdk.ts)
- [x] Added message parsing and image detection
- [x] Implemented join/decline action handlers
- [x] Configured 80%/20% reward split
- [x] Set up proper API endpoint and headers
- [x] Added database integration for metadata storage

### ⏳ Pending (User Testing Required)
- [ ] Test token deployment with real images
- [ ] Verify reward allocation on-chain
- [ ] Test group creation flow end-to-end
- [ ] Validate token appears in Clanker.world
- [ ] Confirm creator receives 80% of fees
- [ ] Confirm Rocky receives 20% of fees
- [ ] Test multiple groups creation
- [ ] Verify image URLs are properly stored

## Important Notes

1. **Rocky's Wallet Address**: Currently set to `0x742d35Cc6634C0532925a3b8D4C9db7cd4b5b31D` - **UPDATE THIS** with Rocky's actual wallet address before deployment.

2. **API Access**: Clanker API access is granted on a case-by-case basis. Ensure your API key (`rocky-bon2i-0svuh0wouh-infgjbk`) is valid and active.

3. **Image Requirements**: Users MUST upload an image before using the clank command, otherwise they'll receive an error message.

4. **Token Deployment**: Token deployment is queued via Clanker API and may take a few moments to complete. The system receives an `expectedAddress` which is used as the token identifier.

5. **Rewards Claiming**: Reward recipients can claim their accumulated fees through the Clanker platform at a later time.

## Error Handling

The system handles various error cases:
- Missing image attachment
- Clanker API errors
- Group creation failures
- User already in group
- Network issues

All errors are logged and user-friendly messages are sent to the requester.

## Next Steps

1. **Update Rocky's wallet address** in `clankingGroups.ts`
2. **Test with real users** to validate the complete flow
3. **Monitor Clanker API** responses for any issues
4. **Verify on-chain** that tokens are deployed correctly
5. **Check reward accumulation** on Clanker.world dashboard

## Resources

- [Clanker API Documentation](https://clanker.gitbook.io/clanker-documentation)
- [Deploy Token v4.0.0 Endpoint](https://clanker.gitbook.io/clanker-documentation/authenticated/deploy-token-v4.0.0)
- [Creator Rewards & Fees](https://clanker.gitbook.io/clanker-documentation/general/creator-rewards-and-fees)

