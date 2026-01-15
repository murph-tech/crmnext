# 📖 คู่มือ Deploy แบบใช้ IP Address (ไม่มี Domain)

คู่มือนี้สำหรับ Deploy ขึ้น Server Ubuntu และเข้าใช้งานผ่าน IP จริงโดยตรง (เช่น `http://123.45.67.89`)

---

## 1. เตรียม Server และติดตั้งโปรแกรม
Login เข้า Server และรันคำสั่งเหล่านี้ (ทีละบรรทัด):

```bash
# 1. อัปเดตเครื่อง
apt update && apt upgrade -y

# 2. ติดตั้ง Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs build-essential

# 3. ติดตั้ง Nginx และ PM2
apt install -y nginx
npm install -g pm2
```

---

## 2. อัปโหลดและติดตั้ง App

```bash
# 1. ไปที่ folder เว็บ
cd /var/www

# 2. Clone โปรเจค
git clone https://github.com/your-username/crm-next.git
cd crm-next

# 3. ติดตั้ง Library
npm ci
cd backend
npm ci
cd ..
```

---

## 3. ตั้งค่า Environment Variables (สำคัญ!)

ต้องตั้งค่าให้ถูกต้องเพื่อให้ Frontend คุยกับ Backend ผ่าน IP ได้

### 3.1 ตั้งค่า Backend
```bash
nano backend/.env
```
ใส่ค่าดังนี้ (เปลี่ยน `YOUR_SERVER_IP` เป็นเลข IP ของเครื่องคุณ):
```env
PORT=4000
NODE_ENV=production
DATABASE_URL="file:./crm_prod.db"
JWT_SECRET=ใส่รหัสลับยาวๆตรงนี้

# ตั้งเป็น IP ของเครื่อง
FRONTEND_URL=http://YOUR_SERVER_IP
```

### 3.2 ตั้งค่า Frontend
```bash
nano .env.local
```
ใส่ค่าดังนี้ (ต้องมี `/api` ต่อท้าย):
```env
# ตั้งเป็น IP ของเครื่อง และต่อท้ายด้วย /api
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP/api
```

---

## 4. Build และ Run ระบบ

```bash
# 1. สร้าง Database (ใน folder backend)
cd backend
npx prisma generate
npx prisma db push

# 2. Build Backend
npm run build

# 3. Build Frontend (กลับไป folder หลัก)
cd ..
npm run build

# 4. รันด้วย PM2
pm2 start ecosystem.config.json
pm2 save
pm2 startup
```

---

## 5. ตั้งค่า Nginx (เพื่อให้เข้าผ่าน IP ได้)

เราจะตั้งค่าให้:
- เข้า `http://IP` -> ไปหา Frontend
- เข้า `http://IP/api` -> ไปหา Backend

1. **สร้างไฟล์ Config**
   ```bash
   nano /etc/nginx/sites-available/crm-ip
   ```

2. **ใส่เนื้อหานี้ลงไป**
   ```nginx
   server {
       listen 80;
       server_name _;  # รับทุก IP/Domain

       # 1. Frontend (Next.js)
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # 2. Backend (Express API) - เข้าผ่าน /api
       location /api {
           # ตัด /api ออกก่อนส่งไปหา Backend
           rewrite ^/api/(.*) /$1 break;
           
           proxy_pass http://localhost:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   กด `Ctrl+X` -> `Y` -> `Enter` เพื่อบันทึก

3. **เปิดใช้งาน**
   ```bash
   # ลบ default config
   rm /etc/nginx/sites-enabled/default
   
   # ลิงก์ config ใหม่
   ln -s /etc/nginx/sites-available/crm-ip /etc/nginx/sites-enabled/
   
   # เช็คความถูกต้องและ Restart
   nginx -t
   systemctl restart nginx
   ```

---

## ✅ เสร็จสิ้น!
เปิด Browser แล้วเข้า `http://YOUR_SERVER_IP` ได้เลยครับ
(หมายเหตุ: การเข้าผ่าน IP จะไม่มีแม่กุญแจสีเขียว หรือ HTTPS ซึ่งถือว่าปกตินะครับ)
