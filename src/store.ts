// Smart database wrapper - uses PostgreSQL on Railway, SQLite locally
// Check if we should use PostgreSQL (Railway) or SQLite (local)
const usePostgres = !!process.env.DATABASE_URL;

console.log(`📋 Database mode: ${usePostgres ? 'PostgreSQL (Railway)' : 'SQLite (Local)'}`);

let storeModule: any;

if (usePostgres) {
  // Use PostgreSQL on Railway
  storeModule = await import('./store-pg.js');
  console.log('✅ Using PostgreSQL store');
} else {
  // Use SQLite locally
  storeModule = await import('./store-sqlite.js');
  console.log('✅ Using SQLite store');
}

// Re-export all functions
export const {
  openRemindersDb,
  insertReminder,
  listPendingReminders,
  listAllPendingForInbox,
  markReminderSent,
  cancelReminder,
  cancelAllRemindersForInbox,
  getDueReminders,
  initDb,
  isUserVerified,
  verifyUser,
  updateUserActivity,
  getVerifiedUsersCount,
  closeDb,
} = storeModule;

// PostgreSQL-only functions (miniapp & analytics)
export const getRemindersByWalletAddress = storeModule.getRemindersByWalletAddress || (() => {
  throw new Error('getRemindersByWalletAddress only available with PostgreSQL');
});

export const trackMessage = storeModule.trackMessage || (async () => {
  // No-op for SQLite
});

export const trackFeatureUsage = storeModule.trackFeatureUsage || (async () => {
  // No-op for SQLite
});

export const setUserPreference = storeModule.setUserPreference || (async () => {
  // No-op for SQLite
});

export const getUserAnalytics = storeModule.getUserAnalytics || (async () => {
  throw new Error('getUserAnalytics only available with PostgreSQL');
});

export const getAnalyticsSummary = storeModule.getAnalyticsSummary || (async () => {
  throw new Error('getAnalyticsSummary only available with PostgreSQL');
});

// Group management functions (PostgreSQL only)
export const registerGroup = storeModule.registerGroup || (async () => {
  // No-op for SQLite
});

export const trackGroupMemberJoin = storeModule.trackGroupMemberJoin || (async () => {
  // No-op for SQLite
});

export const trackGroupMemberLeave = storeModule.trackGroupMemberLeave || (async () => {
  // No-op for SQLite
});

export const trackGroupMessage = storeModule.trackGroupMessage || (async () => {
  // No-op for SQLite
});

export const setGroupActive = storeModule.setGroupActive || (async () => {
  // No-op for SQLite
});

export const getGroupStats = storeModule.getGroupStats || (async () => {
  throw new Error('getGroupStats only available with PostgreSQL');
});

export const getAllGroups = storeModule.getAllGroups || (async () => {
  throw new Error('getAllGroups only available with PostgreSQL');
});

export const getGroupAnalytics = storeModule.getGroupAnalytics || (async () => {
  throw new Error('getGroupAnalytics only available with PostgreSQL');
});

export const trackSpecificAction = storeModule.trackSpecificAction || (async () => {
  // No-op for SQLite
});

export const getUserActionBreakdown = storeModule.getUserActionBreakdown || (async () => {
  throw new Error('getUserActionBreakdown only available with PostgreSQL');
});

export const getPopularActions = storeModule.getPopularActions || (async () => {
  throw new Error('getPopularActions only available with PostgreSQL');
});

export type { Reminder } from './store-sqlite.js';
