import { runReminders } from "@/lib/reminders";

// Scheduled Lambda (see sst.config.ts): sends the reminders an admin turned on (Admin → Reminders)
export async function handler() {
  const summary = await runReminders();
  console.log("Reminders:", JSON.stringify(summary));
  return summary;
}
