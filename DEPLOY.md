# 🚀 CRM Next - คู่มือการ Deploy บน Ubuntu Server

## สารบัญ
1. [ข้อกำหนดของ Server](#ข้อกำหนดของ-server)
2. [เตรียม Server เบื้องต้น](#เตรียม-server-เบื้องต้น)
3. [ติดตั้ง Dependencies](#ติดตั้ง-dependencies)
4. [ตั้งค่า Database](#ตั้งค่า-database)
5. [อัปโหลดและติดตั้ง Application](#อัปโหลดและติดตั้ง-application)
6. [ตั้งค่า Environment Variables](#ตั้งค่า-environment-variables)
7. [Build และ Deploy](#build-และ-deploy)
8. [ตั้งค่า Nginx](#ตั้งค่า-nginx)
9. [ติดตั้ง SSL Certificate](#ติดตั้ง-ssl-certificate)
10. [การจัดการ Service](#การจัดการ-service)
11. [Troubleshooting](#troubleshooting)

---

## ข้อกำหนดของ Server

### Hardware ขั้นต่ำ
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 Core | 2+ Cores |
| RAM | 2 GB | 4+ GB |
| Storage | 20 GB SSD | 50+ GB SSD |
| Network | 100 Mbps | 1 Gbps |

### Software Requirements
- **OS:** Ubuntu 22.04 LTS หรือใหม่กว่า
- **Node.js:** 20.x LTS
- **PostgreSQL:** 15+ (แนะนำ 16)
- **Nginx:** 1.18+
- **PM2:** Latest

### Ports ที่ต้องเปิด
| Port | Service |
|------|---------|
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS |
| 5432 | PostgreSQL (ภายในเท่านั้น) |

---

## เตรียม Server เบื้องต้น

### 1. Login เข้า Server
```bash
ssh root@your-server-ip
```

### 2. Update System
```bash
apt update && apt upgrade -y
```

### 3. ตั้งค่า Timezone
```bash
timedatectl set-timezone Asia/Bangkok
```

### 4. สร้าง User สำหรับ Application
```bash
# สร้าง user
adduser crmapp

# เพิ่ม sudo permission (optional)
usermod -aG sudo crmapp
```

---

## ติดตั้ง Dependencies

### Option A: ใช้ Auto Script (แนะนำ)
```bash
# อัปโหลด script ไปยัง server
scp scripts/server-setup.sh root@your-server-ip:/root/

# รัน script
ssh root@your-server-ip "chmod +x /root/server-setup.sh && /root/server-setup.sh"
```

### Option B: ติดตั้งแบบ Manual

#### 1. ติดตั้ง Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version  # ควรแสดง v20.x
```

#### 2. ติดตั้ง PostgreSQL 16
```bash
# Add PostgreSQL repository
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
apt-get update
apt-get install -y postgresql-16 postgresql-contrib-16

# ตรวจสอบ
systemctl status postgresql
```

#### 3. ติดตั้ง PM2
```bash
npm install -g pm2
```

#### 4. ติดตั้ง Nginx
```bash
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
```

---

## ตั้งค่า Database

### 1. เข้า PostgreSQL
```bash
sudo -u postgres psql
```

### 2. สร้าง Database และ User
```sql
-- สร้าง database
CREATE DATABASE crm_db;

-- สร้าง user (เปลี่ยน password!)
CREATE USER crmuser WITH ENCRYPTED PASSWORD 'YourStrongPassword123!';

-- ให้สิทธิ์
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crmuser;
ALTER DATABASE crm_db OWNER TO crmuser;

-- สำหรับ PostgreSQL 15+ ต้องให้สิทธิ์ schema ด้วย
\c crm_db
GRANT ALL ON SCHEMA public TO crmuser;

-- ออกจาก psql
\q
```

### 3. ทดสอบ Connection
```bash
psql -h localhost -U crmuser -d crm_db
```

---

## อัปโหลดและติดตั้ง Application

### Option A: ใช้ Git (แนะนำ)
```bash
# Switch ไปใช้ user crmapp
su - crmapp

# Clone repository
cd /var/www
git clone https://github.com/murph-tech/crmnext.git
cd crm-next
```

### Option B: อัปโหลดด้วย SCP/SFTP
```bash
# จากเครื่อง local
cd /path/to/next-crm

# สร้าง archive (ไม่รวม node_modules)
tar --exclude='node_modules' --exclude='.next' --exclude='.git' \
    -czvf crm-next.tar.gz .

# อัปโหลดไปยัง server
scp crm-next.tar.gz crmapp@your-server-ip:/var/www/

# บน server
ssh crmapp@your-server-ip
cd /var/www
mkdir crm-next && cd crm-next
tar -xzvf ../crm-next.tar.gz
rm ../crm-next.tar.gz
```

---

## ตั้งค่า Environment Variables

### 1. สร้างไฟล์ .env สำหรับ Backend
```bash
cd /var/www/crm-next/backend
cp .env.example .env
nano .env
```

แก้ไขค่าต่อไปนี้:
```env
# Database
DATABASE_URL=postgresql://crmuser:YourStrongPassword123!@localhost:5432/crm_db?schema=public

# Security - สร้าง JWT Secret ใหม่
JWT_SECRET=your-super-secret-key-change-this

# Server
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://crm.yourdomain.com
```

### 2. สร้างไฟล์ .env.local สำหรับ Frontend
```bash
cd /var/www/crm-next
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.crm.yourdomain.com
```

### 3. Generate JWT Secret (สำคัญ!)
```bash
openssl rand -base64 64
# คัดลอกผลลัพธ์ไปใส่ใน JWT_SECRET
```

---

## Build และ Deploy

### 1. ติดตั้ง Dependencies
```bash
cd /var/www/crm-next

# Frontend
npm ci

# Backend
cd backend
npm ci
```

### 2. Build Application
```bash
# Build backend
cd /var/www/crm-next/backend
npm run build

# Generate Prisma Client
npx prisma generate

# Push database schema
npx prisma db push

# (Optional) Seed ข้อมูลเริ่มต้น
npm run db:seed

# Build frontend
cd /var/www/crm-next
npm run build
```

### 3. Start ด้วย PM2
```bash
cd /var/www/crm-next

# ใช้ ecosystem config
pm2 start ecosystem.config.json

# หรือ start แบบ manual
pm2 start backend/dist/index.js --name crm-backend
pm2 start npm --name crm-frontend -- start

# บันทึก configuration
pm2 save

# ตั้งค่าให้ start อัตโนมัติเมื่อ reboot
pm2 startup systemd -u crmapp --hp /home/crmapp
# รันคำสั่งที่แสดงออกมา
```

---

## ตั้งค่า Nginx

### 1. คัดลอก Configuration
```bash
sudo cp /var/www/crm-next/nginx.conf /etc/nginx/sites-available/crm-next
```

### 2. แก้ไข Domain Name
```bash
sudo nano /etc/nginx/sites-available/crm-next
# เปลี่ยน crm.yourdomain.com เป็น domain จริง
# เปลี่ยน api.crm.yourdomain.com เป็น domain จริง
```

### 3. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/crm-next /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # ลบ default config

# ทดสอบ configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## ติดตั้ง SSL Certificate

### ใช้ Let's Encrypt (ฟรี)
```bash
# ติดตั้ง Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# ขอ certificate (เปลี่ยน domain และ email)
sudo certbot --nginx -d crm.yourdomain.com -d api.crm.yourdomain.com \
    --email your-email@example.com --agree-tos --non-interactive

# ทดสอบ auto-renewal
sudo certbot renew --dry-run
```

---

## การจัดการ Service

### PM2 Commands
```bash
# ดูสถานะ
pm2 status

# ดู logs
pm2 logs
pm2 logs crm-backend
pm2 logs crm-frontend

# Restart
pm2 restart all
pm2 restart crm-backend
pm2 restart crm-frontend

# Stop
pm2 stop all

# Monitor
pm2 monit
```

### Nginx Commands
```bash
# ทดสอบ config
sudo nginx -t

# Reload
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# ดู logs
sudo tail -f /var/log/nginx/error.log
```

### PostgreSQL Commands
```bash
# Status
sudo systemctl status postgresql

# Restart
sudo systemctl restart postgresql

# Backup database
pg_dump -U crmuser -h localhost crm_db > backup_$(date +%Y%m%d).sql
```

---

## Troubleshooting

### ปัญหา: Application ไม่ start

**ตรวจสอบ:**
```bash
# ดู PM2 logs
pm2 logs --err

# ตรวจสอบ port
sudo netstat -tlnp | grep -E '3000|4000'

# ตรวจสอบ environment
cat /var/www/crm-next/backend/.env
```

### ปัญหา: Database connection failed

**ตรวจสอบ:**
```bash
# ทดสอบ connection
psql -h localhost -U crmuser -d crm_db

# ตรวจสอบ PostgreSQL status
sudo systemctl status postgresql

# ตรวจสอบ DATABASE_URL format
# postgresql://user:password@host:port/database?schema=public
```

### ปัญหา: 502 Bad Gateway

**แก้ไข:**
```bash
# ตรวจสอบว่า app ทำงานอยู่
pm2 status

# Restart app
pm2 restart all

# ตรวจสอบ Nginx config
sudo nginx -t
sudo systemctl reload nginx
```

### ปัญหา: Permission denied

**แก้ไข:**
```bash
# แก้ไข ownership
sudo chown -R crmapp:crmapp /var/www/crm-next

# แก้ไข permission
chmod -R 755 /var/www/crm-next
```

---

## Checklist ก่อน Go-Live

- [ ] ตั้งค่า `JWT_SECRET` ที่แข็งแกร่ง
- [ ] ตั้งค่า Database password ที่ปลอดภัย
- [ ] ติดตั้ง SSL Certificate
- [ ] ตั้งค่า Firewall (ufw)
- [ ] ตั้งค่า PM2 startup
- [ ] ทดสอบ Login/Logout
- [ ] ทดสอบ CRUD operations
- [ ] ตั้งค่า Backup database
- [ ] ตั้งค่า Monitoring (optional)

---

## Quick Reference

| Task | Command |
|------|---------|
| Start all | `pm2 start all` |
| Stop all | `pm2 stop all` |
| Restart all | `pm2 restart all` |
| View logs | `pm2 logs` |
| Update app | `git pull && npm ci && npm run build && pm2 restart all` |
| Backup DB | `pg_dump -U crmuser crm_db > backup.sql` |
| Check status | `pm2 status && sudo systemctl status nginx postgresql` |

---

## Support

หากพบปัญหาในการ deploy กรุณาตรวจสอบ:
1. PM2 logs: `pm2 logs --err`
2. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-16-main.log`
