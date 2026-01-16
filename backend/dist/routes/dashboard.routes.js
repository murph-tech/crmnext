"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Get dashboard stats
router.get('/stats', async (req, res, next) => {
    try {
        const ownerFilter = (0, auth_middleware_1.getOwnerFilter)(req.user);
        // Get counts
        const [totalLeads, newLeadsThisMonth, totalContacts, totalDeals, activeDeals, closedWonDeals,] = await Promise.all([
            index_1.prisma.lead.count({ where: ownerFilter }),
            index_1.prisma.lead.count({
                where: {
                    ...ownerFilter,
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
            index_1.prisma.contact.count({ where: ownerFilter }),
            index_1.prisma.deal.count({ where: ownerFilter }),
            index_1.prisma.deal.count({
                where: {
                    ...ownerFilter,
                    stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
                },
            }),
            index_1.prisma.deal.findMany({
                where: {
                    ...ownerFilter,
                    stage: 'CLOSED_WON',
                },
                select: { value: true },
            }),
        ]);
        // Calculate revenue
        const totalRevenue = closedWonDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
        // Calculate conversion rate
        const convertedLeads = await index_1.prisma.lead.count({
            where: { ...ownerFilter, status: 'CONVERTED' },
        });
        const conversionRate = totalLeads > 0
            ? Math.round((convertedLeads / totalLeads) * 100 * 10) / 10
            : 0;
        res.json({
            totalRevenue,
            newLeads: newLeadsThisMonth,
            activeDeals,
            conversionRate,
            totalLeads,
            totalContacts,
            totalDeals,
            closedWonCount: closedWonDeals.length,
        });
    }
    catch (error) {
        next(error);
    }
});
// Get recent activity
router.get('/recent-activity', async (req, res, next) => {
    try {
        const activities = await index_1.prisma.activity.findMany({
            where: (0, auth_middleware_1.getUserFilter)(req.user),
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                lead: { select: { firstName: true, lastName: true } },
                contact: { select: { firstName: true, lastName: true, company: true } },
                deal: { select: { title: true, value: true } },
            },
        });
        res.json(activities);
    }
    catch (error) {
        next(error);
    }
});
// Get pipeline overview
router.get('/pipeline-overview', async (req, res, next) => {
    try {
        const stages = ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'];
        const pipeline = await Promise.all(stages.map(async (stage) => {
            const deals = await index_1.prisma.deal.findMany({
                where: {
                    ...(0, auth_middleware_1.getOwnerFilter)(req.user),
                    stage: stage,
                },
                select: { value: true },
            });
            return {
                stage,
                count: deals.length,
                value: deals.reduce((sum, d) => sum + Number(d.value), 0),
            };
        }));
        res.json(pipeline);
    }
    catch (error) {
        next(error);
    }
});
// Get reminders (tasks due soon)
router.get('/reminders', async (req, res, next) => {
    try {
        const userFilter = (0, auth_middleware_1.getUserFilter)(req.user);
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const reminders = await index_1.prisma.activity.findMany({
            where: {
                ...userFilter,
                completed: false,
                OR: [
                    {
                        dueDate: {
                            lte: tomorrow, // Due by tomorrow (covers overdue)
                        },
                    },
                    {
                        reminderAt: {
                            lte: now, // Reminder time reached
                        },
                    },
                ],
            },
            orderBy: { dueDate: 'asc' },
            include: {
                lead: { select: { id: true, firstName: true, lastName: true } },
                deal: { select: { id: true, title: true } },
            },
        });
        res.json(reminders);
    }
    catch (error) {
        next(error);
    }
});
// Get sales performance (Admin only)
router.get('/sales-performance', (0, auth_middleware_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const users = await index_1.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
            },
        });
        const performance = await Promise.all(users.map(async (user) => {
            const [deals, contacts, leads] = await Promise.all([
                index_1.prisma.deal.count({ where: { ownerId: user.id } }),
                index_1.prisma.contact.count({ where: { ownerId: user.id } }),
                index_1.prisma.lead.count({ where: { ownerId: user.id } }),
            ]);
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                deals,
                contacts,
                leads,
            };
        }));
        // Sort by most deals
        performance.sort((a, b) => b.deals - a.deals);
        res.json(performance);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map