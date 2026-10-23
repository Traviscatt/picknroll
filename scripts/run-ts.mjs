// Runs a TypeScript script with the app's "@/..." import alias: node scripts/run-ts.mjs <file.ts> [args]
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const [, , file] = process.argv;
if (!file) {
  console.error("Usage: node scripts/run-ts.mjs <file.ts> [args]");
  process.exit(1);
}

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
await jiti.import(resolve(file));
