import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

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

    // Create sample leads
    const leads = await Promise.all([
        prisma.lead.create({
            data: {
                firstName: 'Sarah',
                lastName: 'Johnson',
                email: 'sarah@techstart.com',
                phone: '+66 81 234 5678',
                company: 'TechStart Inc.',
                jobTitle: 'CEO',
                source: 'LINKEDIN',
                status: 'QUALIFIED',
                ownerId: admin.id,
            },
        }),
        prisma.lead.create({
            data: {
                firstName: 'Michael',
                lastName: 'Chen',
                email: 'michael@globaltech.com',
                phone: '+66 89 876 5432',
                company: 'GlobalTech',
                jobTitle: 'CTO',
                source: 'REFERRAL',
                status: 'NEW',
                ownerId: admin.id,
            },
        }),
        prisma.lead.create({
            data: {
                firstName: 'Emma',
                lastName: 'Williams',
                email: 'emma@innovate.io',
                phone: '+66 92 345 6789',
                company: 'Innovate.io',
                jobTitle: 'Product Manager',
                source: 'WEBSITE',
                status: 'CONTACTED',
                ownerId: admin.id,
            },
        }),
    ]);

    console.log(`✅ Created ${leads.length} sample leads`);

    // Create sample contacts
    const contacts = await Promise.all([
        prisma.contact.create({
            data: {
                firstName: 'David',
                lastName: 'Miller',
                email: 'david@acmecorp.com',
                phone: '+66 81 111 2222',
                company: 'Acme Corp',
                jobTitle: 'Director of Operations',
                city: 'Bangkok',
                country: 'Thailand',
                ownerId: admin.id,
            },
        }),
        prisma.contact.create({
            data: {
                firstName: 'Lisa',
                lastName: 'Anderson',
                email: 'lisa@dataflow.com',
                phone: '+66 82 333 4444',
                company: 'DataFlow Systems',
                jobTitle: 'VP of Sales',
                city: 'Chiang Mai',
                country: 'Thailand',
                ownerId: admin.id,
            },
        }),
    ]);

    console.log(`✅ Created ${contacts.length} sample contacts`);

    // Create sample deals
    const deals = await Promise.all([
        prisma.deal.create({
            data: {
                title: 'Enterprise Software License',
                value: 450000,
                currency: 'THB',
                stage: 'PROPOSAL',
                probability: 60,
                contactId: contacts[0].id,
                ownerId: admin.id,
            },
        }),
        prisma.deal.create({
            data: {
                title: 'Annual Support Contract',
                value: 180000,
                currency: 'THB',
                stage: 'NEGOTIATION',
                probability: 75,
                contactId: contacts[1].id,
                ownerId: admin.id,
            },
        }),
        prisma.deal.create({
            data: {
                title: 'Cloud Migration Project',
                value: 850000,
                currency: 'THB',
                stage: 'QUALIFIED',
                probability: 40,
                ownerId: admin.id,
            },
        }),
        prisma.deal.create({
            data: {
                title: 'Consulting Services',
                value: 120000,
                currency: 'THB',
                stage: 'CLOSED_WON',
                probability: 100,
                closedAt: new Date(),
                ownerId: admin.id,
            },
        }),
    ]);

    console.log(`✅ Created ${deals.length} sample deals`);

    // Create sample activities
    const activities = await Promise.all([
        prisma.activity.create({
            data: {
                type: 'CALL',
                title: 'Follow-up call with Acme Corp',
                description: 'Discuss proposal details',
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                userId: admin.id,
                dealId: deals[0].id,
            },
        }),
        prisma.activity.create({
            data: {
                type: 'MEETING',
                title: 'Product demo with DataFlow',
                description: 'Present new features',
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                userId: admin.id,
                contactId: contacts[1].id,
            },
        }),
        prisma.activity.create({
            data: {
                type: 'EMAIL',
                title: 'Send contract to TechStart',
                completed: true,
                completedAt: new Date(),
                userId: admin.id,
                leadId: leads[0].id,
            },
        }),
    ]);

    console.log(`✅ Created ${activities.length} sample activities`);

    console.log('');
    console.log('🎉 Database seeded successfully!');
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
