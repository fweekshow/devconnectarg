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

// PostgreSQL-only function
export const getRemindersByWalletAddress = storeModule.getRemindersByWalletAddress || (() => {
  throw new Error('getRemindersByWalletAddress only available with PostgreSQL');
});

export type { Reminder } from './store-sqlite.js';
