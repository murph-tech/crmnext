# Simple Deployment (SQLite)

1. Server Setup
- Install Node.js 20
- Install Nginx
- Install PM2

2. Application Setup
- Clone repo
- Run `npm ci` in root and backend
- In backend/.env set: DATABASE_URL="file:./crm_prod.db"
- Run `npx prisma db push` (Creates DB file)
- Build both frontend and backend

3. Run
- `pm2 start ecosystem.config.json`
- `pm2 save` & `pm2 startup`

4. Nginx & SSL
- Use provided nginx.conf
- Use certbot for SSL
