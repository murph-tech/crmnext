"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Helper to get start date based on timeframe
const getStartDate = (timeframe = 'week') => {
    const now = new Date();
    const startDate = new Date();
    if (timeframe === 'month') {
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    else if (timeframe === 'year') {
        return new Date(now.getFullYear(), 0, 1);
    }
    else {
        // Default to week: Start from last Sunday
        const day = now.getDay();
        const diff = now.getDate() - day;
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        return startDate;
    }
};
// Get dashboard stats
router.get('/stats', async (req, res, next) => {
    try {
        const { timeframe = 'week' } = req.query;
        const ownerFilter = (0, auth_middleware_1.getOwnerFilter)(req.user);
        const dealAccessFilter = (0, auth_middleware_1.getDealAccessFilter)(req.user);
        const startDate = getStartDate(timeframe);
        // Get counts
        const [totalLeads, newLeadsCount, totalContacts, totalDeals, activeDeals, closedWonDealsInPeriod,] = await Promise.all([
            index_1.prisma.lead.count({ where: ownerFilter }),
            index_1.prisma.lead.count({
                where: {
                    ...ownerFilter,
                    createdAt: { gte: startDate },
                },
            }),
            index_1.prisma.contact.count({ where: ownerFilter }),
            index_1.prisma.deal.count({ where: dealAccessFilter }),
            index_1.prisma.deal.count({
                where: {
                    ...dealAccessFilter,
                    stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
                },
            }),
            index_1.prisma.deal.findMany({
                where: {
                    ...dealAccessFilter,
                    stage: 'CLOSED_WON',
                    updatedAt: { gte: startDate },
                },
                select: { value: true },
            }),
        ]);
        // Calculate revenue for the period
        const totalRevenue = closedWonDealsInPeriod.reduce((sum, deal) => sum + Number(deal.value), 0);
        // Calculate conversion rate (Lifetime or Period? Keeping lifetime for global context, or period?)
        // Let's keep conversion rate as global "Health" metric for now, or it fluctuates too wildly on short periods.
        // Actually, let's keep it global as per previous code structure but fix the variable names.
        const convertedLeads = await index_1.prisma.lead.count({
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
        const userFilter = (0, auth_middleware_1.getUserFilter)(req.user);
        const tasksCompletedInPeriod = await index_1.prisma.activity.count({
            where: {
                ...userFilter,
                completed: true,
                completedAt: { gte: startDate },
            },
        });
        // For "Due in period", if period is 'year', it's huge. 
        // But for "Efficiency" in that period, it makes sense.
        const tasksDueInPeriod = await index_1.prisma.activity.count({
            where: {
                ...userFilter,
                completed: false,
                dueDate: { gte: startDate },
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
    }
    catch (error) {
        next(error);
    }
});
// Get recent activity
router.get('/recent-activity', async (req, res, next) => {
    try {
        const { timeframe = 'week' } = req.query;
        const startDate = getStartDate(timeframe);
        const activities = await index_1.prisma.activity.findMany({
            where: {
                ...(0, auth_middleware_1.getUserFilter)(req.user),
                createdAt: { gte: startDate },
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
                    ...(0, auth_middleware_1.getDealAccessFilter)(req.user),
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
// Get won deals chart data
// Get won deals chart data
router.get('/won-deals', async (req, res, next) => {
    try {
        const { timeframe = 'week' } = req.query;
        const dealAccessFilter = (0, auth_middleware_1.getDealAccessFilter)(req.user);
        const now = new Date();
        let startDate = new Date();
        // Fix start date calculation
        if (timeframe === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of month
        }
        else if (timeframe === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1); // Start of year
        }
        else {
            // Default to week: Start from last Sunday
            const day = now.getDay();
            const diff = now.getDate() - day; // Adjusts so Sunday is start
            startDate = new Date(now.setDate(diff));
            startDate.setHours(0, 0, 0, 0);
        }
        const deals = await index_1.prisma.deal.findMany({
            where: {
                ...dealAccessFilter,
                stage: { in: ['CLOSED_WON', 'CLOSED_LOST'] },
                updatedAt: { gte: startDate },
            },
            select: {
                updatedAt: true,
                value: true,
                stage: true,
            },
            orderBy: { updatedAt: 'asc' },
        });
        // Aggregate data
        const dataMap = new Map();
        // Initialize map with 0s
        const initData = (key) => {
            if (!dataMap.has(key)) {
                dataMap.set(key, { won: 0, lost: 0 });
            }
        };
        if (timeframe === 'week') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            days.forEach(day => initData(day));
        }
        else if (timeframe === 'month') {
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                initData(String(i));
            }
        }
        else if (timeframe === 'year') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            months.forEach(month => initData(month));
        }
        deals.forEach(deal => {
            const date = new Date(deal.updatedAt);
            let key = '';
            if (timeframe === 'week') {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                key = days[date.getDay()];
            }
            else if (timeframe === 'month') {
                key = String(date.getDate());
            }
            else if (timeframe === 'year') {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                key = months[date.getMonth()];
            }
            if (dataMap.has(key)) {
                const entry = dataMap.get(key);
                if (deal.stage === 'CLOSED_WON') {
                    entry.won += Number(deal.value);
                }
                else if (deal.stage === 'CLOSED_LOST') {
                    entry.lost += Number(deal.value);
                }
            }
        });
        const chartData = Array.from(dataMap.entries()).map(([name, values]) => ({
            name,
            won: values.won,
            lost: values.lost,
        }));
        res.json(chartData);
    }
    catch (error) {
        next(error);
    }
});
// Get deals count chart data (New vs Won count)
router.get('/deals-count', async (req, res, next) => {
    try {
        const { timeframe = 'week' } = req.query;
        const dealAccessFilter = (0, auth_middleware_1.getDealAccessFilter)(req.user);
        const startDate = getStartDate(timeframe);
        // Fetch New Deals (based on createdAt)
        const newDeals = await index_1.prisma.deal.findMany({
            where: {
                ...dealAccessFilter,
                createdAt: { gte: startDate },
            },
            select: { createdAt: true },
        });
        // Fetch Won Deals (based on updatedAt and stage)
        const wonDeals = await index_1.prisma.deal.findMany({
            where: {
                ...dealAccessFilter,
                stage: 'CLOSED_WON',
                updatedAt: { gte: startDate },
            },
            select: { updatedAt: true },
        });
        const dataMap = new Map();
        // Init map
        const initData = (key) => {
            if (!dataMap.has(key)) {
                dataMap.set(key, { new: 0, won: 0 });
            }
        };
        const now = new Date();
        if (timeframe === 'week') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            days.forEach(day => initData(day));
        }
        else if (timeframe === 'month') {
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                initData(String(i));
            }
        }
        else if (timeframe === 'year') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            months.forEach(month => initData(month));
        }
        // Helper to get key
        const getKey = (dateStr) => {
            const date = new Date(dateStr);
            if (timeframe === 'week') {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                return days[date.getDay()];
            }
            else if (timeframe === 'month') {
                return String(date.getDate());
            }
            else if (timeframe === 'year') {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return months[date.getMonth()];
            }
            return '';
        };
        // Aggregate New Deals
        newDeals.forEach(deal => {
            const key = getKey(deal.createdAt);
            if (dataMap.has(key)) {
                dataMap.get(key).new += 1;
            }
        });
        // Aggregate Won Deals
        wonDeals.forEach(deal => {
            const key = getKey(deal.updatedAt);
            if (dataMap.has(key)) {
                dataMap.get(key).won += 1;
            }
        });
        const chartData = Array.from(dataMap.entries()).map(([name, values]) => ({
            name,
            new: values.new,
            won: values.won,
        }));
        res.json(chartData);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map