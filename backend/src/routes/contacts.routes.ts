import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest, getOwnerFilter } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Get all contacts
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { search, ownerId } = req.query;

        const contacts = await prisma.contact.findMany({
            where: {
                ...getOwnerFilter(req.user),
                ...(ownerId && req.user?.role === 'ADMIN' ? { ownerId: ownerId as string } : {}),
                ...(search && {
                    OR: [
                        { firstName: { contains: search as string } },
                        { lastName: { contains: search as string } },
                        { email: { contains: search as string } },
                        { company: { contains: search as string } },
                    ],
                }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { deals: true, activities: true } },
            },
        });

        res.json(contacts);
    } catch (error) {
        next(error);
    }
});

// Get single contact
router.get('/:id', async (req: AuthRequest, res, next) => {
    try {
        const contact = await prisma.contact.findFirst({
            where: {
                id: req.params.id as string,
                ...getOwnerFilter(req.user),
            },
            include: {
                deals: { orderBy: { createdAt: 'desc' } },
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        res.json(contact);
    } catch (error) {
        next(error);
    }
});

// Create contact
router.post('/', async (req: AuthRequest, res, next) => {
    try {
        const contact = await prisma.contact.create({
            data: {
                ...req.body,
                ownerId: req.user!.id,
            },
        });

        res.status(201).json(contact);
    } catch (error) {
        next(error);
    }
});

// Update contact
router.put('/:id', async (req: AuthRequest, res, next) => {
    try {
        const updated = await prisma.contact.updateMany({
            where: {
                id: req.params.id as string,
                ...getOwnerFilter(req.user),
            },
            data: req.body,
        });

        if (updated.count === 0) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        const contact = await prisma.contact.findUnique({
            where: { id: req.params.id as string },
        });

        res.json(contact);
    } catch (error) {
        next(error);
    }
});

// Delete contact
router.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        const deleted = await prisma.contact.deleteMany({
            where: {
                id: req.params.id as string,
                ...getOwnerFilter(req.user),
            },
        });

        if (deleted.count === 0) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        res.json({ message: 'Contact deleted successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
