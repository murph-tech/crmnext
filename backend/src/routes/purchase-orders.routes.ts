import { Router } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest, getOwnerFilter } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Get all POs
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { status, search } = req.query;

        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: {
                ...getOwnerFilter(req.user),
                ...(status && { status: status as any }),
                ...(search && {
                    OR: [
                        { poNumber: { contains: search as string, mode: 'insensitive' } },
                        { vendorName: { contains: search as string, mode: 'insensitive' } },
                        { title: { contains: search as string, mode: 'insensitive' } },
                    ]
                })
            },
            include: {
                contact: true, // Vendor contact info
                items: true,
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        res.json(purchaseOrders);
    } catch (error) {
        next(error);
    }
});

// Get single PO by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;

        const po = await prisma.purchaseOrder.findFirst({
            where: {
                id,
                ...getOwnerFilter(req.user),
            },
            include: {
                contact: true,
                items: true,
                owner: {
                    select: { name: true, email: true }
                }
            }
        });

        if (!po) {
            res.status(404).json({ error: 'Purchase Order not found' });
            return;
        }

        res.json(po);
    } catch (error) {
        next(error);
    }
});

// Helper: Generate PO Number (PO-YYYYMM-XXXX)
async function generatePONumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `PO-${year}${month}`;

    const lastPO = await prisma.purchaseOrder.findFirst({
        where: { poNumber: { startsWith: prefix } },
        orderBy: { poNumber: 'desc' }
    });

    let sequence = '0001';
    if (lastPO && lastPO.poNumber) {
        const lastSeq = parseInt(lastPO.poNumber.split('-')[2]);
        sequence = String(lastSeq + 1).padStart(4, '0');
    }

    return `${prefix}-${sequence}`;
}

// Create new PO
router.post('/', async (req: AuthRequest, res, next) => {
    try {
        const {
            title,
            contactId,
            items,
            expectedDate,
            date,
            vendorName,
            vendorAddress,
            vendorTaxId,
            vendorPhone,
            vendorEmail,
            notes,
            terms,
            subtotal,
            discount,
            vatRate,
            vatAmount,
            grandTotal,
        } = req.body;

        const poNumber = await generatePONumber();

        const po = await prisma.purchaseOrder.create({
            data: {
                poNumber,
                title: title || `Purchase Order ${poNumber}`,
                date: date ? new Date(date) : new Date(),
                expectedDate: expectedDate ? new Date(expectedDate) : null,

                // Vendor Data
                contactId,
                vendorName,
                vendorAddress,
                vendorTaxId,
                vendorPhone,
                vendorEmail,

                // Financials
                subtotal: parseFloat(subtotal || 0),
                discount: parseFloat(discount || 0),
                vatRate: parseFloat(vatRate || 7),
                vatAmount: parseFloat(vatAmount || 0),
                grandTotal: parseFloat(grandTotal || 0),

                notes,
                terms,
                ownerId: req.user!.id,
                status: 'DRAFT',

                // Items
                items: {
                    create: items?.map((item: any) => ({
                        description: item.description || item.name,
                        quantity: parseInt(item.quantity || 1),
                        unitPrice: parseFloat(item.unitPrice || item.price || 0),
                        discount: parseFloat(item.discount || 0),
                        totalPrice: (parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0)) - parseFloat(item.discount || 0),
                        productId: item.productId,
                    }))
                }
            },
            include: {
                items: true
            }
        });

        res.status(201).json(po);
    } catch (error) {
        next(error);
    }
});

// Update PO
router.put('/:id', async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;
        const { items, ...data } = req.body;

        // Check exists
        const existingPO = await prisma.purchaseOrder.findFirst({
            where: { id, ...getOwnerFilter(req.user) }
        });

        if (!existingPO) {
            res.status(404).json({ error: 'Purchase Order not found' });
            return;
        }

        // Transaction to update PO and replace items
        const updatedPO = await prisma.$transaction(async (tx) => {
            // Delete existing items if new items provided
            if (items) {
                await tx.purchaseOrderItem.deleteMany({
                    where: { purchaseOrderId: id }
                });
            }

            // Update PO header
            const po = await tx.purchaseOrder.update({
                where: { id },
                data: {
                    ...data,
                    // If items provided, create new ones
                    ...(items && {
                        items: {
                            create: items.map((item: any) => ({
                                description: item.description || item.name,
                                quantity: parseInt(item.quantity || 1),
                                unitPrice: parseFloat(item.unitPrice || item.price || 0),
                                discount: parseFloat(item.discount || 0),
                                totalPrice: (parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0)) - parseFloat(item.discount || 0),
                                productId: item.productId,
                            }))
                        }
                    })
                },
                include: { items: true }
            });
            return po;
        });

        res.json(updatedPO);
    } catch (error) {
        next(error);
    }
});

// Delete PO
router.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;

        await prisma.purchaseOrder.deleteMany({
            where: {
                id,
                ...getOwnerFilter(req.user)
            }
        });

        res.json({ message: 'Purchase Order deleted' });
    } catch (error) {
        next(error);
    }
});

export default router;
