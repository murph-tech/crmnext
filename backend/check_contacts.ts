
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const contacts = await prisma.contact.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
            ownerId: true,
        },
    });

    console.log('--- ALL CONTACTS ---');
    console.table(contacts);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
