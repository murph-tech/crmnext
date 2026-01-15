#!/bin/bash
# CRM Next - Simple Server Setup Script (SQLite Version)
# Run this script as root on your Ubuntu server

set -e

echo "🚀 Starting Server Setup..."

# 1. Update System
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# 2. Install Node.js 20 LTS
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs build-essential

# 3. Install Nginx (Web Server)
echo "📦 Installing Nginx..."
apt-get install -y nginx

# 4. Install PM2 (Process Manager)
echo "📦 Installing PM2..."
npm install -g pm2

# 5. Install Certbot (SSL)
echo "📦 Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# 6. Setup Firewall
echo "🔥 Configuring Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "✅ Setup Complete!"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "PM2 version: $(pm2 -v)"
