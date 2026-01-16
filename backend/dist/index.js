"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const leads_routes_1 = __importDefault(require("./routes/leads.routes"));
const contacts_routes_1 = __importDefault(require("./routes/contacts.routes"));
const deals_routes_1 = __importDefault(require("./routes/deals.routes"));
const activities_routes_1 = __importDefault(require("./routes/activities.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const products_routes_1 = __importDefault(require("./routes/products.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
// Middleware
const error_middleware_1 = require("./middleware/error.middleware");
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
const PORT = process.env.PORT || 4000;
// Middleware
app.use((0, cors_1.default)({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
    ],
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/leads', leads_routes_1.default);
app.use('/api/contacts', contacts_routes_1.default);
app.use('/api/deals', deals_routes_1.default);
app.use('/api/activities', activities_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/products', products_routes_1.default);
app.use('/api/settings', settings_routes_1.default);
app.use('/api/users', users_routes_1.default);
// Error handling
app.use(error_middleware_1.errorHandler);
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
//# sourceMappingURL=index.js.map