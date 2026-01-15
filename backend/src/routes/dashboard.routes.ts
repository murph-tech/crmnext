import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest, getOwnerFilter, getUserFilter } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Get dashboard stats
router.get('/stats', async (req: AuthRequest, res, next) => {
    try {
        const ownerFilter = getOwnerFilter(req.user);

        // Get counts
        const [
            totalLeads,
            newLeadsThisMonth,
            totalContacts,
            totalDeals,
            activeDeals,
            closedWonDeals,
        ] = await Promise.all([
            prisma.lead.count({ where: ownerFilter }),
            prisma.lead.count({
                where: {
                    ...ownerFilter,
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
            prisma.contact.count({ where: ownerFilter }),
            prisma.deal.count({ where: ownerFilter }),
            prisma.deal.count({
                where: {
                    ...ownerFilter,
                    stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
                },
            }),
            prisma.deal.findMany({
                where: {
                    ...ownerFilter,
                    stage: 'CLOSED_WON',
                },
                select: { value: true },
            }),
        ]);

        // Calculate revenue
        const totalRevenue = closedWonDeals.reduce(
            (sum: number, deal: { value: any }) => sum + Number(deal.value),
            0
        );

        // Calculate conversion rate
        const convertedLeads = await prisma.lead.count({
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
    } catch (error) {
        next(error);
    }
});

// Get recent activity
router.get('/recent-activity', async (req: AuthRequest, res, next) => {
    try {
        const activities = await prisma.activity.findMany({
            where: getUserFilter(req.user),
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                lead: { select: { firstName: true, lastName: true } },
                contact: { select: { firstName: true, lastName: true, company: true } },
                deal: { select: { title: true, value: true } },
            },
        });

        res.json(activities);
    } catch (error) {
        next(error);
    }
});

// Get pipeline overview
router.get('/pipeline-overview', async (req: AuthRequest, res, next) => {
    try {
        const stages = ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'];

        const pipeline = await Promise.all(
            stages.map(async (stage) => {
                const deals = await prisma.deal.findMany({
                    where: {
                        ...getOwnerFilter(req.user),
                        stage: stage as any,
                    },
                    select: { value: true },
                });

                return {
                    stage,
                    count: deals.length,
                    value: deals.reduce((sum: number, d: { value: any }) => sum + Number(d.value), 0),
                };
            })
        );

        res.json(pipeline);
    } catch (error) {
        next(error);
    }
});

// Get reminders (tasks due soon)
router.get('/reminders', async (req: AuthRequest, res, next) => {
    try {
        const userFilter = getUserFilter(req.user);
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const reminders = await prisma.activity.findMany({
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
    } catch (error) {
        next(error);
    }
});

export default router;
