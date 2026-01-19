#!/bin/bash

# --- CRM Next Setup & Upgrade Script ---
# Version: 2.0.0
# Date: 2026-01-19
# Features: Quotation System, Multi-language, Activity Logging

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_VERSION="2.0.0"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}     ${GREEN}CRM Next Server Setup & Upgrade Script${NC}                    ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Version: ${YELLOW}$APP_VERSION${NC}                                         ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Please select operation mode:${NC}"
echo "1) Fresh Installation (New Setup)"
echo "2) Update Existing Application (Preserve Data)"
echo "3) Migration Only (Database Schema Update)"
read -p "Enter Choice (1, 2, or 3): " MODE

if [ "$MODE" = "3" ]; then
    # --- MIGRATION ONLY ---
    echo -e "${YELLOW}--- DATABASE MIGRATION MODE ---${NC}"
    read -p "Enter App Directory Name (existing folder): " APP_DIR
    
    if [ ! -d "$APP_DIR" ]; then
        echo -e "${RED}Error: Directory $APP_DIR does not exist.${NC}"
        exit 1
    fi

    cd $APP_DIR/backend
    
    echo -e "${GREEN}Running database migrations...${NC}"
    npx prisma generate
    npx prisma migrate deploy 2>/dev/null || npx prisma db push
    
    echo -e "${GREEN}Restarting backend service...${NC}"
    pm2 restart "${APP_DIR}-backend"
    
    echo -e "${GREEN}Migration Complete!${NC}"
    exit 0

elif [ "$MODE" = "2" ]; then
    # --- UPDATE MODE ---
    echo -e "${YELLOW}--- UPDATE MODE ---${NC}"
    read -p "Enter App Directory Name (existing folder): " APP_DIR
    
    if [ ! -d "$APP_DIR" ]; then
        echo -e "${RED}Error: Directory $APP_DIR does not exist.${NC}"
        exit 1
    fi

    echo -e "Targetting: ${BLUE}$APP_DIR${NC}"
    echo -e "${YELLOW}Warning: This will pull the latest code and restart services.${NC}"
    echo -e "Database data and .env files will be ${GREEN}PRESERVED${NC}."
    read -p "Press ENTER to continue..."

    cd $APP_DIR
    
    echo -e "${GREEN}[1/5] Updating Source Code...${NC}"
    git stash 2>/dev/null || true
    git fetch --all
    git reset --hard origin/main
    
    if [ -f "backend/.env" ]; then
        export $(grep -v '^#' backend/.env | xargs)
    fi
    BACKEND_PORT=${PORT:-4000}

    echo -e "${GREEN}[2/5] Updating Backend...${NC}"
    cd backend
    
    # Backup database before migration
    if [ -f ".env" ]; then
        echo -e "${YELLOW}Creating database backup...${NC}"
        DB_URL=$(grep DATABASE_URL .env | cut -d '"' -f 2)
        DB_NAME=$(echo $DB_URL | sed 's/.*\/\([^?]*\).*/\1/')
        BACKUP_FILE="/tmp/${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S).sql"
        pg_dump -h localhost -U postgres $DB_NAME > $BACKUP_FILE 2>/dev/null || true
        if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
            echo -e "${GREEN}Backup saved: $BACKUP_FILE${NC}"
        fi
    fi
    
    npm install --legacy-peer-deps
    npx prisma generate
    
    # Safe migration - only apply migrations, don't reset
    echo -e "${YELLOW}Applying database migrations (safe mode)...${NC}"
    npx prisma migrate deploy 2>/dev/null
    MIGRATE_STATUS=$?
    
    if [ $MIGRATE_STATUS -ne 0 ]; then
        echo -e "${YELLOW}Migration deploy failed. Attempting safe schema sync...${NC}"
        # Use db push with no data loss protection
        npx prisma db push --skip-generate 2>&1 | head -20
        echo -e "${YELLOW}If data loss warning appeared, please restore from backup: $BACKUP_FILE${NC}"
    fi
    
    npm run build
    cd ..

    echo -e "${GREEN}[3/5] Updating Frontend...${NC}"
    rm -rf .next
    npm install --legacy-peer-deps
    npm run build
    
    # Copy static files for standalone
    if [ -d ".next/standalone" ]; then
        cp -r .next/static .next/standalone/.next/
        cp -r public .next/standalone/ 2>/dev/null || true
    fi

    echo -e "${GREEN}[4/5] Restarting Services...${NC}"
    pm2 delete "${APP_DIR}-backend" 2>/dev/null || true
    pm2 delete "${APP_DIR}-frontend" 2>/dev/null || true
    
    # Also try with common naming conventions
    pm2 delete "crmnext-backend" 2>/dev/null || true
    pm2 delete "crmnext-frontend" 2>/dev/null || true
    
    cd backend
    PORT=$BACKEND_PORT pm2 start npm --name "${APP_DIR}-backend" -- run start
    cd ..
    
    # Check if standalone exists
    if [ -f ".next/standalone/server.js" ]; then
        PORT=3001 pm2 start .next/standalone/server.js --name "${APP_DIR}-frontend"
    else
        PORT=3001 pm2 start npm --name "${APP_DIR}-frontend" -- run start
    fi
    
    pm2 save

    echo -e "${GREEN}[5/5] Verifying Services...${NC}"
    sleep 3
    pm2 list
    
    echo -e ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  Update Complete! Version: ${YELLOW}$APP_VERSION${NC}                         ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
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

    npm install --legacy-peer-deps
    npx prisma generate
    npx prisma db push --force-reset
    npm run db:seed
    npm run build
    cd ..

    echo -e "${GREEN}[5/8] Installing Frontend...${NC}"
    cat > .env.production << EOF
