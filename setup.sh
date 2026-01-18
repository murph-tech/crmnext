#!/bin/bash

# --- Configuration ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== CRM Server Installation (Multi-App Supported) ===${NC}"

# 1. Collect User Input
echo -e "${YELLOW}Please enter configuration details:${NC}"
echo -e "--------------------------------------------------"

read -p "1. Domain Name or IP Address (e.g., crm.example.com): " DOMAIN_NAME
read -p "2. Internal Port for this App (MUST be unique, e.g., 3001, 4000): " APP_PORT
read -p "3. Git Repository URL (SSH): " GIT_REPO
read -p "4. Database Name (e.g., crm_db_v1): " DB_NAME
read -p "5. Database User: " DB_USER
read -s -p "6. Database Password: " DB_PASS
echo ""
read -p "7. App Directory Name (e.g., my-crm-app): " APP_DIR

# 2. Update System & Install Basics
echo -e "${GREEN}[1/8] Updating System...${NC}"
sudo apt update
sudo apt install -y curl git unzip build-essential

# 3. Check & Install Node.js
if ! command -v node &> /dev/null; then
    echo -e "${GREEN}[2/8] Installing Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo -e "${GREEN}[2/8] Node.js found. Skipping...${NC}"
fi

# 4. Check & Install PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${GREEN}[3/8] Installing PostgreSQL...${NC}"
    sudo apt install -y postgresql postgresql-contrib
else
    echo -e "${GREEN}[3/8] PostgreSQL found. Skipping...${NC}"
fi

# Setup DB
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database might already exist"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';" 2>/dev/null || echo "User might already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"

# 5. SSH Key Setup
echo -e "${GREEN}[4/8] Checking SSH Key...${NC}"
if [ ! -f ~/.ssh/id_ed25519.pub ]; then
    ssh-keygen -t ed25519 -C "deploy@vps" -f ~/.ssh/id_ed25519 -N ""
    eval "$(ssh-agent -s)"
    ssh-add ~/.ssh/id_ed25519
fi

echo -e "${YELLOW}=== IMPORTANT: ADD THIS KEY TO GIT DEPLOY KEYS ===${NC}"
cat ~/.ssh/id_ed25519.pub
echo -e "${YELLOW}==================================================${NC}"
read -p "Press ENTER once you have added the key to Git..."

# 6. Clone/Pull App
echo -e "${GREEN}[5/8] Setting up App code...${NC}"
if [ -d "$APP_DIR" ]; then
    cd $APP_DIR
    git pull
else
    git clone $GIT_REPO $APP_DIR
    cd $APP_DIR
fi

# Generate .env
echo "DATABASE_URL=\"postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public\"" > .env
echo "PORT=$APP_PORT" >> .env

npm install
sudo npm install -g pm2 prisma

# 7. Database Migration
echo -e "${GREEN}[6/8] Running Migrations...${NC}"
npx prisma generate
npx prisma migrate deploy

# 8. Nginx Setup
echo -e "${GREEN}[7/8] Configuring Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
fi

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
}
EOF"

sudo ln -sfn /etc/nginx/sites-available/$APP_DIR /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 9. Start with PM2
echo -e "${GREEN}[8/8] Starting App...${NC}"
pm2 start npm --name "$APP_DIR" -- run start
pm2 save

echo -e "${GREEN}Deployment Complete! App available at http://$DOMAIN_NAME${NC}"
