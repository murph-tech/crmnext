#!/bin/bash
# ===========================================
# CRM Next - Deployment Script
# Run as crmapp user in /var/www/crm-next
# ===========================================

set -e

APP_DIR="/var/www/crm-next"
cd $APP_DIR

echo "🚀 Starting CRM Next deployment..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# ===========================================
# Frontend Deployment
# ===========================================
echo "📦 Installing frontend dependencies..."
npm ci --production=false

echo "🔨 Building frontend..."
npm run build

# ===========================================
# Backend Deployment
# ===========================================
echo "📦 Installing backend dependencies..."
cd $APP_DIR/backend
npm ci --production=false

echo "🗄️  Generating Prisma Client..."
npx prisma generate

echo "🔨 Building backend..."
npm run build

echo "🗄️  Pushing database schema..."
npx prisma db push

# Optional: Seed database (first time only)
# npm run db:seed

# ===========================================
# Start/Restart with PM2
# ===========================================
cd $APP_DIR

echo "🔄 Starting services with PM2..."

# Stop existing processes
pm2 delete crm-frontend 2>/dev/null || true
pm2 delete crm-backend 2>/dev/null || true

# Start backend
pm2 start backend/dist/index.js --name crm-backend \
    --env production \
    --max-memory-restart 500M

# Start frontend
pm2 start npm --name crm-frontend -- start

# Save PM2 configuration
pm2 save

# Setup PM2 startup (run once)
# pm2 startup systemd -u crmapp --hp /home/crmapp

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Check status: pm2 status"
echo "View logs: pm2 logs"
echo ""
