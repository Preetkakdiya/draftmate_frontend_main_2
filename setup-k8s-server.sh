#!/bin/bash
# ==========================================
# DraftMate Production Deployment Automation Script
# Installs: Docker, Kubectl, Helm, Kind, Ingress Controller
# Deploys: Complete Application using Helm
# ==========================================

set -e # Exit immediately if a command exits with a non-zero status
echo "🚀 Starting Full DraftMate Production Setup..."

echo "📦 1. Updating System Packages..."
sudo apt update && sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y

echo "🐳 2. Installing Docker..."
sudo apt install docker.io -y
sudo usermod -aG docker ubuntu

echo "☸️ 3. Installing Kubectl..."
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
rm kubectl

echo "⛵ 4. Installing Helm..."
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

echo "🧸 5. Installing Kind..."
[ $(uname -m) = x86_64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

echo "⚙️ 6. Creating Native Kind Configuration (Ingress Ready)..."
cat <<EOF > kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
  - containerPort: 30080
    hostPort: 8080
    protocol: TCP
EOF

echo "🏗️ 7. Spinning up the Kubernetes Cluster (This takes ~1 minute)..."
sudo kind create cluster --config kind-config.yaml

echo "🚦 8. Installing NGINX Ingress Controller..."
# We must use sudo kubectl because the docker group hasn't taken effect for the current bash session
sudo kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

echo "⏳ Waiting for Ingress Controller to be ready..."
sleep 15
sudo kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

echo "🔐 9. Cloning Codebase & Setting up Secrets..."
if [ ! -d "draftmate_frontend_main_2" ]; then
    git clone -b preet/k8s-setup https://github.com/Preetkakdiya/draftmate_frontend_main_2.git
fi
cd draftmate_frontend_main_2

cat <<EOF > draftmate-chart/values-secrets.yaml
frontend:
  env:
    POSTGRES_PASSWORD: 'CompanyRealPassword'
    POSTGRES_HOST: 'company-lawdb-useast1.rds.amazonaws.com'
    POSTGRES_DSN: 'postgresql://lawuser:CompanyRealPassword@company-lawdb...:5432/postgres'
    DATABASE_URL: 'postgresql://lawuser:CompanyRealPassword@company-lawdb...:5432/postgres'
    GOOGLE_API_KEY: 'Company-Gemini-Key'
    OPENAI_API_KEY: 'Company-OpenAI-Key'

backend:
  env:
    POSTGRES_PASSWORD: 'CompanyRealPassword'
    POSTGRES_HOST: 'company-lawdb-useast1.rds.amazonaws.com'
    POSTGRES_DSN: 'postgresql://lawuser:CompanyRealPassword@company-lawdb...:5432/postgres'
    DATABASE_URL: 'postgresql://lawuser:CompanyRealPassword@company-lawdb...:5432/postgres'
    GOOGLE_API_KEY: 'Company-Gemini-Key'
    OPENAI_API_KEY: 'Company-OpenAI-Key'
EOF

echo "🚢 10. Deploying Application via Helm..."
# We use sudo helm to bypass the session permission issue
sudo KUBECONFIG=/root/.kube/config /usr/local/bin/helm upgrade --install draftmate ./draftmate-chart \
  -f ./draftmate-chart/values.yaml \
  -f ./draftmate-chart/values-secrets.yaml

echo "✅ Deployment Automation Complete!"
echo "------------------------------------------------"
echo "⚠️ IMPORTANT FINAL STEPS:"
echo "1. Edit draftmate-chart/values-secrets.yaml and enter the REAL company passwords and API keys."
echo "2. Re-run this exact command to apply them: "
echo "   sudo KUBECONFIG=/root/.kube/config helm upgrade draftmate ./draftmate-chart -f ./draftmate-chart/values.yaml -f ./draftmate-chart/values-secrets.yaml"
echo "------------------------------------------------"
echo "Note: You no longer need to run any port-forward scripts!"
