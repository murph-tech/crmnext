#!/bin/bash
# ===========================================
# CRM Next - Local Startup Script for Mac
# ===========================================

echo "🚀 Starting CRM Next locally..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running!"
  echo "Please install and start Docker Desktop first."
  echo "Download: https://www.docker.com/products/docker-desktop/"
  exit 1
fi

# Build and start services
echo "📦 Building and starting containers..."
docker-compose up -d --build

echo ""
echo "✅ CRM Next is running!"
echo "-------------------------------------------"
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 Backend:  http://localhost:4000"
echo "🗄️  Database: localhost:5432"
echo "-------------------------------------------"
echo "💾 Data is persistent in Docker volume 'crm_next_postgres_data'"
echo ""
echo "Type 'docker-compose logs -f' to see server logs"
echo "Type 'docker-compose down' to stop"
