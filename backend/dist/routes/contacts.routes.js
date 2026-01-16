"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Get all contacts
router.get('/', async (req, res, next) => {
    try {
        const { search, ownerId } = req.query;
        const contacts = await index_1.prisma.contact.findMany({
            where: {
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
                ...(ownerId && req.user?.role === 'ADMIN' ? { ownerId: ownerId } : {}),
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
                _count: { select: { deals: true, activities: true } },
            },
        });
        res.json(contacts);
    }
    catch (error) {
        next(error);
    }
});
// Get single contact
router.get('/:id', async (req, res, next) => {
    try {
        const contact = await index_1.prisma.contact.findFirst({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
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
    }
    catch (error) {
        next(error);
    }
});
// Create contact
router.post('/', async (req, res, next) => {
    try {
        const contact = await index_1.prisma.contact.create({
            data: {
                ...req.body,
                ownerId: req.user.id,
            },
        });
        res.status(201).json(contact);
    }
    catch (error) {
        next(error);
    }
});
// Update contact
router.put('/:id', async (req, res, next) => {
    try {
        const updated = await index_1.prisma.contact.updateMany({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
            },
            data: req.body,
        });
        if (updated.count === 0) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        const contact = await index_1.prisma.contact.findUnique({
            where: { id: req.params.id },
        });
        res.json(contact);
    }
    catch (error) {
        next(error);
    }
});
// Delete contact
router.delete('/:id', async (req, res, next) => {
    try {
        const deleted = await index_1.prisma.contact.deleteMany({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
            },
        });
        if (deleted.count === 0) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        res.json({ message: 'Contact deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=contacts.routes.js.map