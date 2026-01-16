"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReminderService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const index_1 = require("../index");
const nodemailer_1 = __importDefault(require("nodemailer"));
const startReminderService = () => {
    // Check every minute
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            // 1. Get SMTP Settings
            const smtpSetting = await index_1.prisma.systemSetting.findUnique({
                where: { key: 'smtp_config' }
            });
            if (!smtpSetting) {
                // No SMTP Config found. Skipping reminders silently to avoid log spam.
                return;
            }
            const config = JSON.parse(smtpSetting.value);
            // Validate config basics
            if (!config.host || !config.user || !config.pass)
                return;
            const transporter = nodemailer_1.default.createTransport({
                host: config.host,
                port: Number(config.port) || 587,
                secure: config.secure || false,
                auth: { user: config.user, pass: config.pass },
            });
            // 2. Find due reminders
            const now = new Date();
            const reminders = await index_1.prisma.activity.findMany({
                where: {
                    reminderAt: { lte: now },
                    reminderSent: false,
                    completed: false,
                },
                include: {
                    user: true, // Activity Owner
                    lead: { select: { firstName: true, lastName: true } },
                    contact: { select: { firstName: true, lastName: true } },
                    deal: { select: { title: true } }
                }
            });
            if (reminders.length === 0)
                return;
            console.log(`[ReminderService] Found ${reminders.length} due reminders.`);
            // 3. Send Emails & Update DB
            for (const reminder of reminders) {
                if (!reminder.user.email)
                    continue;
                const ref = reminder.lead ? `Lead: ${reminder.lead.firstName} ${reminder.lead.lastName}` :
                    reminder.contact ? `Contact: ${reminder.contact.firstName} ${reminder.contact.lastName}` :
                        reminder.deal ? `Deal: ${reminder.deal.title}` : 'General';
                const subject = `Reminder: ${reminder.title}`;
                const html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #007AFF;">Reminder: ${reminder.title}</h2>
                        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Type:</strong> ${reminder.type}</p>
                            <p style="margin: 5px 0;"><strong>Related To:</strong> ${ref}</p>
                            <p style="margin: 5px 0;"><strong>Due Date:</strong> ${reminder.dueDate ? new Date(reminder.dueDate).toLocaleString() : 'No Due Date'}</p>
                        </div>
                        ${reminder.description ? `<p style="margin-bottom: 20px;"><strong>Note:</strong><br/>${reminder.description}</p>` : ''}
                        
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/activities" 
                           style="display: inline-block; background-color: #007AFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                           View in CRM
                        </a>
                    </div>
                `;
                try {
                    await transporter.sendMail({
                        from: config.from || config.user,
                        to: reminder.user.email,
                        subject,
                        html,
                    });
                    // Mark as sent
                    await index_1.prisma.activity.update({
                        where: { id: reminder.id },
                        data: { reminderSent: true }
                    });
                    console.log(`[ReminderService] Email sent to ${reminder.user.email} for activity "${reminder.title}"`);
                }
                catch (err) {
                    console.error(`[ReminderService] Failed to send email for activity ${reminder.id}:`, err);
                }
            }
        }
        catch (error) {
            console.error('[ReminderService] Error:', error);
        }
    });
    console.log('[ReminderService] Started. Checking every minute.');
};
exports.startReminderService = startReminderService;
//# sourceMappingURL=reminder.service.js.map