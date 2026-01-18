#!/bin/bash

# --- Configuration ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== CRM Server Setup & Upgrade Script ===${NC}"

# 1. Update/Upgrade Check
if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}Detected existing installation in $APP_DIR. Switching to UPDATE mode.${NC}"
    IS_UPDATE=true
else
    IS_UPDATE=false
fi

# 2. Collect/Verify Configuration
if [ "$IS_UPDATE" = true ]; then
    read -p "Enter App Directory Name (existing): " APP_DIR
    if [ ! -d "$APP_DIR" ]; then
        echo "Error: Directory $APP_DIR does not exist."
        exit 1
    fi
    
    # Load existing env vars if possible (naive parse)
    echo "Loading existing configuration..."
    cd $APP_DIR/backend
    # Source the env file just to get vars for script use (simplified)
    # Caution: This assumes standard .env format.
    export $(grep -v '^#' .env | xargs)
    cd ../..
    
    DOMAIN_NAME=$(echo $FRONTEND_URL | awk -F/ '{print $3}')
    BACKEND_PORT=$PORT 
    # Frontend port is harder to guess from backend env, might need user input or check pm2
    read -p "Confirm Frontend Port (current): " APP_PORT
    
    echo -e "Updating $APP_DIR..."
else
    # FRESH INSTALL
    echo -e "${YELLOW}Please enter configuration details:${NC}"
    read -p "1. Domain Name or IP Address (e.g., crm.example.com): " DOMAIN_NAME
    read -p "2. Frontend Port (e.g., 3000): " APP_PORT
    read -p "3. Backend Port (e.g., 4000): " BACKEND_PORT
    read -p "4. Git Repository URL (SSH): " GIT_REPO
    read -p "5. Database Name (e.g., crm_db_v1): " DB_NAME
    read -p "6. Database User: " DB_USER
    read -s -p "7. Database Password: " DB_PASS
    echo ""
    read -p "8. App Directory Name (e.g., my-crm-app): " APP_DIR
fi

# 3. Update System (Always good)
echo -e "${GREEN}[1/8] Updating System Packages...${NC}"
sudo apt update
# Only install if missing
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

# 4. Database Setup (Skip if update/exists)
if [ "$IS_UPDATE" = false ]; then
    echo -e "${GREEN}[2/8] Setting up Database...${NC}"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database might already exist"
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';" 2>/dev/null || echo "User might already exist"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"
fi

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
    echo "Pulling latest changes..."
    cd $APP_DIR
    git pull
else
    git clone $GIT_REPO $APP_DIR
    cd $APP_DIR
fi

# 6. Backend Setup/Update
echo -e "${GREEN}[4/8] Updating Backend...${NC}"
cd backend

# Create .env only if missing (Upgrade safety)
if [ ! -f .env ]; then
    echo "DATABASE_URL=\"postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public\"" > .env
    echo "PORT=$BACKEND_PORT" >> .env
    echo "FRONTEND_URL=\"http://$DOMAIN_NAME\"" >> .env
    echo "JWT_SECRET=\"$(openssl rand -base64 32)\"" >> .env
fi

npm install
npx prisma generate
npx prisma migrate deploy # Safe to run on existing DB
npm run build
cd ..

# 7. Frontend Setup/Update
echo -e "${GREEN}[5/8] Updating Frontend...${NC}"
# Create .env.production only if missing
if [ ! -f .env.production ]; then
    echo "NEXT_PUBLIC_API_URL=\"http://$DOMAIN_NAME/api\"" > .env.production
    echo "PORT=$APP_PORT" >> .env.production
fi

npm install
npm run build

# 8. PM2 Management
echo -e "${GREEN}[6/8] Restarting Services...${NC}"
sudo npm install -g pm2

# Check if processes exist, restart if yes, start if no
if pm2 describe "${APP_DIR}-backend" > /dev/null; then
    pm2 restart "${APP_DIR}-backend"
else
    cd backend
    pm2 start npm --name "${APP_DIR}-backend" -- run start
    cd ..
fi

if pm2 describe "${APP_DIR}-frontend" > /dev/null; then
    pm2 restart "${APP_DIR}-frontend"
else
    pm2 start npm --name "${APP_DIR}-frontend" -- run start
fi

pm2 save

# 9. Nginx (Only configure if new)
echo -e "${GREEN}[7/8] Verifying Nginx...${NC}"
if [ ! -f /etc/nginx/sites-available/$APP_DIR ]; then
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
fi

echo -e "${GREEN}Update/Installation Complete!${NC}"
