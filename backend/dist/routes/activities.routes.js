"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Get all activities
router.get('/', async (req, res, next) => {
    try {
        const { type, completed, leadId, contactId, dealId } = req.query;
        const activities = await index_1.prisma.activity.findMany({
            where: {
                ...(0, auth_middleware_1.getUserFilter)(req.user),
                ...(type && { type: type }),
                ...(completed !== undefined && { completed: completed === 'true' }),
                ...(leadId && { leadId: leadId }),
                ...(contactId && { contactId: contactId }),
                ...(dealId && { dealId: dealId }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                lead: { select: { id: true, firstName: true, lastName: true, company: true } },
                contact: { select: { id: true, firstName: true, lastName: true, company: true } },
                deal: {
                    select: {
                        id: true,
                        title: true,
                        contact: { select: { company: true } }
                    }
                },
            },
        });
        res.json(activities);
    }
    catch (error) {
        next(error);
    }
});
// Get upcoming activities (tasks due soon)
router.get('/upcoming', async (req, res, next) => {
    try {
        const activities = await index_1.prisma.activity.findMany({
            where: {
                ...(0, auth_middleware_1.getUserFilter)(req.user),
                completed: false,
                dueDate: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
                },
            },
            orderBy: { dueDate: 'asc' },
            include: {
                lead: { select: { id: true, firstName: true, lastName: true, company: true } },
                contact: { select: { id: true, firstName: true, lastName: true, company: true } },
                deal: {
                    select: {
                        id: true,
                        title: true,
                        contact: { select: { company: true } }
                    }
                },
            },
        });
        res.json(activities);
    }
    catch (error) {
        next(error);
    }
});
// Create activity
router.post('/', async (req, res, next) => {
    try {
        const activity = await index_1.prisma.activity.create({
            data: {
                ...req.body,
                userId: req.user.id,
            },
        });
        res.status(201).json(activity);
    }
    catch (error) {
        next(error);
    }
});
// Update activity
router.put('/:id', async (req, res, next) => {
    try {
        const updated = await index_1.prisma.activity.updateMany({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getUserFilter)(req.user),
            },
            data: req.body,
        });
        if (updated.count === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        const activity = await index_1.prisma.activity.findUnique({
            where: { id: req.params.id },
        });
        res.json(activity);
    }
    catch (error) {
        next(error);
    }
});
// Mark activity as complete
router.patch('/:id/complete', async (req, res, next) => {
    try {
        const updated = await index_1.prisma.activity.updateMany({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getUserFilter)(req.user),
            },
            data: {
                completed: true,
                completedAt: new Date(),
            },
        });
        if (updated.count === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        res.json({ message: 'Activity marked as complete' });
    }
    catch (error) {
        next(error);
    }
});
// Delete activity
router.delete('/:id', async (req, res, next) => {
    try {
        const deleted = await index_1.prisma.activity.deleteMany({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getUserFilter)(req.user),
            },
        });
        if (deleted.count === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        res.json({ message: 'Activity deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=activities.routes.js.map