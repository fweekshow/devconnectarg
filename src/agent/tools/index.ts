import { fetchDevConnectInfo } from "./logistics.js";
import {
  fetchAllPendingReminders,
  cancelPendingReminder,
  cancelAllReminders,
  setReminder,
  fetchCurrentDateTime,
} from "./reminder.js";
import { getFullSchedule, getSpeakerInfo } from "./schedule.js";
import { showMenu, showHelp } from "./welcome.js";

export const DEFAULT_TOOLS = [
  // Menu and help tools
  showMenu,
  showHelp,

  // Schedule tools
  getFullSchedule,
  getSpeakerInfo,

  // Devconnect info
  fetchDevConnectInfo,

  // Reminder tools
  fetchCurrentDateTime,
  setReminder,
  fetchAllPendingReminders,
  cancelPendingReminder,
  cancelAllReminders,
];
