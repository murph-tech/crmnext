import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest, getOwnerFilter } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Get all deals
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { stage } = req.query;

        const deals = await prisma.deal.findMany({
            where: {
                ...getOwnerFilter(req.user),
                ...(stage && { stage: stage as any }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                contact: {
                    select: { id: true, firstName: true, lastName: true, company: true },
                },
                owner: {
                    select: { id: true, name: true, email: true },
                },
                _count: { select: { activities: true } },
            },
        });

        res.json(deals);
    } catch (error) {
        next(error);
    }
});

// Get deals by stage (for pipeline view)
router.get('/pipeline', async (req: AuthRequest, res, next) => {
    try {
        const { search } = req.query;
        const stages = ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

        const pipeline = await Promise.all(
            stages.map(async (stage) => {
                const deals = await prisma.deal.findMany({
                    where: {
                        ...getOwnerFilter(req.user),
                        stage: stage as any,
                        ...(search && {
                            OR: [
                                { title: { contains: search as string } },
                                { contact: { firstName: { contains: search as string } } },
                                { contact: { lastName: { contains: search as string } } },
                                { contact: { company: { contains: search as string } } },
                            ],
                        }),
                    },
                    orderBy: { updatedAt: 'desc' },
                    include: {
                        contact: {
                            select: { id: true, firstName: true, lastName: true, company: true },
                        },
                        owner: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                });

                const totalValue = deals.reduce(
                    (sum: number, deal: { value: any }) => sum + Number(deal.value),
                    0
                );

                return {
                    stage,
                    deals,
                    count: deals.length,
                    totalValue,
                };
            })
        );

        res.json(pipeline);
    } catch (error) {
        next(error);
    }
});

// Get single deal
router.get('/:id', async (req: AuthRequest, res, next) => {
    try {
        const deal = await prisma.deal.findUnique({
            where: {
                id: req.params.id as string,
                ...getOwnerFilter(req.user),
            },
            include: {
                contact: true,
                owner: {
                    select: { id: true, name: true, email: true },
                },
                activities: {
                    orderBy: { createdAt: 'desc' },
                },
                items: {
                    include: { product: true },
                },
            },
        });

        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        res.json(deal);
    } catch (error) {
        next(error);
    }
});

// Add item to deal
router.post('/:id/items', async (req: AuthRequest, res, next) => {
    try {
        const { productId, quantity, price, discount } = req.body;
        const dealId = req.params.id as string;

        // Verify deal ownership
        const deal = await prisma.deal.findFirst({
            where: { id: dealId, ...getOwnerFilter(req.user) },
        });

        if (!deal) return res.status(404).json({ error: 'Deal not found' });

        const item = await prisma.dealItem.create({
            data: {
                dealId: dealId,
                productId: productId as string,
                quantity: parseInt(quantity) || 1,
                price: parseFloat(price) || 0,
                discount: parseFloat(discount) || 0,
            },
            include: { product: true },
        });

        // Recalculate deal total value? (Optional: updating deal value based on items)
        // For now, let's keep it manual or separate logic, but typically CRM updates deal value.
        // Let's update deal value sum of items.
        const items = await prisma.dealItem.findMany({ where: { dealId: dealId } });
        const totalValue = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity) - i.discount, 0);

        await prisma.deal.update({
            where: { id: dealId },
            data: { value: totalValue },
        });

        res.status(201).json(item);
    } catch (error) {
        next(error);
    }
});

// Remove item from deal
router.delete('/:id/items/:itemId', async (req: AuthRequest, res, next) => {
    try {
        const dealId = req.params.id as string;
        const itemId = req.params.itemId as string;

        // Verify deal ownership
        const deal = await prisma.deal.findFirst({
            where: { id: dealId, ...getOwnerFilter(req.user) },
        });

        if (!deal) return res.status(404).json({ error: 'Deal not found' });

        await prisma.dealItem.delete({
            where: { id: itemId },
        });

        // Recalculate deal value
        const items = await prisma.dealItem.findMany({ where: { dealId: dealId } });
        const totalValue = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity) - i.discount, 0);

        await prisma.deal.update({
            where: { id: dealId },
            data: { value: totalValue },
        });

        res.json({ message: 'Item removed' });
    } catch (error) {
        next(error);
    }
});

// Create deal
router.post('/', async (req: AuthRequest, res, next) => {
    try {
        const { title, value, currency, stage, probability, contactId, notes } = req.body;

        const deal = await prisma.deal.create({
            data: {
                title,
                value: parseFloat(value) || 0,
                currency: currency || 'THB',
                stage: stage || 'QUALIFIED',
                probability: probability || 20,
                notes,
                owner: { connect: { id: req.user!.id } },
                ...(contactId && { contact: { connect: { id: contactId } } }),
            },
        });

        res.status(201).json(deal);
    } catch (error) {
        next(error);
    }
});

// Update deal
router.put('/:id', async (req: AuthRequest, res, next) => {
    try {
        const updated = await prisma.deal.updateMany({
            where: {
                id: req.params.id as string,
                ...getOwnerFilter(req.user),
            },
            data: req.body,
        });

        if (updated.count === 0) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        const deal = await prisma.deal.findUnique({
            where: { id: req.params.id as string },
        });

        res.json(deal);
    } catch (error) {
        next(error);
    }
});

// Update deal stage (for drag-and-drop)
router.patch('/:id/stage', async (req: AuthRequest, res, next) => {
    try {
        const { stage } = req.body;

        const deal = await prisma.deal.updateMany({
            where: {
                id: req.params.id as string,
                ...getOwnerFilter(req.user),
            },
            data: {
                stage,
                ...(stage === 'CLOSED_WON' || stage === 'CLOSED_LOST'
                    ? { closedAt: new Date() }
                    : {}),
            },
        });

        if (deal.count === 0) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        res.json({ message: 'Stage updated successfully' });
    } catch (error) {
        next(error);
    }
});

// Delete deal
router.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        const deleted = await prisma.deal.deleteMany({
            where: {
                id: req.params.id as string,
                ...getOwnerFilter(req.user),
            },
        });

        if (deleted.count === 0) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        res.json({ message: 'Deal deleted successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
