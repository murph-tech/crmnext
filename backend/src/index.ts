import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db';
import helmet from 'helmet';
import hpp from 'hpp';
import { apiLimiter } from './middleware/security.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import leadsRoutes from './routes/leads.routes';
import contactsRoutes from './routes/contacts.routes';
import dealsRoutes from './routes/deals.routes';
import activitiesRoutes from './routes/activities.routes';
import dashboardRoutes from './routes/dashboard.routes';
import productsRoutes from './routes/products.routes';
import settingsRoutes from './routes/settings.routes';
import usersRoutes from './routes/users.routes';
import documentRoutes from './routes/documents.routes';
import { startReminderService } from './services/reminder.service';

// Middleware
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
// Force restart trigger

// Middleware
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
    ],
    credentials: true,
}));

// Security Middleware
app.use(helmet());
app.use(hpp());
app.use('/api', apiLimiter); // Apply global rate limit to API routes

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', documentRoutes);

// Error handling
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing database connection...');
    await prisma.$disconnect();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 CRM API running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