NEXT_PUBLIC_API_URL="http://$DOMAIN_NAME:$NGINX_PORT"
PORT=$APP_PORT
EOF

    npm install --legacy-peer-deps
    npm run build
    
    # Copy static files for standalone mode
    if [ -d ".next/standalone" ]; then
        cp -r .next/static .next/standalone/.next/
        cp -r public .next/standalone/ 2>/dev/null || true
    fi

    echo -e "${GREEN}[6/8] Starting Services with PM2...${NC}"
    sudo npm install -g pm2
    
    cd backend
    PORT=$BACKEND_PORT pm2 start npm --name "${APP_DIR}-backend" -- run start
    cd ..
    
    # Use standalone server for Next.js if available
    if [ -f ".next/standalone/server.js" ]; then
        PORT=$APP_PORT pm2 start .next/standalone/server.js --name "${APP_DIR}-frontend"
    else
        PORT=$APP_PORT pm2 start npm --name "${APP_DIR}-frontend" -- run start
    fi
    
    pm2 save
    pm2 startup

    echo -e "${GREEN}[7/8] Configuring Nginx (Port $NGINX_PORT)...${NC}"
    sudo bash -c "cat > /etc/nginx/sites-available/$APP_DIR << 'EOF'
server {
    listen $NGINX_PORT;
    server_name $DOMAIN_NAME;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    location /api {
        proxy_pass http://localhost:$BACKEND_PORT/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }
}
EOF"
    sudo ln -sfn /etc/nginx/sites-available/$APP_DIR /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx

    echo -e "${GREEN}[8/8] Installation Complete!${NC}"
    echo -e ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}     ${BLUE}CRM Next Installation Complete!${NC}                          ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     Version: ${YELLOW}$APP_VERSION${NC}                                         ${GREEN}║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  App URL: ${YELLOW}http://$DOMAIN_NAME:$NGINX_PORT${NC}"
    echo -e "${GREEN}║${NC}  API URL: ${YELLOW}http://$DOMAIN_NAME:$NGINX_PORT/api${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  ${BLUE}Default Login Credentials:${NC}                                  ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     Username: ${YELLOW}admin${NC}                                          ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     Password: ${YELLOW}crm@123${NC}                                        ${GREEN}║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  ${BLUE}New Features in v2.0:${NC}                                        ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}   • Quotation System (Thai/English)                            ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}   • Product Price Editing                                      ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}   • Company Info Settings                                      ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}   • Activity Logging (Quotation Type)                          ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
fi
