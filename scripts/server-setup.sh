#!/bin/bash
# ===========================================
# CRM Next - Ubuntu Server Setup Script
# Run as root or with sudo
# ===========================================

set -e

echo "🚀 Installing CRM Next dependencies..."

# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 20 LTS
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PostgreSQL 16
echo "📦 Installing PostgreSQL..."
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
apt-get update
apt-get install -y postgresql-16 postgresql-contrib-16

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt-get install -y nginx

# Install Certbot for SSL
echo "📦 Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# Create app user
echo "👤 Creating app user..."
useradd -m -s /bin/bash crmapp || true

# Create app directory
mkdir -p /var/www/crm-next
chown -R crmapp:crmapp /var/www/crm-next

# Enable and start services
systemctl enable postgresql
systemctl start postgresql
systemctl enable nginx
systemctl start nginx

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

echo ""
echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure PostgreSQL database (see DEPLOY.md)"
echo "2. Upload application files to /var/www/crm-next"
echo "3. Configure Nginx (see nginx.conf in project)"
echo "4. Run deploy.sh as crmapp user"
