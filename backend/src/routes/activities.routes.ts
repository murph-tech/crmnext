import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest, getUserFilter } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Get all activities
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { type, completed, leadId, contactId, dealId } = req.query;

        const activities = await prisma.activity.findMany({
            where: {
                ...getUserFilter(req.user),
                ...(type && { type: type as any }),
                ...(completed !== undefined && { completed: completed === 'true' }),
                ...(leadId && { leadId: leadId as string }),
                ...(contactId && { contactId: contactId as string }),
                ...(dealId && { dealId: dealId as string }),
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
                user: { select: { name: true, email: true } },
            },
        });

        res.json(activities);
    } catch (error) {
        next(error);
    }
});

// Get upcoming activities (tasks due soon)
router.get('/upcoming', async (req: AuthRequest, res, next) => {
    try {
        const activities = await prisma.activity.findMany({
            where: {
                ...getUserFilter(req.user),
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
                user: { select: { name: true, email: true } },
            },
        });

        res.json(activities);
    } catch (error) {
        next(error);
    }
});

// Create activity
router.post('/', async (req: AuthRequest, res, next) => {
    try {
        const activity = await prisma.activity.create({
            data: {
                ...req.body,
                userId: req.user!.id,
            },
        });

        res.status(201).json(activity);
    } catch (error) {
        next(error);
    }
});

// Update activity
router.put('/:id', async (req: AuthRequest, res, next) => {
    try {
        const updated = await prisma.activity.updateMany({
            where: {
                id: req.params.id as string,
                ...getUserFilter(req.user),
            },
            data: req.body,
        });

        if (updated.count === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        const activity = await prisma.activity.findUnique({
            where: { id: req.params.id as string },
        });

        res.json(activity);
    } catch (error) {
        next(error);
    }
});

// Mark activity as complete
router.patch('/:id/complete', async (req: AuthRequest, res, next) => {
    try {
        const updated = await prisma.activity.updateMany({
            where: {
                id: req.params.id as string,
                ...getUserFilter(req.user),
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
    } catch (error) {
        next(error);
    }
});

// Delete activity
router.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        const deleted = await prisma.activity.deleteMany({
            where: {
                id: req.params.id as string,
                ...getUserFilter(req.user),
            },
        });

        if (deleted.count === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        res.json({ message: 'Activity deleted successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
