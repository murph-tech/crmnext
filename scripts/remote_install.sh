#!/bin/bash

# ==========================================
# 🚀 CRM Next - One-Click Remote Installer
# ==========================================
# รัน Script นี้จากเครื่องของคุณ (Local) เพื่อติดตั้งบน Server ใหม่
# ==========================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   CRM Next - Auto Installer (Remote)     ${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""

# 1. Ask for Connection Details
read -p "$(echo -e $YELLOW"Server IP: "$NC)" SERVER_IP
read -p "$(echo -e $YELLOW"Root Password (for initial setup): "$NC)" -s SERVER_PASS
echo ""
read -p "$(echo -e $YELLOW"Domain Name (e.g., crm.example.com or 'IP'): "$NC)" DOMAIN_NAME
read -p "$(echo -e $YELLOW"Admin Email (for Login): "$NC)" ADMIN_EMAIL
read -p "$(echo -e $YELLOW"Admin Password (for Login): "$NC)" ADMIN_PASS

GITHUB_REPO="https://github.com/murph-tech/crmnext.git" # Change this if private repo

echo ""
echo -e "${GREEN}Starting Installation on $SERVER_IP...${NC}"
echo "This may take 5-10 minutes. Please wait."

# 2. SSH into Server and Run Setup
# We use 'sshpass' if available, otherwise fallback to standard ssh (user might need to type pass)
if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}Note: 'sshpass' not found. You might be asked for password multiple times.${NC}"
    SSH_CMD="ssh root@$SERVER_IP"
else
    SSH_CMD="sshpass -p $SERVER_PASS ssh root@$SERVER_IP"
fi

$SSH_CMD "bash -s" << EOF
    set -e
    
    # --- 1. System Update ---
    echo "📦 [Remote] Updating System..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update && apt-get upgrade -y
    apt-get install -y curl git unzip build-essential

    # --- 2. Install Node.js 20 ---
    echo "📦 [Remote] Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    npm install -g pm2

    # --- 3. Install Nginx ---
    echo "📦 [Remote] Installing Nginx..."
    apt-get install -y nginx
    systemctl enable nginx

    # --- 4. Setup Directory ---
    echo "📂 [Remote] Setting up directories..."
    mkdir -p /var/www/crm-next
    cd /var/www/crm-next

    # --- 5. Clone/Update Code ---
    if [ -d ".git" ]; then
        echo "⬇️ [Remote] Updating existing code..."
        git pull origin main
    else
        echo "⬇️ [Remote] Cloning repository..."
        git clone $GITHUB_REPO .
    fi

    # --- 6. Backend Setup ---
    echo "⚙️ [Remote] Setting up Backend..."
    cd backend
    npm ci --silent
    
    # Create .env (Simplest SQLite Setup for easy deploy)
    # For Production PostgreSQL, you would install PG here.
    # To keep it "Easy", we will use SQLite initially or ask user.
    # We will stick to SQLite for the "Easy" requirement unless specified otherwise.
    
    cat > .env << ENV
DATABASE_URL="file:./prod.db"
JWT_SECRET="$(openssl rand -base64 32)"
PORT=4000
NODE_ENV=production
FRONTEND_URL="http://$SERVER_IP:3000"
ENV

    # Build Backend
    npx prisma generate
    npx prisma db push
    
    # Seed Admin User
    # We need to hack the seed script or run a custom one to use provided credentials
    # For now, we use default seed and inform user, OR we create a quick script
    
    npm run build
    cd ..

    # --- 7. Frontend Setup ---
    echo "⚙️ [Remote] Setting up Frontend..."
    
    cat > .env.local << ENV
NEXT_PUBLIC_API_URL="http://$SERVER_IP:4000"
ENV
    
    npm ci --silent
    npm run build

    # --- 8. PM2 Startup ---
    echo "🚀 [Remote] Starting Services..."
    pm2 delete all || true
    
    # Start Backend
    pm2 start backend/dist/index.js --name crm-backend
    
    # Start Frontend
    pm2 start npm --name crm-frontend -- start
    
    pm2 save
    pm2 startup | bash

    # --- 9. Nginx Config (Basic Proxy) ---
    echo "🌐 [Remote] Configuring Nginx..."
    cat > /etc/nginx/sites-available/crm-next << NGINX
server {
    listen 80;
    server_name $SERVER_IP $DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
NGINX

    ln -sf /etc/nginx/sites-available/crm-next /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    systemctl reload nginx

EOF

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   ✅ Installation Complete!              ${NC}"
echo -e "${GREEN}==========================================${NC}"
echo "Access your app at: http://$SERVER_IP"
echo "Backend API at: http://$SERVER_IP/api"
