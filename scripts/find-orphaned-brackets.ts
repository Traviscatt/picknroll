import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Get all pools
  const pools = await prisma.pool.findMany({
    select: { id: true, name: true },
  });

  console.log(`\n=== Pools (${pools.length}) ===`);
  pools.forEach((p) => console.log(`  ${p.id} — ${p.name}`));

  const poolIds = pools.map((p) => p.id);

  // Find brackets with status SUBMITTED or PAID that have no poolId or a poolId not in any pool
  const orphaned = await prisma.bracket.findMany({
    where: {
      status: { in: ["SUBMITTED", "PAID"] },
      OR: [
        { poolId: null },
        ...(poolIds.length > 0 ? [{ poolId: { notIn: poolIds } }] : []),
      ],
    },
    include: {
      user: { select: { name: true, email: true } },
      familyMember: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`\n=== Orphaned Brackets (${orphaned.length}) ===`);
  if (orphaned.length === 0) {
    console.log("  None found! All submitted/paid brackets belong to a pool.");
  } else {
    orphaned.forEach((b) => {
      console.log(`\n  Bracket ID:    ${b.id}`);
      console.log(`  Name:          ${b.name}`);
      console.log(`  Entry Name:    ${b.entryName}`);
      console.log(`  Status:        ${b.status}`);
      console.log(`  Paid:          ${b.paid}`);
      console.log(`  Pool ID:       ${b.poolId ?? "NULL"}`);
      console.log(`  User:          ${b.user.name} (${b.user.email})`);
      if (b.familyMember) {
        console.log(`  Family Member: ${b.familyMember.name}`);
      }
      console.log(`  Created:       ${b.createdAt.toISOString()}`);
    });
  }

  // Also show the total counts for comparison
  const totalSubmittedPaid = await prisma.bracket.count({
    where: { status: { in: ["SUBMITTED", "PAID"] } },
  });

  const perPoolCounts = await Promise.all(
    pools.map(async (p) => {
      const count = await prisma.bracket.count({
        where: { poolId: p.id, status: { in: ["SUBMITTED", "PAID"] } },
      });
      const paidCount = await prisma.bracket.count({
        where: { poolId: p.id, status: { in: ["SUBMITTED", "PAID"] }, paid: true },
      });
      return { name: p.name, total: count, paid: paidCount };
    })
  );

  console.log(`\n=== Summary ===`);
  console.log(`  Global submitted/paid brackets: ${totalSubmittedPaid}`);
  perPoolCounts.forEach((pc) => {
    console.log(`  Pool "${pc.name}": ${pc.total} total, ${pc.paid} paid`);
  });
  console.log(`  Orphaned: ${orphaned.length}`);
  console.log();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
