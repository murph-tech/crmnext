"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Register
router.post('/register', async (req, res, next) => {
    try {
        const { email, password, name } = req.body;
        // Check if user exists
        const existingUser = await index_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Create user
        const user = await index_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });
        // Generate token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        res.status(201).json({ user, token });
    }
    catch (error) {
        next(error);
    }
});
// Login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        // Find user
        const user = await index_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Check password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar: user.avatar,
            },
            token,
        });
    }
    catch (error) {
        next(error);
    }
});
// Get current user
router.get('/me', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const user = await index_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatar: true,
                createdAt: true,
            },
        });
        res.json(user);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
// Update profile
router.put('/me', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const { name, email } = req.body;
        const userId = req.user.id;
        // Check if email is taken by another user
        if (email) {
            const existingUser = await index_1.prisma.user.findFirst({
                where: {
                    email,
                    NOT: { id: userId },
                },
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }
        const updatedUser = await index_1.prisma.user.update({
            where: { id: userId },
            data: {
                ...(name && { name }),
                ...(email && { email }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatar: true,
                createdAt: true,
            },
        });
        res.json(updatedUser);
    }
    catch (error) {
        next(error);
    }
});
// Change password
router.put('/password', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        const user = await index_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isValid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        await index_1.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=auth.routes.js.map