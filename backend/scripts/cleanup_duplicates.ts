
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting cleanup of duplicate contacts...');

    // 1. Find all duplicate emails
    const duplicates = await prisma.$queryRaw<any[]>`
    SELECT email, COUNT(*) as count
    FROM contacts
    WHERE email IS NOT NULL
    GROUP BY email
    HAVING COUNT(*) > 1
  `;

    console.log(`Found ${duplicates.length} email addresses with duplicates.`);

    for (const dupe of duplicates) {
        const email = dupe.email;

        // Get all records for this email
        const records = await prisma.contact.findMany({
            where: { email: email },
            orderBy: { createdAt: 'desc' } // Newer first
        });

        console.log(`Processing duplicates for: ${email} (${records.length} found)`);

        // Keep the first one found (newest), or implement smarter logic like "keep the one with company"
        // Let's keep the one that has the most non-null fields

        const bestRecord = records.reduce((prev, current) => {
            const prevScore = (prev.company ? 1 : 0) + (prev.phone ? 1 : 0) + (prev.jobTitle ? 1 : 0);
            const currScore = (current.company ? 1 : 0) + (current.phone ? 1 : 0) + (current.jobTitle ? 1 : 0);
            return currScore > prevScore ? current : prev;
        });

        // Remove all others
        const idsToRemove = records.filter(r => r.id !== bestRecord.id).map(r => r.id);

        if (idsToRemove.length > 0) {
            await prisma.contact.deleteMany({
                where: { id: { in: idsToRemove } }
            });
            console.log(`   Deleted ${idsToRemove.length} duplicate(s), kept ID: ${bestRecord.id}`);
        }
    }

    console.log('✨ Cleanup complete!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
