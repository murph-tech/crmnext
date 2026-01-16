#!/bin/bash

# ==========================================
# 🚀 CRM Next - Server-Side Auto Installer
# ==========================================
# วิธีใช้งาน:
# 1. SSH เข้าไปที่ Server Ubuntu ของคุณ
# 2. คัดลอกไฟล์นี้ไปวาง หรือสร้างไฟล์ด้วย nano install.sh
# 3. รันคำสั่ง: chmod +x install.sh && ./install.sh
# ==========================================

# ตรวจสอบสิทธิ์ Root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ กรุณารันด้วยสิทธิ์ root (sudo ./install.sh)"
  exit 1
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   CRM Next - Server Installer            ${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""

# 1. ตั้งค่าพื้นฐาน
read -p "$(echo -e $YELLOW"Server Domain or IP: "$NC)" DOMAIN_NAME
INSTALL_DIR="/var/www/crm-next"
REPO_URL="https://github.com/murph-tech/crmnext.git"

echo ""
echo -e "${GREEN}[1/8] Updating System...${NC}"
apt-get update && apt-get upgrade -y
apt-get install -y curl git unzip build-essential nginx

# 2. ติดตั้ง Node.js 20
echo -e "${GREEN}[2/8] Installing Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    npm install -g pm2
else
    echo "✓ Node.js already installed"
fi

# 3. เตรียม Folder และ Code
echo -e "${GREEN}[3/8] Setting up Application Code...${NC}"
mkdir -p $INSTALL_DIR

if [ -d "$INSTALL_DIR/.git" ]; then
    echo "⬇️ Updating existing code..."
    cd $INSTALL_DIR
    git pull origin main
else
    echo "⬇️ Cloning repository..."
    git clone $REPO_URL $INSTALL_DIR
    cd $INSTALL_DIR
fi

# 4. ติดตั้ง Backend
echo -e "${GREEN}[4/8] Setting up Backend...${NC}"
cd $INSTALL_DIR/backend
npm ci

# สร้าง .env สำหรับ Backend (ใช้ SQLite เพื่อความง่าย)
if [ ! -f ".env" ]; then
    echo "📝 Creating backend .env..."
    cat > .env << EOF
DATABASE_URL="file:./prod.db"
JWT_SECRET="$(openssl rand -base64 32)"
PORT=4000
NODE_ENV=production
FRONTEND_URL="http://$DOMAIN_NAME"
EOF
fi

# Build & DB Setup
npx prisma generate
npx prisma db push
npm run build
# Seed optional: npm run db:seed

# 5. ติดตั้ง Frontend
echo -e "${GREEN}[5/8] Setting up Frontend...${NC}"
cd $INSTALL_DIR
npm ci

# สร้าง .env.local สำหรับ Frontend
if [ ! -f ".env.local" ]; then
    echo "📝 Creating frontend .env.local..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL="http://$DOMAIN_NAME/api"
EOF
fi

# Build Frontend
npm run build

# 6. ตั้งค่า PM2
echo -e "${GREEN}[6/8] Configuring Process Manager (PM2)...${NC}"
pm2 delete crm-backend crm-frontend 2>/dev/null || true

# Start Backend
cd $INSTALL_DIR
pm2 start backend/dist/index.js --name crm-backend

# Start Frontend
pm2 start npm --name crm-frontend -- start

pm2 save
pm2 startup | bash

# 7. ตั้งค่า Nginx
echo -e "${GREEN}[7/8] Configuring Web Server (Nginx)...${NC}"
cat > /etc/nginx/sites-available/crm-next << EOF
server {
    listen 8090;
    server_name $DOMAIN_NAME;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable Site
ln -sf /etc/nginx/sites-available/crm-next /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl reload nginx

# 8. สรุปผล
echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   ✅ Installation Complete!              ${NC}"
echo -e "${GREEN}==========================================${NC}"
echo -e "Web App: http://$DOMAIN_NAME:8090"
echo -e "API:     http://$DOMAIN_NAME:8090/api"
echo ""
