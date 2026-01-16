"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const nodemailer_1 = __importDefault(require("nodemailer"));
const router = (0, express_1.Router)();
// Public endpoint - Get branding settings (no auth required)
router.get('/public', async (req, res, next) => {
    try {
        const branding = await index_1.prisma.systemSetting.findUnique({
            where: { key: 'branding' }
        });
        if (branding) {
            res.json(JSON.parse(branding.value));
        }
        else {
            res.json({ appName: 'CRM Next', logo: '' });
        }
    }
    catch (error) {
        res.json({ appName: 'CRM Next', logo: '' });
    }
});
router.use(auth_middleware_1.authenticate);
// Get all integration settings
router.get('/', async (req, res, next) => {
    try {
        const settings = await index_1.prisma.systemSetting.findMany();
        // Convert array to object for easier frontend consumption
        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = JSON.parse(curr.value);
            return acc;
        }, {});
        res.json(settingsMap);
    }
    catch (error) {
        next(error);
    }
});
// Save a setting
router.post('/', async (req, res, next) => {
    try {
        const { key, value } = req.body;
        if (!key || !value) {
            return res.status(400).json({ error: 'Key and value are required' });
        }
        const setting = await index_1.prisma.systemSetting.upsert({
            where: { key },
            update: { value: JSON.stringify(value) },
            create: { key, value: JSON.stringify(value) },
        });
        res.json({ message: 'Setting saved', setting });
    }
    catch (error) {
        next(error);
    }
});
// Test Email Connection
router.post('/email/test', async (req, res, next) => {
    try {
        const config = req.body; // Expects SMTP config structure
        const toEmail = config.toEmail || req.user.email;
        // Basic validation
        if (!config.host || !config.auth?.user || !config.auth?.pass) {
            return res.status(400).json({ error: 'Invalid SMTP configuration' });
        }
        const transporter = nodemailer_1.default.createTransport({
            host: config.host,
            port: Number(config.port) || 587,
            secure: config.secure || false, // true for 465, false for other ports
            auth: {
                user: config.auth.user,
                pass: config.auth.pass,
            },
        });
        // Verify connection
        await transporter.verify();
        // Send test email
        await transporter.sendMail({
            from: config.from || config.auth.user,
            to: toEmail, // Send to specified email or current user
            subject: 'CRM Email Integration Test',
            text: 'This is a test email from your CRM Config.',
            html: '<p>This is a test email from your <b>CRM Config</b>.</p>',
        });
        res.json({ message: 'Connection verified and test email sent to ' + toEmail });
    }
    catch (error) {
        console.error('Email Test Failed:', error);
        res.status(500).json({ error: 'Email test failed: ' + error.message });
    }
});
exports.default = router;
//# sourceMappingURL=settings.routes.js.map