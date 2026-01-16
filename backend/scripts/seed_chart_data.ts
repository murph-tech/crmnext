
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedChartData() {
    try {
        const users = await prisma.user.findMany();
        console.log(`Seeding data for ${users.length} users...`);

        const statuses = ['CLOSED_WON', 'CLOSED_LOST'];
        const values = [50000, 100000, 250000, 75000, 120000, 500000];

        for (const user of users) {
            console.log(`Creating deals for ${user.name} (${user.id})...`);

            // Create 10 deals spread over the last 10 days
            for (let i = 0; i < 10; i++) {
                const isWon = Math.random() > 0.4; // 60% win rate
                const stage = isWon ? 'CLOSED_WON' : 'CLOSED_LOST';
                const value = values[Math.floor(Math.random() * values.length)];

                // Random date within last 14 days
                const daysAgo = Math.floor(Math.random() * 14);
                const date = new Date();
                date.setDate(date.getDate() - daysAgo);
                date.setHours(Math.floor(Math.random() * 24), 0, 0, 0);

                await prisma.deal.create({
                    data: {
                        title: `${isWon ? 'Won' : 'Lost'} Deal - ${date.toLocaleDateString()}`,
                        value: value,
                        stage: stage,
                        ownerId: user.id,
                        createdAt: date,
                        updatedAt: date, // Important for chart which uses updatedAt
                        // Also create a contact/lead if needed, but for chart deal is enough?
                        // Schema requires contacts or leads? Check schema.
                        // Actually deal can be standalone or linked. Let's link to first contact if exists, or create one.
                    }
                });
            }
        }
        console.log('Seeding complete!');
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedChartData();
