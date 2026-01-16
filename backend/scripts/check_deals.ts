
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
    try {
        const users = await prisma.user.findMany();
        console.log(`Found ${users.length} users:`);
        users.forEach(u => console.log(`- ${u.id} (${u.name}, ${u.role})`));

        const deals = await prisma.deal.findMany({
            where: {
                stage: { in: ['CLOSED_WON', 'CLOSED_LOST'] }
            },
            orderBy: { updatedAt: 'desc' },
            take: 10
        });

        console.log(`\nFound ${deals.length} recent closed deals:`);
        deals.forEach(d => {
            console.log(`[${d.stage}] ${d.title} (${d.value}) - Updated: ${d.updatedAt.toISOString()} - Owner: ${d.ownerId}`);
        });

    } catch (error) {
        console.error('Error checking data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
