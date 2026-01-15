# Simple Deployment Guide (SQLite)

## Overview
Deploy CRM Next on Ubuntu using SQLite (no database server required) and PM2.

## 1. Install Requirements
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Nginx & PM2
apt-get install -y nginx
npm install -g pm2
```

## 2. Setup App
```bash
cd /var/www
git clone <your-repo-url> crm-next
cd crm-next

# Install deps
npm ci
cd backend && npm ci && cd ..
```

## 3. Configure
Create `backend/.env`:
```env
PORT=4000
NODE_ENV=production
DATABASE_URL="file:./prod.db"
JWT_SECRET=super_secret
FRONTEND_URL=https://your-domain.com
```

Create `.env.local` (root):
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

## 4. Build & Initialize DB
```bash
cd backend
npx prisma generate
npx prisma db push
npm run build

cd ..
npm run build
```

## 5. Start
```bash
pm2 start ecosystem.config.json
pm2 save
pm2 startup
```
