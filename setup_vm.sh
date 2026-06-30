#!/bin/bash
# One-time setup for SAGE Dashboard on GCP e2-micro (Ubuntu 22.04)
# Run this ONCE after SSHing into the VM:
#   bash setup_vm.sh
set -e

echo "=== SAGE Dashboard — GCP VM Setup ==="

# 1. System dependencies
echo "[1/6] Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y git curl build-essential

# 2. uv (fast Python runner — handles all Python deps automatically)
echo "[2/6] Installing uv..."
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# 3. Node.js 20
echo "[3/6] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. PM2 — keeps the server running 24/7, auto-restarts on crash/reboot
echo "[4/6] Installing PM2..."
sudo npm install -g pm2

# 5. Build React frontend
echo "[5/6] Building frontend..."
cd webapp
npm ci --silent
npm run build
cd ..

# 6. Create .env with Databricks token
if [ ! -f .env ]; then
    echo ""
    echo "=== Databricks Token ==="
    echo "Go to Databricks > Settings > Developer > Access tokens > Generate new token"
    echo "Paste it here (input is hidden):"
    read -r -s DBR_TOKEN
    echo ""
    cat > .env <<EOF
DATABRICKS_HOST=https://swiggy-analytics-mumbai.cloud.databricks.com
DATABRICKS_TOKEN=${DBR_TOKEN}
DATABRICKS_WAREHOUSE_ID=c5b794bff6539d09
PORT=8000
EOF
    chmod 600 .env
    echo ".env created (token hidden)."
else
    echo "[6/6] .env already exists — skipping token prompt."
fi

# 7. Start with PM2
echo "[6/6] Starting dashboard..."
pm2 start ecosystem.config.js
pm2 save

# Register PM2 to start on VM reboot
PM2_STARTUP=$(pm2 startup | grep "sudo")
eval "$PM2_STARTUP"

PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me || echo "YOUR_VM_IP")

echo ""
echo "============================================"
echo "  Setup complete!"
echo "  Dashboard: http://${PUBLIC_IP}:8000"
echo "  Share that URL with your team."
echo "============================================"
echo ""
echo "Useful commands:"
echo "  pm2 logs sage-dashboard     — live logs"
echo "  pm2 restart sage-dashboard  — restart app"
echo "  pm2 status                  — check status"
