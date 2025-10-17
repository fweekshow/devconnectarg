# DevConnect Treasure Hunt Feature

## Concept
Interactive scavenger hunt where users work together in small groups to find items around the venue, submit photos via XMTP, and have an AI agent validate their submissions.

## How It Works

### User Flow
1. User clicks "Treasure Hunt" button in Rocky's menu
2. Rocky randomly assigns them to 1 of 20 pre-created XMTP groups (balanced distribution)
3. Group receives their first task (e.g., "Find something blue")
4. Team members search together, take a photo
5. Submit photo in group chat by mentioning `@devconnectarg` with the image
6. Rocky validates the photo using OpenAI Vision
7. If validated ✅, Rocky sends the next task
8. Repeat until all 10 tasks completed
9. First group to complete all tasks wins!

### Example Tasks (10 total)
- Find something blue
- Take a photo with someone wearing a DevConnect shirt
- Find the La Rural sign
- Group photo with all members
- Find a laptop with Ethereum sticker
- etc.

## Technical Architecture

### Database Schema (PostgreSQL on Railway)
```sql
-- Track each group's progress
CREATE TABLE treasure_hunt_groups (
  group_id TEXT PRIMARY KEY,
  current_task_index INTEGER DEFAULT 0,
  completed_tasks JSONB, -- Array of completed task indices
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Track user assignments (prevent users from joining multiple groups)
CREATE TABLE treasure_hunt_participants (
  user_inbox_id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES treasure_hunt_groups(group_id),
  joined_at TIMESTAMP DEFAULT NOW()
);

-- Track photo submissions and validations
CREATE TABLE treasure_hunt_submissions (
  id SERIAL PRIMARY KEY,
  group_id TEXT REFERENCES treasure_hunt_groups(group_id),
  task_index INTEGER NOT NULL,
  image_url TEXT,
  submitted_by TEXT,
  validated BOOLEAN DEFAULT FALSE,
  ai_response TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_group_progress ON treasure_hunt_groups(current_task_index);
CREATE INDEX idx_submissions_group ON treasure_hunt_submissions(group_id, task_index);
```

### Key Components Needed

#### 1. Group Pre-Creation
- Create 20 XMTP groups: "Treasure Hunt #1" through "#20"
- Store group IDs in config
- Agent must be added to all groups
- **Script needed:** `createTreasureHuntGroups.ts`

#### 2. Random Assignment
- When user clicks button, find least-full group
- Add user to that group
- Record assignment in PostgreSQL database
- Send welcome message with first task
- **File:** `src/services/agent/tools/treasureHunt.ts`

#### 3. Image Validation
- Detect when user sends image + mention in treasure hunt group
- Download/decrypt XMTP remote attachment
- Send to OpenAI Vision API with task-specific prompt
- Parse response (YES/NO + explanation)
- Update database and send next task if valid
- **Uses:** OpenAI `gpt-4o` or `gpt-4-vision-preview`

#### 4. Conditional Quick Actions
- Each group sees different buttons based on their current task
- Button says "📸 Submit [Current Task]"
- Only show to users in active treasure hunt groups

#### 5. Task Definitions
```typescript
const TASKS = [
  {
    index: 0,
    description: "Find something blue and take a photo",
    validationPrompt: "Does this image show a blue object? YES or NO.",
    hint: "Look around the venue for blue items!"
  },
  // ... 9 more
];
```

## Technical Requirements

### Infrastructure
- ✅ PostgreSQL database on Railway (migrating from SQLite)
- ✅ XMTP client (already have)
- ✅ OpenAI API access (already have)
- ✅ Quick Actions framework (already have)
- 🔨 Image handling (XMTP remote attachments - need to add)
- 🔨 20 pre-created XMTP groups (need to create)

### New Dependencies
- None! Everything uses existing packages

### Estimated Costs
- **OpenAI Vision**: ~$0.01 per image validation
- **Total for 200 users**: ~$20 (200 users × 10 photos = 2000 validations)

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Add database tables
- [ ] Create "Treasure Hunt" button in menu
- [ ] Build group assignment logic
- [ ] Create 20 XMTP groups
- [ ] Define 10 tasks

### Phase 2: Core Logic (Week 1)
- [ ] Implement image detection in groups
- [ ] Add XMTP remote attachment handling
- [ ] Build OpenAI Vision validation
- [ ] Add progress tracking

### Phase 3: Polish (Week 2)
- [ ] Add conditional Quick Actions per group
- [ ] Build leaderboard/completion notifications
- [ ] Add admin commands to reset/monitor
- [ ] Test with multiple users

### Phase 4: Testing (Week 2)
- [ ] Test with 5-10 people
- [ ] Tune validation prompts
- [ ] Fix edge cases
- [ ] Add rate limiting

## Risk Mitigation

### Challenge: Image validation accuracy
**Solution:** Start with simpler tasks (colors, signs), tune prompts, add manual override

### Challenge: Race conditions (multiple submissions)
**Solution:** Use PostgreSQL transactions, mark task as "submitted" during validation

### Challenge: Uneven group distribution
**Solution:** Assign to least-full group, cap at 10 users per group

### Challenge: Users join multiple groups
**Solution:** Check PostgreSQL before assignment, one group per user (enforced by PRIMARY KEY constraint)

## Success Metrics
- Number of groups participating
- Average completion time
- Photo submission rate
- Validation accuracy
- User engagement/feedback

## Open Questions for Team
1. Should there be a time limit per task?
2. What happens if a group gets stuck?
3. Should we allow hints/skips?
4. Prize for winning group?
5. Should leaderboard be public or private?

---

**Status**: Proposal stage  
**Owner**: [Your Name]  
**Timeline**: 2 weeks to MVP  
**Go/No-Go Decision Needed By**: [Date]

