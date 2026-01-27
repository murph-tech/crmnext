
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const contacts = await prisma.contact.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
            firstName: true,
            lastName: true,
            email: true,
            company: true,
            jobTitle: true,
            createdAt: true
        }
    });

    console.log('--- RECENT CONTACTS IN DB ---');
    contacts.forEach(c => {
        console.log(`Name: ${c.firstName} ${c.lastName}`);
        console.log(`Email: ${c.email}`);
        console.log(`Company: ${c.company || '(NULL)'}`);
        console.log(`Job: ${c.jobTitle || '(NULL)'}`);
        console.log('-----------------------------');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
