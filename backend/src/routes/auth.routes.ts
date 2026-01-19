import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/security.middleware';

const router = Router();

// Check if setup is needed (no users exist)
router.get('/setup/check', async (req, res, next) => {
    try {
        const userCount = await prisma.user.count();
        res.json({
            needsSetup: userCount === 0,
            userCount
        });
    } catch (error) {
        next(error);
    }
});

// Initial setup - create first admin user
router.post('/setup', async (req, res, next) => {
    try {
        // Check if any user already exists
        const userCount = await prisma.user.count();
        if (userCount > 0) {
            return res.status(400).json({ error: 'Setup already completed. Admin user exists.' });
        }

        const { username, email, password, name } = req.body;

        if (!username || !email || !password || !name) {
            return res.status(400).json({ error: 'Username, email, password, and name are required' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create admin user
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                name,
                role: 'ADMIN', // First user is always admin
            },
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                role: true,
            },
        });

        // Generate token
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Admin user created successfully',
            user,
            token
        });
    } catch (error) {
        next(error);
    }
});

// Register
router.post('/register', authLimiter, async (req, res, next) => {
    try {
        const { username, email, password, name } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findFirst({
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
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                username,
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
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.status(201).json({ user, token });
    } catch (error) {
        next(error);
    }
});

// Login
router.post('/login', authLimiter, async (req, res, next) => {
    try {
        const { username, password } = req.body;

        // Find user by username
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar: user.avatar,
                preferences: user.preferences,
            },
            token,
        });
    } catch (error) {
        next(error);
    }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatar: true,
                preferences: true,
                createdAt: true,
            },
        });

        res.json(user);
    } catch (error) {
        next(error);
    }
});

export default router;

// Update profile
router.put('/me', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { name, email } = req.body;
        const userId = req.user!.id;

        // Check if email is taken by another user
        if (email) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email,
                    NOT: { id: userId },
                },
            });

            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(req.body.preferences !== undefined && { preferences: req.body.preferences }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatar: true,
                preferences: true,
                createdAt: true,
            },
        });

        res.json(updatedUser);
    } catch (error) {
        next(error);
    }
});

// Change password
router.put('/password', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user!.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
});
