"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Apply auth to all routes
router.use(auth_middleware_1.authenticate);
// Get all leads
router.get('/', async (req, res, next) => {
    try {
        const { status, source, search, ownerId } = req.query;
        const leads = await index_1.prisma.lead.findMany({
            where: {
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
                ...(ownerId && req.user?.role === 'ADMIN' ? { ownerId: ownerId } : {}),
                ...(status && { status: status }),
                ...(source && { source: source }),
                ...(search && {
                    OR: [
                        { firstName: { contains: search } },
                        { lastName: { contains: search } },
                        { email: { contains: search } },
                        { company: { contains: search } },
                    ],
                }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { activities: true } },
            },
        });
        res.json(leads);
    }
    catch (error) {
        next(error);
    }
});
// Get single lead
router.get('/:id', async (req, res, next) => {
    try {
        const lead = await index_1.prisma.lead.findFirst({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
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
    }
    catch (error) {
        next(error);
    }
});
// Create lead
router.post('/', async (req, res, next) => {
    try {
        const { firstName, lastName, email, phone, company, jobTitle, taxId, address, source, notes } = req.body;
        const lead = await index_1.prisma.lead.create({
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
                owner: { connect: { id: req.user.id } },
            },
        });
        res.status(201).json(lead);
    }
    catch (error) {
        next(error);
    }
});
// Update lead
router.put('/:id', async (req, res, next) => {
    try {
        const lead = await index_1.prisma.lead.updateMany({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
            },
            data: req.body,
        });
        if (lead.count === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        const updatedLead = await index_1.prisma.lead.findUnique({
            where: { id: req.params.id },
        });
        res.json(updatedLead);
    }
    catch (error) {
        next(error);
    }
});
// Delete lead
router.delete('/:id', async (req, res, next) => {
    try {
        const lead = await index_1.prisma.lead.deleteMany({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
            },
        });
        if (lead.count === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json({ message: 'Lead deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
// Convert lead to contact
router.post('/:id/convert', async (req, res, next) => {
    try {
        const lead = await index_1.prisma.lead.findFirst({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
            },
        });
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        // Create contact from lead
        const contact = await index_1.prisma.contact.create({
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
                ownerId: req.user.id,
                convertedFromId: lead.id,
            },
        });
        // Update lead status
        await index_1.prisma.lead.update({
            where: { id: lead.id },
            data: { status: 'CONVERTED' },
        });
        res.status(201).json(contact);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=leads.routes.js.map