#!/bin/bash

# CRM Next Update Script
# Usage: ./update_app.sh

# Configuration
APP_DIR="/var/www/crm-next"
BACKEND_DIR="$APP_DIR/backend"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   CRM Next Auto Updater                  ${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""

# 1. Check Directory
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Error: Application directory $APP_DIR not found!${NC}"
    exit 1
fi

echo -e "${GREEN}[1/6] Navigating to application directory...${NC}"
cd $APP_DIR

# 2. Pull latest code
echo -e "${GREEN}[2/6] Pulling latest code from GitHub...${NC}"
git fetch origin
git reset --hard origin/main
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Git pull failed!${NC}"
    exit 1
fi

# 3. Install Dependencies
echo -e "${GREEN}[3/6] Installing dependencies...${NC}"
echo "--> Frontend..."
npm ci --silent
echo "--> Backend..."
cd $BACKEND_DIR
npm ci --silent
cd $APP_DIR

# 4. Build Application
echo -e "${GREEN}[4/6] Building application...${NC}"

# Backend Build
echo "--> Building Backend..."
cd $BACKEND_DIR
npm run build
echo "--> Updating Database Schema..."
npx prisma generate
npx prisma db push
cd $APP_DIR

# Frontend Build
echo "--> Building Frontend (this may take a while)..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Frontend build failed!${NC}"
    exit 1
fi

# 5. Restart Services
echo -e "${GREEN}[5/6] Restarting services via PM2...${NC}"
pm2 restart all
pm2 save

# 6. Final Status
echo -e "${GREEN}[6/6] Verifying status...${NC}"
pm2 status

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   Update Completed Successfully! 🚀      ${NC}"
echo -e "${GREEN}==========================================${NC}"
