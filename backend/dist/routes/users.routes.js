"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
// Get all users
router.get('/', async (req, res, next) => {
    try {
        const users = await index_1.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        leads: true,
                        contacts: true,
                        deals: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(users);
    }
    catch (error) {
        next(error);
    }
});
// Get single user
router.get('/:id', async (req, res, next) => {
    try {
        const user = await index_1.prisma.user.findUnique({
            where: { id: String(req.params.id) },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        leads: true,
                        contacts: true,
                        deals: true,
                        activities: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        next(error);
    }
});
// Create user
// Create user (Admin only)
router.post('/', (0, auth_middleware_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const { username, email, password, name, role } = req.body;
        // Validate required fields
        if (!username || !email || !password || !name) {
            return res.status(400).json({ error: 'Username, email, password and name are required' });
        }
        // Check if email or username already exists
        const existingUser = await index_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Email or Username already registered' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Create user
        const user = await index_1.prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                name,
                role: role || 'USER',
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });
        res.status(201).json(user);
    }
    catch (error) {
        next(error);
    }
});
// Update user
// Update user (Admin only)
router.put('/:id', (0, auth_middleware_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const { email, name, role, password } = req.body;
        const userId = String(req.params.id);
        // Check if user exists
        const existingUser = await index_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if email is taken by another user
        if (email && email !== existingUser.email) {
            const emailTaken = await index_1.prisma.user.findUnique({
                where: { email },
            });
            if (emailTaken) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }
        // Build update data
        const updateData = {};
        if (email)
            updateData.email = email;
        if (name)
            updateData.name = name;
        if (role)
            updateData.role = role;
        if (password) {
            updateData.password = await bcryptjs_1.default.hash(password, 12);
        }
        const user = await index_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.json(user);
    }
    catch (error) {
        next(error);
    }
});
// Delete user
// Delete user (Admin only)
router.delete('/:id', (0, auth_middleware_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const userId = String(req.params.id);
        // Prevent self-deletion
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        // Check if user exists
        const existingUser = await index_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Delete user (cascading deletes should handle related data based on schema)
        await index_1.prisma.user.delete({
            where: { id: userId },
        });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=users.routes.js.map