import { recentDates, syncEspnResults } from "@/lib/espn-sync";

// Scheduled Lambda (EventBridge Scheduler, see sst.config.ts). Checks the last 3 days of ESPN results
// and rescores brackets when a game result changes. Skips the database when ESPN has no completed games.
export async function handler() {
  const result = await syncEspnResults({ dates: recentDates(3), rescore: "ifChanged" });
  console.log("ESPN sync result:", JSON.stringify(result));
  return result;
}
