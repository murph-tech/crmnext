import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Clean up database
    console.log('🧹 Cleaning up database...');
    await prisma.activity.deleteMany();
    await prisma.invoiceItem.deleteMany();
    await prisma.receipt.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.dealItem.deleteMany();
    await prisma.deal.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.product.deleteMany();
    // Don't delete users yet, we'll upsert admin

    // Create admin user
    const hashedPassword = await bcrypt.hash('crm@123', 12);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@crm.com' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@crm.com',
            password: hashedPassword,
            name: 'Administrator',
            role: 'ADMIN',
        },
    });

    console.log('✅ Created admin user:', admin.username);

    // Optional: Add some default products if you want users to have something to pick from, 
    // or just leave it completely empty. The user said "remove mockup data", implying specific business data.
    // I will leave products empty as well to be safe, or just add 1 placeholder?
    // User said "I will test by entering data myself". So let's leave it clean.

    console.log('');
    console.log('🎉 Database cleaned and seeded with Admin only!');
    console.log('');
    console.log('📧 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: crm@123');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
