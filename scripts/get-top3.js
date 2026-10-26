const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getTop3() {
  try {
    const brackets = await prisma.bracket.findMany({
      where: { status: { in: ['SUBMITTED', 'PAID'] } },
      include: {
        user: { select: { name: true } }
      },
      orderBy: [
        { totalScore: 'desc' },
        { bonusScore: 'desc' }
      ]
    });

    // Sort by combined score
    brackets.sort((a, b) => (b.totalScore + b.bonusScore) - (a.totalScore + a.bonusScore));
    
    const top3 = brackets.slice(0, 3).map((b, i) => ({
      rank: i + 1,
      entryName: b.entryName,
      userName: b.user?.name || 'Unknown',
      totalScore: b.totalScore,
      bonusScore: b.bonusScore,
      combined: b.totalScore + b.bonusScore
    }));

    console.log('Top 3 Winners:');
    console.table(top3);
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getTop3();
