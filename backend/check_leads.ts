
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
            ownerId: true,
        },
    });

    console.log('--- ALL LEADS ---');
    console.table(leads);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
