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

    # Confirm before proceeding
    echo -e "Targetting: $APP_DIR"
    echo -e "${YELLOW}Warning: This will pull the latest code and restart services.${NC}"
    echo -e "Database data and .env files will be PRESERVED."
    read -p "Press ENTER to continue..."

    cd $APP_DIR
    
    # Force Pull Latest Code
    echo -e "${GREEN}[1/4] Updating Source Code...${NC}"
    # Reset any local changes to ensure clean pull
    git fetch --all
    git reset --hard origin/main
    
    # Load env for variables (Port info) - rudimentary check
    if [ -f "backend/.env" ]; then
        # Load vars safely ignoring comments
        export $(grep -v '^#' backend/.env | xargs)
    fi
    # Default ports if not found
    BACKEND_PORT=${PORT:-4000}
    APP_PORT=3000 

    # Backend Update
    echo -e "${GREEN}[2/4] Updating Backend...${NC}"
    cd backend
    npm install
    npx prisma generate
    npx prisma migrate deploy
    npm run build
    cd ..

    # Frontend Update
    echo -e "${GREEN}[3/4] Updating Frontend...${NC}"
    npm install
    npm run build

    # PM2 Restart
    echo -e "${GREEN}[4/4] Restarting Services...${NC}"
    # Check if PM2 is installed globally just in case
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
    fi

    if pm2 describe "${APP_DIR}-backend" > /dev/null; then
        pm2 restart "${APP_DIR}-backend"
    else
        echo "Backend service not found in PM2, starting..."
        cd backend
        pm2 start npm --name "${APP_DIR}-backend" -- run start
        cd ..
    fi

    if pm2 describe "${APP_DIR}-frontend" > /dev/null; then
        pm2 restart "${APP_DIR}-frontend"
    else
        echo "Frontend service not found in PM2, starting..."
        pm2 start npm --name "${APP_DIR}-frontend" -- run start
    fi
    
    pm2 save
    echo -e "${GREEN}Update Complete!${NC}"
    exit 0

else
    # --- FRESH INSTALL MODE ---
    echo -e "${YELLOW}--- FRESH INSTALLATION MODE ---${NC}"
    read -p "1. Domain Name or IP Address (e.g., crm.example.com): " DOMAIN_NAME
    read -p "2. Frontend Port (e.g., 3000): " APP_PORT
    read -p "3. Backend Port (e.g., 4000): " BACKEND_PORT
    read -p "4. Git Repository URL (SSH): " GIT_REPO
    read -p "5. Database Name (e.g., crm_db_v1): " DB_NAME
    read -p "6. Database User: " DB_USER
    read -s -p "7. Database Password: " DB_PASS
    echo ""
    read -p "8. App Directory Name (e.g., my-crm-app): " APP_DIR

    # 3. Update System (Always good)
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

    # 4. Database Setup
    echo -e "${GREEN}[2/8] Setting up Database...${NC}"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database might already exist"
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';" 2>/dev/null || echo "User might already exist"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"

    # 5. SSH Key & Git
    echo -e "${GREEN}[3/8] Handling Source Code...${NC}"
    if [ ! -f ~/.ssh/id_ed25519.pub ]; then
        ssh-keygen -t ed25519 -C "deploy@vps" -f ~/.ssh/id_ed25519 -N ""
        eval "$(ssh-agent -s)"
        ssh-add ~/.ssh/id_ed25519
        echo -e "${YELLOW}ADD KEY TO GIT:${NC}"
        cat ~/.ssh/id_ed25519.pub
        read -p "Press ENTER after adding key..."
    fi

    if [ -d "$APP_DIR" ]; then
        echo "Directory exists, pulling..."
        cd $APP_DIR
        git reset --hard HEAD
        git pull
    else
        git clone $GIT_REPO $APP_DIR
        cd $APP_DIR
    fi

    # 6. Backend Setup
    echo -e "${GREEN}[4/8] Installing Backend...${NC}"
    cd backend
    echo "DATABASE_URL=\"postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public\"" > .env
    echo "PORT=$BACKEND_PORT" >> .env
    echo "FRONTEND_URL=\"http://$DOMAIN_NAME\"" >> .env
    echo "JWT_SECRET=\"$(openssl rand -base64 32)\"" >> .env

    npm install
    npx prisma generate
    npx prisma migrate deploy
    npm run build
    cd ..

    # 7. Frontend Setup
    echo -e "${GREEN}[5/8] Installing Frontend...${NC}"
    echo "NEXT_PUBLIC_API_URL=\"http://$DOMAIN_NAME/api\"" > .env.production
    echo "PORT=$APP_PORT" >> .env.production

    npm install
    npm run build

    # 8. PM2 Management
    echo -e "${GREEN}[6/8] Starting Services...${NC}"
    sudo npm install -g pm2
    
    cd backend
    pm2 start npm --name "${APP_DIR}-backend" -- run start
    cd ..
    pm2 start npm --name "${APP_DIR}-frontend" -- run start
    pm2 save

    # 9. Nginx
    echo -e "${GREEN}[7/8] Configuring Nginx...${NC}"
    sudo bash -c "cat > /etc/nginx/sites-available/$APP_DIR <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:$BACKEND_PORT/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
EOF"
    sudo ln -sfn /etc/nginx/sites-available/$APP_DIR /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx

    echo -e "${GREEN}Installation Complete! App available at http://$DOMAIN_NAME${NC}"
fi
