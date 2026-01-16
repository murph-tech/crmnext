import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest, getOwnerFilter } from '../middleware/auth.middleware';

const router = Router();

// Apply auth to all routes
router.use(authenticate);

// Get all leads
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { status, source, search, ownerId } = req.query;

        const leads = await prisma.lead.findMany({
            where: {
                ...getOwnerFilter(req.user),
                ...(ownerId && req.user?.role === 'ADMIN' ? { ownerId: ownerId as string } : {}),
                ...(status && { status: status as any }),
                ...(source && { source: source as any }),
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
                _count: { select: { activities: true } },
                owner: { select: { id: true, name: true, email: true } },
            },
        });

        res.json(leads);
    } catch (error) {
        next(error);
    }
});

// Get single lead
router.get('/:id', async (req: AuthRequest, res, next) => {
    try {
        const lead = await prisma.lead.findFirst({
            where: {
                id: req.params.id as string,
                ...getOwnerFilter(req.user),
            },
            include: {
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.json(lead);
    } catch (error) {
        next(error);
    }
});

// Create lead
router.post('/', async (req: AuthRequest, res, next) => {
    try {
        const { firstName, lastName, email, phone, company, jobTitle, taxId, address, source, notes } = req.body;

        const lead = await prisma.lead.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                company,
                jobTitle,
                taxId,
                address,
                source: source || 'OTHER',
                notes,
                owner: { connect: { id: req.user!.id } },
            },
        });

        res.status(201).json(lead);
    } catch (error) {
        next(error);
    }
});

// Update lead
router.put('/:id', async (req: AuthRequest, res, next) => {
    try {
        const lead = await prisma.lead.updateMany({
            where: {
                id: req.params.id as string,
                ...getOwnerFilter(req.user),
            },
            data: req.body,
        });

        if (lead.count === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const updatedLead = await prisma.lead.findUnique({
            where: { id: req.params.id as string },
        });

        res.json(updatedLead);
    } catch (error) {
        next(error);
    }
});

// Delete lead
router.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        const lead = await prisma.lead.deleteMany({
            where: {
                id: req.params.id as string,
                ...getOwnerFilter(req.user),
            },
        });

        if (lead.count === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
        next(error);
    }
});

// Convert lead to contact
router.post('/:id/convert', async (req: AuthRequest, res, next) => {
    try {
        const lead = await prisma.lead.findFirst({
            where: {
                id: req.params.id as string,
                ...getOwnerFilter(req.user),
            },
        });

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Check if contact with same email already exists
        const existingContact = await prisma.contact.findFirst({
            where: { email: lead.email },
        });

        if (existingContact) {
            return res.status(400).json({ error: 'Contact with this email already exists' });
        }

        // Create contact from lead
        const contact = await prisma.contact.create({
            data: {
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                company: lead.company,
                jobTitle: lead.jobTitle,
                taxId: lead.taxId,
                address: lead.address,
                notes: lead.notes,
                ownerId: req.user!.id,
                convertedFromId: lead.id,
            },
        });

        // Update lead status
        await prisma.lead.update({
            where: { id: lead.id },
            data: { status: 'CONVERTED' },
        });

        res.status(201).json(contact);
    } catch (error) {
        next(error);
    }
});

export default router;
