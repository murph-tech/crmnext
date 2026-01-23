import { Router } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest, getOwnerFilter, getUserFilter, authorize, getDealAccessFilter } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Helper to get start date based on timeframe
const getStartDate = (timeframe: string = 'week'): Date => {
    const now = new Date();
    const startDate = new Date();

    if (timeframe === 'month') {
        return new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeframe === 'year') {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - 1);
        d.setHours(0, 0, 0, 0);
        return d;
    } else {
        // Default to week: Last 7 days
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        return startDate;
    }
};

const parseDate = (value?: string): Date | undefined => {
    if (!value) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return d;
};

const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
};

const getRangeFromQuery = (reqQuery: any): { start: Date; end: Date; timeframe?: string } | { error: string } => {
    const { timeframe = 'week', startDate, endDate } = reqQuery as { timeframe?: string; startDate?: string; endDate?: string };

    const hasStart = !!startDate;
    const hasEnd = !!endDate;
    if (hasStart !== hasEnd) {
        return { error: 'startDate and endDate must be provided together' };
    }

    if (hasStart && hasEnd) {
        const s = parseDate(startDate);
        const e = parseDate(endDate);
        if (!s || !e) return { error: 'Invalid startDate or endDate' };
        const start = new Date(s);
        start.setHours(0, 0, 0, 0);
        const end = endOfDay(e);
        return { start, end };
    }

    const start = getStartDate(timeframe);
    const end = new Date();
    return { start, end, timeframe };
};

const getGranularity = (start: Date, end: Date, fallbackTimeframe?: string): 'day' | 'month' => {
    if (fallbackTimeframe === 'year') return 'month';
    const ms = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    // If range is big, group by month; otherwise group by day
    return days > 62 ? 'month' : 'day';
};

