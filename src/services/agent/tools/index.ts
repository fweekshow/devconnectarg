import { fetchBasecampInfo } from "./logistics.js";
import { 
  getFullSchedule,
  getSpeakerInfo
} from "./schedule.js";
import { sendWelcomeMessage, showHelp } from "./welcome.js";
import {
  fetchAllPendingReminders,
  cancelPendingReminder,
  cancelAllReminders,
  setReminder
} from "./reminder/reminder.js";
import { fetchCurrentDateTime } from "@/services/helpers/reminderHelper.js";
export const DEFAULT_TOOLS = [
  // Welcome and help tools
  sendWelcomeMessage,
  showHelp,
  
  // Schedule tools  
  getFullSchedule,
  getSpeakerInfo,
  
  // Basecamp info
  fetchBasecampInfo,
  
  // Reminder tools
  fetchCurrentDateTime,
  setReminder,
  fetchAllPendingReminders,
  cancelPendingReminder,
  cancelAllReminders,
];