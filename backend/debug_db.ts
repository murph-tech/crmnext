
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to DB...');
        const users = await prisma.user.count();
        console.log('User count:', users);

        console.log('Creating user...');
        const user = await prisma.user.create({
            data: {
                email: `debug_${Date.now()}@example.com`,
                password: 'password',
                name: 'Debug User'
            }
        });
        console.log('User created:', user.id);
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
