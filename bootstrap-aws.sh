#!/bin/bash
# DraftMate EC2 Automated AWS Link Bootstrap Script
# Run this script ON the newly created AWS EC2 instance.
# This script deploys the application and exposes it via the raw AWS URL on Port 8080.

set -e

echo "🚀 Starting DraftMate Automated AWS Link Bootstrap..."

# 1. Update and install packages
echo "📦 Installing prerequisites..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl apt-transport-https python3

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker ubuntu
fi

# Install Kubectl
if ! command -v kubectl &> /dev/null; then
    echo "☸️ Installing Kubectl..."
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
fi

# Install Kind
if ! command -v kind &> /dev/null; then
    echo "📦 Installing Kind..."
    [ $(uname -m) = x86_64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64
    chmod +x ./kind
    sudo mv ./kind /usr/local/bin/kind
fi

# Install Helm
if ! command -v helm &> /dev/null; then
    echo "⛵ Installing Helm..."
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

# Ensure Docker permissions
if ! groups | grep -q '\bdocker\b'; then
    sudo chmod 666 /var/run/docker.sock || true
fi

# Create Kind Cluster
echo "🏗️ Setting up Kubernetes Cluster..."
cat <<EOF > kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
EOF

if ! kind get clusters | grep -q "^draftmate-cluster$"; then
    kind create cluster --name draftmate-cluster --config kind-config.yaml
else
    echo "Cluster already exists, skipping creation."
fi

# Apply Credentials
if [ -f ".env" ]; then
    echo "🔐 Applying credentials from .env to Kubernetes configurations..."
    cat << 'EOF' > update_creds_auto.py
import re
import os

creds = {}
with open('.env', 'r') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            creds[k.strip()] = v.strip().strip('"').strip("'")

with open('draftmate-chart/values.yaml', 'r') as f:
    content = f.read()

for k, v in creds.items():
    content = re.sub(rf'({k}:\s*").*?(")', rf'\g<1>{v}\g<2>', content)

with open('draftmate-chart/values.yaml', 'w') as f:
    f.write(content)
EOF
    python3 update_creds_auto.py
    export VITE_CLIENT_ID=$(grep "VITE_CLIENT_ID" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
else
    echo "⚠️ WARNING: .env file not found. Skipping credential injection."
    export VITE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
fi

# Build Images
echo "🐳 Building Docker images (this may take a few minutes)..."
sudo docker build -t draftmate_frontend_main_2-backend:latest -f Dockerfile .
sudo docker build --build-arg VITE_CLIENT_ID="$VITE_CLIENT_ID" --build-arg VITE_API_BASE_URL='/api' -t draftmate_frontend_main_2-frontend:prod -f Dockerfile.frontend.prod .

# Load Images
echo "📦 Loading images into Kubernetes..."
kind load docker-image draftmate_frontend_main_2-backend:latest --name draftmate-cluster
kind load docker-image draftmate_frontend_main_2-frontend:prod --name draftmate-cluster

# Deploy Helm Chart
echo "⛵ Deploying application with Helm..."
helm upgrade --install draftmate ./draftmate-chart

# Setup Systemd Tunnel (For AWS Link)
echo "🚇 Setting up automatic network tunnel for port 8080..."
sudo tee /etc/systemd/system/draftmate-tunnel.service > /dev/null << 'EOF'
[Unit]
Description=Kubernetes Port Forward for DraftMate
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=ubuntu
Environment="KUBECONFIG=/home/ubuntu/.kube/config"
ExecStart=/usr/local/bin/kubectl port-forward --address 0.0.0.0 svc/frontend-service 8080:80
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now draftmate-tunnel.service

echo "================================================="
echo "✅ AWS LINK BOOTSTRAP COMPLETE!"
echo "Find your AWS Public DNS or IP in the AWS Console."
echo "Your application will be live at http://<YOUR_AWS_LINK>:8080 in ~60 seconds."
echo "================================================="
