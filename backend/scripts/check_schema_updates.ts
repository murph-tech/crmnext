
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchema() {
    try {
        console.log('Checking schema for confirmedAt...');

        // 1. Create dummy invoice to test fields
        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber: `IV-TEST-${Date.now()}`,
                dueDate: new Date(),
                subtotal: 0, vatAmount: 0, grandTotal: 0, netTotal: 0,
                companyName: 'Test', companyAddress: 'Test', companyTaxId: 'Test',
                customerName: 'Test', customerAddress: 'Test',
                deal: {
                    create: {
                        title: 'Test', value: 0, ownerId: (await prisma.user.findFirst())!.id
                    }
                },
                confirmedAt: new Date() // This checks if the column exists
            }
        });
        console.log('Invoice has confirmedAt:', !!invoice.confirmedAt);

        // 2. Create dummy receipt
        const receipt = await prisma.receipt.create({
            data: {
                receiptNumber: `RE-TEST-${Date.now()}`,
                companyName: 'Test', companyAddress: 'Test', companyTaxId: 'Test',
                customerName: 'Test', customerAddress: 'Test',
                grandTotal: 0, netTotal: 0,
                invoiceId: invoice.id,
                confirmedAt: new Date() // This checks if the column exists
            }
        });
        console.log('Receipt has confirmedAt:', !!receipt.confirmedAt);

        // Cleanup
        await prisma.receipt.delete({ where: { id: receipt.id } });
        await prisma.invoice.delete({ where: { id: invoice.id } });
        await prisma.deal.delete({ where: { id: invoice.dealId } });

        console.log('Schema check passed!');
    } catch (e) {
        console.error('Schema check failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
