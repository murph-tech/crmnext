import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // First check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email: 'admin@crm.com' }
    });

    console.log('Existing user:', existingUser);

    if (!existingUser) {
        // Create the user
        const user = await prisma.user.create({
            data: {
                email: 'admin@crm.com',
                password: hashedPassword,
                name: 'Admin User',
                role: 'ADMIN',
            }
        });
        console.log('✅ Created new admin user:', user.email);
    } else {
        // Update password
        const user = await prisma.user.update({
            where: { email: 'admin@crm.com' },
            data: { password: hashedPassword }
        });
        console.log('✅ Password updated for:', user.email);
    }

    console.log('\n📧 Login credentials:');
    console.log('   Email: admin@crm.com');
    console.log('   Password: admin123');

    await prisma.$disconnect();
}

resetPassword().catch(console.error);