const formatKey = (d: Date, granularity: 'day' | 'month') => {
    if (granularity === 'month') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const initBuckets = (start: Date, end: Date, granularity: 'day' | 'month') => {
    const keys: string[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= end) {
        keys.push(formatKey(cursor, granularity));
        if (granularity === 'month') {
            cursor.setMonth(cursor.getMonth() + 1, 1);
        } else {
            cursor.setDate(cursor.getDate() + 1);
        }
    }
    return keys;
};

// Get dashboard stats
router.get('/stats', async (req: AuthRequest, res, next) => {
    try {
        const range = getRangeFromQuery(req.query);
        if ('error' in range) return res.status(400).json({ error: range.error });
        const { start: startDate, end: endDate } = range;
        const ownerFilter = getOwnerFilter(req.user);
        const dealAccessFilter = getDealAccessFilter(req.user);

        // Get counts
        const [
            totalLeads,
            newLeadsCount,
            totalContacts,
            totalDeals,
            activeDeals,
            closedWonDealsInPeriod,
        ] = await Promise.all([
            prisma.lead.count({ where: ownerFilter }),
            prisma.lead.count({
                where: {
                    ...ownerFilter,
                    createdAt: { gte: startDate, lte: endDate },
                },
            }),
            prisma.contact.count({ where: ownerFilter }),
            prisma.deal.count({ where: dealAccessFilter }),
            prisma.deal.count({
                where: {
                    ...dealAccessFilter,
                    stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
                },
            }),
            prisma.deal.findMany({
                where: {
                    ...dealAccessFilter,
                    stage: 'CLOSED_WON',
                    updatedAt: { gte: startDate, lte: endDate },
                },
                select: { value: true },
            }),
        ]);

        // Calculate revenue for the period
        const totalRevenue = closedWonDealsInPeriod.reduce(
            (sum: number, deal: { value: any }) => sum + Number(deal.value),
            0
        );

        // Calculate conversion rate (Lifetime or Period? Keeping lifetime for global context, or period?)
        // Let's keep conversion rate as global "Health" metric for now, or it fluctuates too wildly on short periods.
        // Actually, let's keep it global as per previous code structure but fix the variable names.
        const convertedLeads = await prisma.lead.count({
            where: { ...ownerFilter, status: 'CONVERTED' },
        });
        const conversionRate = totalLeads > 0
            ? Math.round((convertedLeads / totalLeads) * 100 * 10) / 10
            : 0;

        // Deals progress: Won In Period vs (Active + Won In Period)
        const dealsWonInPeriod = closedWonDealsInPeriod.length;

        const dealsProgress = (activeDeals + dealsWonInPeriod) > 0
            ? Math.round((dealsWonInPeriod / (activeDeals + dealsWonInPeriod)) * 100)
            : 0;

        // Calculate task completion (Completed in Period vs Due in Period)
        const userFilter = getUserFilter(req.user);
        const tasksCompletedInPeriod = await prisma.activity.count({
            where: {
                ...userFilter,
                completed: true,
                completedAt: { gte: startDate, lte: endDate },
            },
        });

        // For "Due in period", if period is 'year', it's huge. 
        // But for "Efficiency" in that period, it makes sense.
        const tasksDueInPeriod = await prisma.activity.count({
            where: {
                ...userFilter,
                completed: false,
                dueDate: { gte: startDate, lte: endDate },
            },
        });

        const totalTasksInPeriod = tasksCompletedInPeriod + tasksDueInPeriod;
        const taskCompletionRate = totalTasksInPeriod > 0
            ? Math.round((tasksCompletedInPeriod / totalTasksInPeriod) * 100)
            : 0;

        res.json({
            totalRevenue,
            newLeads: newLeadsCount,
            activeDeals,
            conversionRate,
            totalLeads,
            totalContacts,
            totalDeals,
            closedWonCount: dealsWonInPeriod,
            dealsProgress,
            taskCompletionRate
        });
    } catch (error) {
        next(error);
    }
});

// Get recent activity
router.get('/recent-activity', async (req: AuthRequest, res, next) => {
    try {
        const range = getRangeFromQuery(req.query);
        if ('error' in range) return res.status(400).json({ error: range.error });
        const { start: startDate, end: endDate } = range;

        const activities = await prisma.activity.findMany({
            where: {
                ...getUserFilter(req.user),
                createdAt: { gte: startDate, lte: endDate },
            },
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
                        ...getDealAccessFilter(req.user),
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
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 Days ahead

        const reminders = await prisma.activity.findMany({
            where: {
                ...userFilter,
                completed: false,
                OR: [
                    {
                        dueDate: {
                            lte: nextWeek, // Due within next 7 days
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
            take: 20, // Limit
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

// Get sales performance (Admin & Manager)
router.get('/sales-performance', authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res, next) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
            },
        });

        const performance = await Promise.all(
            users.map(async (user) => {
                const [deals, contacts, leads] = await Promise.all([
                    prisma.deal.count({ where: { ownerId: user.id, stage: 'CLOSED_WON' } }),
                    prisma.contact.count({ where: { ownerId: user.id } }),
                    prisma.lead.count({ where: { ownerId: user.id } }),
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
            })
        );

        // Sort by most deals
        performance.sort((a, b) => b.deals - a.deals);

        res.json(performance);
    } catch (error) {
        next(error);
    }
});

// Get won deals chart data
// Get won deals chart data
router.get('/won-deals', async (req: AuthRequest, res, next) => {
    try {
        const range = getRangeFromQuery(req.query);
        if ('error' in range) return res.status(400).json({ error: range.error });
        const { start: startDate, end: endDate, timeframe } = range;
        const { mode = 'value' } = req.query as { mode?: string };
        const dealAccessFilter = getDealAccessFilter(req.user);
        const granularity = getGranularity(startDate, endDate, timeframe);

        const deals = await prisma.deal.findMany({
            where: {
                ...dealAccessFilter,
                stage: { in: ['CLOSED_WON', 'CLOSED_LOST'] },
                closedAt: { gte: startDate, lte: endDate },
            },
            select: {
                closedAt: true,
                value: true,
                stage: true,
                owner: { select: { name: true } },
            },
            orderBy: { closedAt: 'asc' },
        });

        // Aggregate data
        const dataMap = new Map<string, { won: number; lost: number; breakdown: Record<string, number> }>();

        // Initialize map with 0s
        const initData = (key: string) => {
            if (!dataMap.has(key)) {
                dataMap.set(key, { won: 0, lost: 0, breakdown: {} });
            }
        };

        initBuckets(startDate, endDate, granularity).forEach(k => initData(k));

        deals.forEach(deal => {
            if (!deal.closedAt) return;
            const date = new Date(deal.closedAt);
            const key = formatKey(date, granularity);
            const ownerName = deal.owner?.name || 'Unknown';

            if (dataMap.has(key)) {
                const entry = dataMap.get(key)!;
                if (deal.stage === 'CLOSED_WON') {
                    const val = mode === 'count' ? 1 : Number(deal.value);
                    entry.won += val;
                    entry.breakdown[ownerName] = (entry.breakdown[ownerName] || 0) + val;
                } else if (deal.stage === 'CLOSED_LOST') {
                    entry.lost += mode === 'count' ? 1 : Number(deal.value);
                }
            }
        });

        const chartData = Array.from(dataMap.entries()).map(([name, values]) => ({
            name,
            won: values.won,
            lost: values.lost,
            ...values.breakdown, // Spread names for Bar components
        }));

        res.json(chartData);
    } catch (error) {
        next(error);
    }
});

// Get deals count chart data (New vs Won count)
router.get('/deals-count', async (req: AuthRequest, res, next) => {
    try {
        const range = getRangeFromQuery(req.query);
        if ('error' in range) return res.status(400).json({ error: range.error });
        const { start: startDate, end: endDate, timeframe } = range;
        const dealAccessFilter = getDealAccessFilter(req.user);
        const granularity = getGranularity(startDate, endDate, timeframe);

        // Fetch New Deals (based on createdAt)
        const newDeals = await prisma.deal.findMany({
            where: {
                ...dealAccessFilter,
                createdAt: { gte: startDate, lte: endDate },
            },
            select: { createdAt: true },
        });

        // Fetch Won Deals (based on closedAt and stage)
        const wonDeals = await prisma.deal.findMany({
            where: {
                ...dealAccessFilter,
                stage: 'CLOSED_WON',
                closedAt: { gte: startDate, lte: endDate },
            },
            select: { closedAt: true },
        });

        // Fetch Lost Deals (based on closedAt and stage)
        const lostDeals = await prisma.deal.findMany({
            where: {
                ...dealAccessFilter,
                stage: 'CLOSED_LOST',
                closedAt: { gte: startDate, lte: endDate },
            },
            select: { closedAt: true },
        });

        const dataMap = new Map<string, { new: number; won: number; lost: number }>();

        // Init map
        const initData = (key: string) => {
            if (!dataMap.has(key)) {
                dataMap.set(key, { new: 0, won: 0, lost: 0 });
            }
        };

        initBuckets(startDate, endDate, granularity).forEach(k => initData(k));

        // Helper to get key
        const getKey = (dateStr: Date | null | undefined) => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            return formatKey(date, granularity);
        };

        // Aggregate New Deals
        newDeals.forEach(deal => {
            const key = getKey(deal.createdAt);
            if (key && dataMap.has(key)) {
                dataMap.get(key)!.new += 1;
            }
        });

        // Aggregate Won Deals
        wonDeals.forEach(deal => {
            const key = getKey(deal.closedAt);
            if (key && dataMap.has(key)) {
                dataMap.get(key)!.won += 1;
            }
        });

        // Aggregate Lost Deals
        lostDeals.forEach(deal => {
            const key = getKey(deal.closedAt);
            if (key && dataMap.has(key)) {
                dataMap.get(key)!.lost += 1;
            }
        });

        const chartData = Array.from(dataMap.entries()).map(([name, values]) => ({
            name,
            new: values.new,
            won: values.won,
            lost: values.lost,
        }));

        res.json(chartData);
    } catch (error) {
        next(error);
    }
});

export default router;
