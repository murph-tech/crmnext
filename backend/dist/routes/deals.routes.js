"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Get all deals
router.get('/', async (req, res, next) => {
    try {
        const { stage, ownerId } = req.query;
        const deals = await index_1.prisma.deal.findMany({
            where: {
                ...(0, auth_middleware_1.getDealAccessFilter)(req.user),
                ...(ownerId && req.user?.role === 'ADMIN' ? { ownerId: ownerId } : {}),
                ...(stage && { stage: stage }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                contact: {
                    select: { id: true, firstName: true, lastName: true, company: true },
                },
                owner: {
                    select: { id: true, name: true, email: true },
                },
                salesTeam: {
                    select: { id: true, name: true, email: true, avatar: true },
                },
                _count: { select: { activities: true } },
            },
        });
        res.json(deals);
    }
    catch (error) {
        next(error);
    }
});
// Get deals by stage (for pipeline view)
router.get('/pipeline', async (req, res, next) => {
    try {
        const { search } = req.query;
        const stages = ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
        const pipeline = await Promise.all(stages.map(async (stage) => {
            const deals = await index_1.prisma.deal.findMany({
                where: {
                    ...(0, auth_middleware_1.getDealAccessFilter)(req.user),
                    stage: stage,
                    ...(search && {
                        OR: [
                            { title: { contains: search } },
                            { contact: { firstName: { contains: search } } },
                            { contact: { lastName: { contains: search } } },
                            { contact: { company: { contains: search } } },
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
                    salesTeam: {
                        select: { id: true, name: true, email: true, avatar: true },
                    },
                    activities: {
                        orderBy: { dueDate: 'asc' },
                        take: 10
                    },
                },
            });
            const totalValue = deals.reduce((sum, deal) => sum + Number(deal.value), 0);
            return {
                stage,
                deals,
                count: deals.length,
                totalValue,
            };
        }));
        res.json(pipeline);
    }
    catch (error) {
        next(error);
    }
});
// Get single deal
router.get('/:id', async (req, res, next) => {
    try {
        const deal = await index_1.prisma.deal.findUnique({
            where: {
                id: req.params.id,
            },
            include: {
                contact: true,
                owner: {
                    select: { id: true, name: true, email: true },
                },
                salesTeam: {
                    select: { id: true, name: true, email: true, avatar: true },
                },
                activities: {
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { name: true, email: true } } }
                },
                items: {
                    include: { product: true },
                },
            },
        });
        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        // Custom Access Check since findUnique can't easy mix with OR filter in top level same way findMany does? 
        // Actually it can if we used findFirst, but findUnique is better.
        // Let's manually check access to be safe and precise.
        const user = req.user;
        const isOwner = deal.ownerId === user?.id;
        const isSalesTeam = deal.salesTeam.some(m => m.id === user?.id);
        const isAdmin = user?.role === 'ADMIN';
        if (!isOwner && !isSalesTeam && !isAdmin) {
            return res.status(403).json({ error: 'Not authorized to view this deal' });
        }
        res.json(deal);
    }
    catch (error) {
        next(error);
    }
});
// Add item to deal
router.post('/:id/items', async (req, res, next) => {
    try {
        const { productId, quantity, price, discount } = req.body;
        const dealId = req.params.id;
        // Verify deal ownership
        const deal = await index_1.prisma.deal.findFirst({
            where: { id: dealId, ...(0, auth_middleware_1.getOwnerFilter)(req.user) },
        });
        if (!deal)
            return res.status(404).json({ error: 'Deal not found' });
        const item = await index_1.prisma.dealItem.create({
            data: {
                dealId: dealId,
                productId: productId,
                quantity: parseInt(quantity) || 1,
                price: parseFloat(price) || 0,
                discount: parseFloat(discount) || 0,
            },
            include: { product: true },
        });
        // Recalculate deal total value? (Optional: updating deal value based on items)
        // For now, let's keep it manual or separate logic, but typically CRM updates deal value.
        // Let's update deal value sum of items.
        const items = await index_1.prisma.dealItem.findMany({ where: { dealId: dealId } });
        const totalValue = items.reduce((sum, i) => sum + (i.price * i.quantity) - i.discount, 0);
        await index_1.prisma.deal.update({
            where: { id: dealId },
            data: { value: totalValue },
        });
        res.status(201).json(item);
    }
    catch (error) {
        next(error);
    }
});
// Remove item from deal
router.delete('/:id/items/:itemId', async (req, res, next) => {
    try {
        const dealId = req.params.id;
        const itemId = req.params.itemId;
        // Verify deal ownership
        const deal = await index_1.prisma.deal.findFirst({
            where: { id: dealId, ...(0, auth_middleware_1.getOwnerFilter)(req.user) },
        });
        if (!deal)
            return res.status(404).json({ error: 'Deal not found' });
        await index_1.prisma.dealItem.delete({
            where: { id: itemId },
        });
        // Recalculate deal value
        const items = await index_1.prisma.dealItem.findMany({ where: { dealId: dealId } });
        const totalValue = items.reduce((sum, i) => sum + (i.price * i.quantity) - i.discount, 0);
        await index_1.prisma.deal.update({
            where: { id: dealId },
            data: { value: totalValue },
        });
        res.json({ message: 'Item removed' });
    }
    catch (error) {
        next(error);
    }
});
// Create deal
router.post('/', async (req, res, next) => {
    try {
        const { title, value, currency, stage, probability, contactId, notes } = req.body;
        const deal = await index_1.prisma.deal.create({
            data: {
                title,
                value: parseFloat(value) || 0,
                currency: currency || 'THB',
                stage: stage || 'QUALIFIED',
                probability: probability || 20,
                notes,
                owner: { connect: { id: req.user.id } },
                ...(contactId && { contact: { connect: { id: contactId } } }),
            },
        });
        res.status(201).json(deal);
    }
    catch (error) {
        next(error);
    }
});
// Update deal
router.put('/:id', async (req, res, next) => {
    try {
        const dealId = req.params.id;
        // Check access first
        const existingDeal = await index_1.prisma.deal.findFirst({
            where: {
                id: dealId,
                ...(0, auth_middleware_1.getDealAccessFilter)(req.user),
            }
        });
        if (!existingDeal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        const { salesTeamIds, ...otherData } = req.body;
        // If updating salesTeam, verify USER is the Owner (Manager) or ADMIN
        // The requester MUST be the owner or admin to add others.
        if (salesTeamIds) {
            const isOwner = existingDeal.ownerId === req.user.id;
            const isAdmin = req.user.role === 'ADMIN';
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ error: 'Only the Manager (Owner) can manage the Sales Team' });
            }
        }
        const deal = await index_1.prisma.deal.update({
            where: { id: dealId },
            data: {
                ...otherData,
                ...(salesTeamIds && {
                    salesTeam: {
                        set: salesTeamIds.map((id) => ({ id })),
                    }
                })
            },
            include: {
                contact: true,
                owner: { select: { id: true, name: true, email: true } },
                salesTeam: { select: { id: true, name: true, email: true, avatar: true } }
            }
        });
        res.json(deal);
    }
    catch (error) {
        next(error);
    }
});
// Update deal stage (for drag-and-drop)
router.patch('/:id/stage', async (req, res, next) => {
    try {
        const { stage } = req.body;
        const deal = await index_1.prisma.deal.updateMany({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
            },
            data: {
                stage,
                ...(stage === 'CLOSED_WON' || stage === 'CLOSED_LOST'
                    ? { closedAt: new Date() }
                    : { closedAt: null }),
            },
        });
        if (deal.count === 0) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        res.json({ message: 'Stage updated successfully' });
    }
    catch (error) {
        next(error);
    }
});
// Delete deal
router.delete('/:id', async (req, res, next) => {
    try {
        const deal = await index_1.prisma.deal.findFirst({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
            },
        });
        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        await index_1.prisma.deal.delete({
            where: { id: deal.id },
        });
        res.json({ message: 'Deal deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
const sync_1 = require("csv-stringify/sync");
// ... existing code ...
// Export deals to CSV
router.get('/export/csv', async (req, res, next) => {
    try {
        const { stage, ownerId } = req.query;
        const deals = await index_1.prisma.deal.findMany({
            where: {
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
                ...(ownerId && req.user?.role === 'ADMIN' ? { ownerId: ownerId } : {}),
                ...(stage && { stage: stage }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                contact: {
                    select: { firstName: true, lastName: true, company: true, email: true, phone: true },
                },
                owner: {
                    select: { name: true, email: true },
                },
            },
        });
        const csvData = deals.map(deal => ({
            'Deal Name': deal.title,
            Value: deal.value,
            Currency: deal.currency,
            Stage: deal.stage,
            Probability: `${deal.probability}%`,
            'Contact Name': deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : '',
            Company: deal.contact?.company || '',
            'Contact Email': deal.contact?.email || '',
            'Contact Phone': deal.contact?.phone || '',
            Owner: deal.owner?.name || '',
            'Created At': new Date(deal.createdAt).toLocaleDateString(),
            Notes: deal.notes || '',
        }));
        const output = (0, sync_1.stringify)(csvData, {
            header: true,
            columns: [
                'Deal Name', 'Value', 'Currency', 'Stage', 'Probability',
                'Contact Name', 'Company', 'Contact Email', 'Contact Phone',
                'Owner', 'Created At', 'Notes'
            ]
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=deals-export.csv');
        res.send(output);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=deals.routes.js.map