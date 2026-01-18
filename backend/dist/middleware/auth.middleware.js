"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDealAccessFilter = exports.getUserFilter = exports.getOwnerFilter = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Verify user still exists
        const user = await index_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true },
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        next();
    };
};
exports.authorize = authorize;
// Helper to build owner filter with Admin bypass
// Use for models with 'ownerId' field (Lead, Contact, Deal)
const getOwnerFilter = (user) => {
    if (user?.role === 'ADMIN') {
        return {}; // Admin sees all
    }
    if (!user?.id) {
        return { ownerId: 'unauthorized' }; // Return invalid ID to ensure no results
    }
    return { ownerId: user.id };
};
exports.getOwnerFilter = getOwnerFilter;
// Helper to build user filter with Admin bypass
// Use for models with 'userId' field (Activity)
const getUserFilter = (user) => {
    if (user?.role === 'ADMIN') {
        return {}; // Admin sees all
    }
    if (!user?.id) {
        return { userId: 'unauthorized' }; // Return invalid ID to ensure no results
    }
    return { userId: user.id };
};
exports.getUserFilter = getUserFilter;
// Helper for Deal access (Owner OR Sales Team Member)
const getDealAccessFilter = (user) => {
    if (user?.role === 'ADMIN') {
        return {};
    }
    if (!user?.id) {
        return { ownerId: 'unauthorized' };
    }
    return {
        OR: [
            { ownerId: user.id },
            { salesTeam: { some: { id: user.id } } }
        ]
    };
};
exports.getDealAccessFilter = getDealAccessFilter;
//# sourceMappingURL=auth.middleware.js.map