# 📖 คู่มือ Deploy: CRM Next (Simple & IP Address)

คู่มือนี้นำเสนอวิธีที่ **ง่ายที่สุด** ในการนำระบบ CRM ขึ้นใช้งานจริง
- ✅ **ใช้ Ubuntu Server** ปกติ
- ✅ **เข้าใช้งานผ่าน IP Address** (ไม่ต้องจดโดเมน)
- ✅ **ใช้ SQLite** (ไม่ต้องติดตั้ง Database Server)
- ✅ **ใช้ PM2** (ไม่ต้องใช้ Docker)

---

## 1. เตรียม Server

Login เข้า Server ของคุณด้วย SSH:
```bash
ssh root@your-server-ip
```

รันคำสั่งติดตั้ง Software (ทีละบรรทัด):
```bash
# 1. อัปเดตระบบ
apt update && apt upgrade -y

# 2. ติดตั้ง Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs build-essential

# 3. ติดตั้ง Nginx (เว็บเซิร์ฟเวอร์)
apt install -y nginx

# 4. ติดตั้ง PM2 (ตัวช่วยรันโปรแกรม)
npm install -g pm2
```

---

## 2. อัปโหลดโค้ด

1. **ไปที่โฟลเดอร์เว็บ**
   ```bash
   cd /var/www
   ```

2. **Clone โค้ดจาก Git** (หรือใช้วิธีโยนไฟล์ผ่าน FileZilla ก็ได้)
   ```bash
   git clone https://github.com/your-username/crm-next.git
   cd crm-next
   ```

3. **ติดตั้ง Library**
   ```bash
   npm ci               # Frontend
   cd backend && npm ci # Backend
   cd ..
   ```

---

## 3. ตั้งค่าการเชื่อมต่อ (สำคัญที่สุด! ⭐)

ต้องแก้ IP ให้ตรงกับ Server ของคุณ เพื่อให้ระบบคุยกันรู้เรื่อง

### 3.1 ตั้งค่า Backend
```bash
nano backend/.env
```
Copy ข้อมูลนี้ไปวาง (แก้ `YOUR_SERVER_IP` เป็นเลข IP ของคุณ):
```env
PORT=4000
NODE_ENV=production
DATABASE_URL="file:./crm_prod.db"
JWT_SECRET=ตั้งรหัสลับยาวๆมั่วๆได้เลย
FRONTEND_URL=http://YOUR_SERVER_IP
```
(กด `Ctrl+X` -> `Y` -> `Enter` เพื่อบันทึก)

### 3.2 ตั้งค่า Frontend
```bash
nano .env.local
```
Copy ข้อมูลนี้ไปวาง (**ห้ามลืม /api ต่อท้าย**):
```env
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP/api
```
(กด `Ctrl+X` -> `Y` -> `Enter` เพื่อบันทึก)

---

## 4. Build และ สร้าง Database

รันคำสั่งทีละบรรทัด:

```bash
# 1. เตรียม Database
cd backend
npx prisma generate
npx prisma db push   # สร้างไฟล์ Database

# 2. Build Backend
npm run build

# 3. Build Frontend
cd ..
npm run build
```

---

## 5. รันระบบด้วย PM2

```bash
# เริ่มรันโปรแกรม
pm2 start ecosystem.config.json

# บันทึกเพื่อให้รันอัตโนมัติถ้าเครื่องรีสตาร์ท
pm2 save
pm2 startup
```

---

## 6. ตั้งค่าทางเข้าเว็บ (Nginx)

เราจะตั้งค่าให้เข้าผ่าน IP ได้เลย:
- `http://IP` -> เว็บ Frontend
- `http://IP/api` -> เว็บ Backend

1. **สร้างไฟล์ Config**
   ```bash
   nano /etc/nginx/sites-available/crm-ip
   ```

2. **วางโค้ดนี้ลงไป**
   ```nginx
   server {
       listen 80;
       server_name _;

       # Frontend
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Backend (เรียกผ่าน /api)
       location /api {
           rewrite ^/api/(.*) /$1 break;  # ตัด /api ออกก่อนส่งไป Backend
           proxy_pass http://localhost:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **เปิดใช้งาน**
   ```bash
   rm /etc/nginx/sites-enabled/default
   ln -s /etc/nginx/sites-available/crm-ip /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

---

## ✅ เสร็จเรียบร้อย!
เปิด Browser แล้วพิมพ์ IP ของคุณ (เช่น `http://159.22.33.44`) ได้เลย
ระบบพร้อมใช้งานทันที 🎉
