import { BrodcastService } from "@/services/broadcast";
import { ActivityGroupsService } from "@/services/groups/groups-activity";
import { SidebarGroupsService } from "@/services/groups/groups-sidebar";
import { TreasureHuntService } from "@/services/treasurehunt";
import { UrgentMessageService } from "@/services/urgentmessage";

export type CallbackServices = BrodcastService | TreasureHuntService | ActivityGroupsService | SidebarGroupsService | UrgentMessageService;