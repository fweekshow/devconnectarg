import { fetchDevConnectInfo } from "./logistics.js";
import { 
  getFullSchedule,
  getSpeakerInfo
} from "./schedule.js";
import { showMenu, showHelp } from "./welcome.js";
import {
  fetchAllPendingReminders,
  cancelPendingReminder,
  cancelAllReminders,
  setReminder
} from "./reminder/reminder.js";
import { fetchCurrentDateTime } from "@/services/helpers/reminderHelper.js";
export const DEFAULT_TOOLS = [
  // Menu and help tools
  showMenu,
  showHelp,
  
  // Schedule tools  
  getFullSchedule,
  getSpeakerInfo,
  
  // Basecamp info
  fetchDevConnectInfo,
  
  // Reminder tools
  fetchCurrentDateTime,
  setReminder,
  fetchAllPendingReminders,
  cancelPendingReminder,
  cancelAllReminders,
];