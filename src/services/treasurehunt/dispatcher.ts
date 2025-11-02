import type { Client } from "@xmtp/node-sdk";

import { TreasureHuntAdapter } from "@/adapters/index.js";
import { TREASURE_HUNT_GROUP_IDS } from "@/constants/index.js";

export class TreasureHuntDispatcher {
  private intervalId: NodeJS.Timeout | null = null;
  private client: Client<any> | null = null;
  private lastCheckedTaskId: number | null = null;
  private warningsSent = new Set<number>(); // Track which tasks we've sent warnings for

  start(client: Client<any>): void {
    this.client = client;
    // Check every minute for task transitions
    this.intervalId = setInterval(async () => {
      await this.checkForTaskTransitions();
    }, 60_000); // Check every 60 seconds
    
    console.log("🏴‍☠️ Treasure Hunt Dispatcher started - monitoring task transitions");
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.client = null;
    console.log("🏴‍☠️ Treasure Hunt Dispatcher stopped");
  }

  private async checkForTaskTransitions(): Promise<void> {
    if (!this.client) return;

    try {
      const now = new Date();
      
      // Get all tasks for today
      const allTasks = await TreasureHuntAdapter.getAllTasks();
      
      if (!allTasks || allTasks.length === 0) {
        return; // No tasks configured
      }

      // Sort tasks by start time
      const sortedTasks = [...allTasks].sort((a, b) => {
        const aStart = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bStart = b.startTime ? new Date(b.startTime).getTime() : 0;
        return aStart - bStart;
      });

      // Check for tasks where grace period just started (15 min before official start)
      const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes
      for (const task of sortedTasks) {
        const startTime = task.startTime ? new Date(task.startTime) : null;
        if (!startTime) continue;
        
        // Grace period starts 15 minutes before the official start time
        const graceStartTime = new Date(startTime.getTime() - GRACE_PERIOD_MS);
        const timeSinceGraceStart = now.getTime() - graceStartTime.getTime();
        
        // If grace period started within the last 60 seconds and we haven't sent notification yet
        if (timeSinceGraceStart >= 0 && timeSinceGraceStart < 60_000 && !this.warningsSent.has(task.id)) {
          console.log(`🎯 Task ${task.id} grace period started - sending "Starts Now" message`);
          await this.broadcastTaskStarting(task);
          this.warningsSent.add(task.id);
        }
      }

      // Find the next upcoming task
      const nextTask = sortedTasks.find(task => {
        const startTime = task.startTime ? new Date(task.startTime) : null;
        return startTime && now < startTime;
      });

      // Check if a task just ended (within the last minute)
      const justEndedTask = sortedTasks.find(task => {
        const endTime = task.endTime ? new Date(task.endTime) : null;
        if (!endTime) return false;
        
        const timeSinceEnd = now.getTime() - endTime.getTime();
        // If task ended within the last 60 seconds and we haven't announced it yet
        return timeSinceEnd >= 0 && timeSinceEnd < 60_000 && this.lastCheckedTaskId !== task.id;
      });

      if (justEndedTask) {
        console.log(`🏴‍☠️ Task ${justEndedTask.id} just ended - broadcasting to groups`);
        await this.broadcastTaskEnded(justEndedTask, nextTask);
        this.lastCheckedTaskId = justEndedTask.id;
      }
    } catch (error) {
      console.error("❌ Error checking treasure hunt task transitions:", error);
    }
  }

  private async broadcastTaskStarting(task: any): Promise<void> {
    if (!this.client) return;

    try {
      const message = `🎯 Next Treasure Hunt Starts Now!

Task ${task.id}: ${task.title}

${task.description}

💡 Hint: ${task.hint}

📸 Send your photo and tag @devconnectarg.base.eth to submit!

You have until ${new Date(task.endTime).toLocaleString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit',
  timeZone: 'America/Argentina/Buenos_Aires'
})} Argentina time. Good luck! 🏴‍☠️`;

      await this.broadcastToAllGroups(message);
      console.log(`🎯 Sent "Starts Now" message for task ${task.id}`);
    } catch (error) {
      console.error("❌ Error broadcasting task starting:", error);
    }
  }

  private async broadcastTaskEnded(
    endedTask: any,
    nextTask: any | undefined
  ): Promise<void> {
    if (!this.client) return;

    try {
      let message = `⏱️ Time's Up!\n\nTask ${endedTask.id}: ${endedTask.title} has ended!\n\n`;
      message += `🎁 You have a 15-minute grace period to submit if you were working on it.\n\n`;
      
      if (nextTask) {
        const nextStartTime = new Date(nextTask.startTime);
        const formattedTime = nextStartTime.toLocaleString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'America/Argentina/Buenos_Aires'
        });
        
        message += `📢 Keep an eye out for the next task!\n\n`;
        message += `Next Challenge: ${nextTask.title}\n`;
        message += `⏰ Starts at: ${formattedTime} Argentina time\n\n`;
        message += `We'll notify you here when it begins. Stay tuned! 🏴‍☠️`;
      } else {
        // No more tasks
        message += `🎉 That was the final challenge!\n\n`;
        message += `Thanks for participating in the Base Hunt! Check back for future treasure hunts. 🏴‍☠️`;
      }

      await this.broadcastToAllGroups(message);
      console.log(`📤 Sent task ended message for task ${endedTask.id}`);
    } catch (error) {
      console.error("❌ Error broadcasting task ended:", error);
    }
  }

  private async broadcastToAllGroups(message: string): Promise<void> {
    if (!this.client) return;

    try {
      // Broadcast to all treasure hunt groups
      await this.client.conversations.sync();
      const allConversations = await this.client.conversations.list();
      
      for (const groupId of TREASURE_HUNT_GROUP_IDS) {
        const group = allConversations.find(c => c.id === groupId);
        if (group) {
          await group.send(message);
          console.log(`📤 Broadcast to group ${groupId}`);
        }
      }
    } catch (error) {
      console.error("❌ Error broadcasting to groups:", error);
    }
  }
}

