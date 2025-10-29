import { BrodcastService } from "@/services/broadcast/index.js";
import { ActivityGroupsService } from "@/services/groups/groups-activity/index.js";
import { SidebarGroupsService } from "@/services/groups/groups-sidebar/index.js";
import { DynamicGroupsService } from "@/services/groups/groups-dynamic/index.js";
import { TreasureHuntService } from "@/services/treasurehunt/index.js";
import { UrgentMessageService } from "@/services/urgentmessage/index.js";

export type CallbackServices = BrodcastService | TreasureHuntService | ActivityGroupsService | SidebarGroupsService | UrgentMessageService | DynamicGroupsService;