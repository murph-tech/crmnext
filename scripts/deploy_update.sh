#!/bin/bash

# ==========================================
# 🚀 CRM Next - Remote Update Script
# ==========================================
# สคริปต์นี้สำหรับรันจากเครื่องของคุณ (Local Machine)
# เพื่ออัปเดต Application บน Server ปลายทางผ่าน SSH
# ==========================================

# สีสำหรับการแสดงผล
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   CRM Next - Remote Server Updater       ${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""

# ----------------------------------------
# 1. รับค่า Configuration
# ----------------------------------------

# โหลดค่าเดิมที่เคยใช้ (ถ้ามี)
CONFIG_FILE=".deploy_config"
if [ -f "$CONFIG_FILE" ]; then
    source $CONFIG_FILE
fi

# ฟังก์ชันสำหรับถามค่าผู้ใช้
ask_input() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    # ถ้ามีค่าเดิมให้แสดงใน []
    if [ -n "${!var_name}" ]; then
        read -p "$(echo -e $YELLOW"$prompt [$default]: "$NC)" input
        input="${input:-${!var_name}}"
    else
        read -p "$(echo -e $YELLOW"$prompt [$default]: "$NC)" input
        input="${input:-$default}"
    fi
    
    # update ค่าตัวแปร
    export $var_name="$input"
}

echo -e "${YELLOW}--- Server Connection Details ---${NC}"
ask_input "Enter Server IP Address" "72.60.209.145" "SERVER_IP"
ask_input "Enter SSH Port" "22" "SSH_PORT"
ask_input "Enter SSH Username" "root" "SSH_USER"
ask_input "Enter Project Directory" "/var/www/crm-next" "PROJECT_DIR"

# บันทึกค่าไว้ใช้ครั้งหน้า
echo "SERVER_IP=\"$SERVER_IP\"" > $CONFIG_FILE
echo "SSH_PORT=\"$SSH_PORT\"" >> $CONFIG_FILE
echo "SSH_USER=\"$SSH_USER\"" >> $CONFIG_FILE
echo "PROJECT_DIR=\"$PROJECT_DIR\"" >> $CONFIG_FILE

echo ""
echo -e "${GREEN}Preparing to update Server: ${YELLOW}$SERVER_IP${NC}"
echo -e "${GREEN}Project Directory: ${YELLOW}$PROJECT_DIR${NC}"
echo ""
read -p "Press Enter to start update (or Ctrl+C to cancel)..."

# ----------------------------------------
# 2. เริ่มการ Update ผ่าน SSH
# ----------------------------------------

echo ""
echo -e "${GREEN}[1/5] Connecting to server...${NC}"

# สั่งงาน Server ผ่าน SSH
ssh -p $SSH_PORT $SSH_USER@$SERVER_IP << EOF
    
    # หยุดทำงานทันทีถ้ามี error
    set -e

    # ฟังก์ชันแสดงสถานะ
    log() {
        echo -e "\033[0;32m[Remote] \$1\033[0m"
    }
    error() {
        echo -e "\033[0;31m[Remote Error] \$1\033[0m"
    }

    # เช็คโฟลเดอร์
    if [ ! -d "$PROJECT_DIR" ]; then
        error "Directory $PROJECT_DIR does not exist!"
        exit 1
    fi

    cd $PROJECT_DIR

    # ----------------------------------------
    # Backup ข้อมูลสำคัญ (Data Preservation)
    # ----------------------------------------
    log "Creating backups to ensure data safety..."
    
    # 1. Backup .env file
    if [ -f "backend/.env" ]; then
        cp backend/.env backend/.env.backup_\$(date +%Y%m%d_%H%M%S)
        log "Backed up .env file"
    fi

    # 2. Backup Database (ถ้าใช้ PostgreSQL)
    if command -v pg_dump &> /dev/null; then
        # พยายามหา password จาก .env (แบบง่าย) หรือใช้ .pgpass
        # สมมติว่าเป็น User 'crmuser' และ Database 'crm_db' ตามคู่มือ
        # การ backup ที่ดีที่สุดควร config pgpass ไว้ที่ server
        
        BACKUP_FILE="database_backup_\$(date +%Y%m%d_%H%M%S).sql"
        # ลอง dump (อาจจะต้องกรอก password ถ้าไม่ได้ตั้ง .pgpass)
        # pg_dump -U crmuser -d crm_db > \$BACKUP_FILE || log "Skipping DB backup (auth required)"
        log "Database backup step skipped (configure auto-backup separately)"
    fi

    # ----------------------------------------
    # Update Code
    # ----------------------------------------
    log "Pulling latest code..."
    
    # ใช้ git stash เพื่อเก็บการแก้ไขไฟล์ config บน server (ถ้ามี) ไม่ให้หาย
    git stash
    
    # ดึง code ใหม่
    git pull origin main
    
    # คืนค่า config ที่แก้ไว้ (ถ้ามี)
    git stash pop || echo "No local changes to restore"

    # ----------------------------------------
    # Install & Build
    # ----------------------------------------
    log "Installing dependencies & Building..."

    # Backend
    echo "--> Backend..."
    cd backend
    npm ci --silent
    npx prisma generate
    
    # Update Schema (ระวัง: เฉพาะการเปลี่ยนแปลงที่ปลอดภัย)
    npx prisma db push
    
    npm run build
    cd ..

    # Frontend
    echo "--> Frontend..."
    npm ci --silent
    npm run build

    # ----------------------------------------
    # Restart Services
    # ----------------------------------------
    log "Restarting Application..."
    pm2 restart all
    
    # Save PM2 list
    pm2 save

    log "Update Complete! Current Status:"
    pm2 status

EOF

# ตรวจสอบผลลัพธ์จาก SSH
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}   ✅ Update Successful!                  ${NC}"
    echo -e "${GREEN}==========================================${NC}"
else
    echo ""
    echo -e "${RED}==========================================${NC}"
    echo -e "${RED}   ❌ Update Failed! Please check logs.   ${NC}"
    echo -e "${RED}==========================================${NC}"
fi
