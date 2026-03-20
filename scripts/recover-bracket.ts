import { PrismaClient } from "@prisma/client";

const RECOVERY_URL = "postgresql://neondb_owner:npg_Nnz7MT0IlmDB@ep-wandering-dust-ai8jfr9i-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const recoveryDb = new PrismaClient({
  datasources: { db: { url: RECOVERY_URL } },
});

const mainDb = new PrismaClient();

async function main() {
  // Find Kristi's own bracket (not Hudson's) in the recovery branch
  const brackets = await recoveryDb.bracket.findMany({
    where: {
      user: { email: "kristilynn.catt@gmail.com" },
      familyMemberId: null,
    },
  });

  console.log(`Found ${brackets.length} bracket(s) for Kristi in recovery branch:\n`);
  
  for (const b of brackets) {
    console.log("--- Bracket ---");
    console.log("ID:", b.id);
    console.log("Name:", b.name);
    console.log("Entry Name:", b.entryName);
    console.log("Status:", b.status);
    console.log("Paid:", b.paid);
    console.log("Pool ID:", b.poolId);
    console.log("Total Score:", b.totalScore);
    console.log("Bonus Score:", b.bonusScore);
    console.log("Tiebreaker:", b.tiebreaker);
    console.log("Picks Data length:", b.picksData?.length ?? 0);
    console.log("Created:", b.createdAt);
    console.log("Submitted:", b.submittedAt);
    console.log();
  }

  // Check if this bracket exists in main DB
  if (brackets.length > 0) {
    const bracketToRestore = brackets[0];
    const existsInMain = await mainDb.bracket.findUnique({
      where: { id: bracketToRestore.id },
    });

    if (existsInMain) {
      console.log("⚠️  Bracket already exists in main database. No action needed.");
    } else {
      console.log("✅ Bracket NOT found in main DB. Ready to restore.");
      console.log("\nRun with --restore flag to actually restore it.");
    }
  }

  // If --restore flag is passed, actually restore
  if (process.argv.includes("--restore") && brackets.length > 0) {
    const b = brackets[0];
    
    // Get the correct pool ID from main DB
    const pool = await mainDb.pool.findFirst();
    
    console.log("\n🔄 Restoring bracket...");
    
    const restored = await mainDb.bracket.create({
      data: {
        id: b.id,
        name: b.name,
        entryName: b.entryName,
        status: b.status,
        totalScore: b.totalScore,
        bonusScore: b.bonusScore,
        tiebreaker: b.tiebreaker,
        paid: b.paid,
        picksData: b.picksData,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        submittedAt: b.submittedAt,
        userId: b.userId,
        poolId: pool?.id ?? b.poolId,
        familyMemberId: null,
      },
    });

    console.log("✅ Bracket restored successfully!");
    console.log("   ID:", restored.id);
    console.log("   Entry Name:", restored.entryName);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await recoveryDb.$disconnect();
    await mainDb.$disconnect();
  });
