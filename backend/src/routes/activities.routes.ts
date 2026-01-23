import { Router } from 'express';
import { prisma } from '../db';
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
        const { type, title, description, dueDate, dealId, contactId, duration, reminderAt } = req.body;
        const userId = req.user!.id;

        const activity = await prisma.activity.create({
            data: {
                ...req.body,
                userId,
            },
            include: {
                deal: { select: { title: true } },
                contact: { select: { firstName: true, lastName: true } }
            }
        });

        // AUTO-SYNC: Create Calendar Event for this Activity
        // Only if it has a due date properly set
        if (dueDate) {
            const startTime = new Date(dueDate);
            // Default duration 30 mins if not set
            const durationMs = (duration || 30) * 60 * 1000;
            const endTime = new Date(startTime.getTime() + durationMs);

            const eventTitle = `${type}: ${title}`;

            // Build description
            let eventDesc = description || '';
            if (activity.deal) eventDesc += `\nRelated Deal: ${activity.deal.title}`;
            if (activity.contact) eventDesc += `\nContact: ${activity.contact.firstName} ${activity.contact.lastName}`;

            // Map Activity Type to Color (Optional, nice to have)
            let color = '#3B82F6'; // Blue default
            if (type === 'MEETING') color = '#10B981'; // Green
            if (type === 'CALL') color = '#F59E0B'; // Orange
            if (type === 'TASK') color = '#6366F1'; // Indigo

            await prisma.calendarEvent.create({
                data: {
                    userId,
                    title: eventTitle,
                    description: eventDesc,
                    startTime,
                    endTime,
                    isAllDay: false,
                    color,
                    activityId: activity.id,
                    dealId: dealId || undefined,
                    contactId: contactId || undefined,
                }
            });
        }

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
        const activityId = req.params.id as string;

        // Verify ownership/existence first
        const activity = await prisma.activity.findFirst({
            where: {
                id: activityId,
                ...getUserFilter(req.user),
            },
        });

        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        // Explicitly delete associated calendar events
        await prisma.calendarEvent.deleteMany({
            where: { activityId: activityId },
        });

        const deleted = await prisma.activity.delete({
            where: { id: activityId },
        });

        res.json({ message: 'Activity deleted successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
