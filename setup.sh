#!/bin/bash

# --- Configuration ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== CRM Server Setup & Upgrade Script ===${NC}"
echo -e "${YELLOW}Please select operation mode:${NC}"
echo "1) Fresh Installation (New Setup)"
echo "2) Update Existing Application (Preserve Data)"
read -p "Enter Choice (1 or 2): " MODE

if [ "$MODE" = "2" ]; then
    # --- UPDATE MODE ---
    echo -e "${YELLOW}--- UPDATE MODE ---${NC}"
    read -p "Enter App Directory Name (existing folder): " APP_DIR
    
    if [ ! -d "$APP_DIR" ]; then
        echo "Error: Directory $APP_DIR does not exist."
        exit 1
    fi

    echo -e "Targetting: $APP_DIR"
    echo -e "${YELLOW}Warning: This will pull the latest code and restart services.${NC}"
    echo -e "Database data and .env files will be PRESERVED."
    read -p "Press ENTER to continue..."

    cd $APP_DIR
    
    echo -e "${GREEN}[1/4] Updating Source Code...${NC}"
    git fetch --all
    git reset --hard origin/main
    
    if [ -f "backend/.env" ]; then
        export $(grep -v '^#' backend/.env | xargs)
    fi
    BACKEND_PORT=${PORT:-4000}

    echo -e "${GREEN}[2/4] Updating Backend...${NC}"
    cd backend
    npm install
    npx prisma generate
    npx prisma migrate deploy
    npm run build
    cd ..

    echo -e "${GREEN}[3/4] Updating Frontend...${NC}"
    rm -rf .next
    npm install
    npm run build

    echo -e "${GREEN}[4/4] Restarting Services...${NC}"
    pm2 restart "${APP_DIR}-backend" || (cd backend && PORT=$BACKEND_PORT pm2 start npm --name "${APP_DIR}-backend" -- run start && cd ..)
    pm2 restart "${APP_DIR}-frontend" || (PORT=3001 pm2 start npm --name "${APP_DIR}-frontend" -- run start)
    
    pm2 save
    echo -e "${GREEN}Update Complete!${NC}"
    exit 0

else
    # --- FRESH INSTALL MODE ---
    echo -e "${YELLOW}--- FRESH INSTALLATION MODE ---${NC}"
    read -p "1. Domain Name or IP Address (e.g., crm.example.com or 72.60.209.145): " DOMAIN_NAME
    read -p "2. Nginx Port (e.g., 8090): " NGINX_PORT
    read -p "3. Frontend Internal Port (e.g., 3001): " APP_PORT
    read -p "4. Backend Port (e.g., 4000): " BACKEND_PORT
    read -p "5. Git Repository URL (SSH): " GIT_REPO
    read -p "6. Database Name (e.g., crm_db): " DB_NAME
    read -p "7. Database User: " DB_USER
    read -s -p "8. Database Password: " DB_PASS
    echo ""
    read -p "9. App Directory Name (e.g., crmnext): " APP_DIR

    echo -e "${GREEN}[1/8] Updating System Packages...${NC}"
    sudo apt update
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs build-essential
    fi
    if ! command -v psql &> /dev/null; then
        sudo apt install -y postgresql postgresql-contrib
    fi
    if ! command -v nginx &> /dev/null; then
        sudo apt install -y nginx
    fi

    echo -e "${GREEN}[2/8] Setting up Database...${NC}"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database might already exist"
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';" 2>/dev/null || echo "User might already exist"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"

    echo -e "${GREEN}[3/8] Handling Source Code...${NC}"
    if [ ! -f ~/.ssh/id_ed25519.pub ]; then
        ssh-keygen -t ed25519 -C "deploy@vps" -f ~/.ssh/id_ed25519 -N ""
        eval "$(ssh-agent -s)"
        ssh-add ~/.ssh/id_ed25519
        echo -e "${YELLOW}ADD THIS KEY TO GITHUB:${NC}"
        cat ~/.ssh/id_ed25519.pub
        read -p "Press ENTER after adding key to GitHub..."
    fi

    if [ -d "$APP_DIR" ]; then
        echo "Directory exists, removing..."
        rm -rf $APP_DIR
    fi
    
    git clone $GIT_REPO $APP_DIR
    cd $APP_DIR

    echo -e "${GREEN}[4/8] Installing Backend...${NC}"
    cd backend
    cat > .env << EOF
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"
PORT=$BACKEND_PORT
FRONTEND_URL="http://$DOMAIN_NAME:$NGINX_PORT"
JWT_SECRET="$(openssl rand -base64 32)"
EOF

    npm install
    npx prisma generate
    npx prisma db push --force-reset
    npm run db:seed
    npm run build
    cd ..

    echo -e "${GREEN}[5/8] Installing Frontend...${NC}"
    cat > .env.production << EOF
NEXT_PUBLIC_API_URL="http://$DOMAIN_NAME:$NGINX_PORT/api"
PORT=$APP_PORT
EOF

    npm install
    npm run build

    echo -e "${GREEN}[6/8] Starting Services with PM2...${NC}"
    sudo npm install -g pm2
    
    cd backend
    PORT=$BACKEND_PORT pm2 start npm --name "${APP_DIR}-backend" -- run start
    cd ..
    PORT=$APP_PORT pm2 start npm --name "${APP_DIR}-frontend" -- run start
    pm2 save
    pm2 startup

    echo -e "${GREEN}[7/8] Configuring Nginx (Port $NGINX_PORT)...${NC}"
    sudo bash -c "cat > /etc/nginx/sites-available/$APP_DIR << 'EOF'
server {
    listen $NGINX_PORT;
    server_name $DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:$BACKEND_PORT/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF"
    sudo ln -sfn /etc/nginx/sites-available/$APP_DIR /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx

    echo -e "${GREEN}[8/8] Installation Complete!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo -e "App URL: ${YELLOW}http://$DOMAIN_NAME:$NGINX_PORT${NC}"
    echo -e "API URL: ${YELLOW}http://$DOMAIN_NAME:$NGINX_PORT/api${NC}"
    echo ""
    echo -e "${GREEN}Default Login Credentials:${NC}"
    echo -e "   Username: ${YELLOW}admin${NC}"
    echo -e "   Password: ${YELLOW}crm@123${NC}"
    echo -e "${GREEN}============================================${NC}"
fi
