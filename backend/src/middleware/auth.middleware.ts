import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'your-secret-key';

        const decoded = jwt.verify(token, secret) as {
            userId: string;
            email: string;
            role: string;
        };

        // Verify user still exists
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true },
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        next();
    };
};

// Helper to build owner filter with Admin bypass
// Use for models with 'ownerId' field (Lead, Contact, Deal)
export const getOwnerFilter = (user: AuthRequest['user']) => {
    if (user?.role === 'ADMIN') {
        return {}; // Admin sees all
    }
    return { ownerId: user?.id };
};

// Helper to build user filter with Admin bypass
// Use for models with 'userId' field (Activity)
export const getUserFilter = (user: AuthRequest['user']) => {
    if (user?.role === 'ADMIN') {
        return {}; // Admin sees all
    }
    return { userId: user?.id };
};
