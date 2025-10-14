import { fetchBasecampInfo } from "./logistics.js";
import { 
  getFullSchedule,
  getSpeakerInfo
} from "./schedule.js";
import { showMenu, showHelp } from "./welcome.js";
import {
  fetchCurrentDateTime,
  fetchAllPendingReminders,
  cancelPendingReminder,
  cancelAllReminders,
  setReminder
} from "./reminder.js";

export const DEFAULT_TOOLS = [
  // Menu and help tools
  showMenu,
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