import { fetchDevConnectInfo } from "./logistics";
import {
  fetchAllPendingReminders,
  cancelPendingReminder,
  cancelAllReminders,
  setReminder,
  fetchCurrentDateTime,
} from "./reminder";
import { getFullSchedule, getSpeakerInfo } from "./schedule";
import { showMenu, showHelp } from "./welcome";

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
