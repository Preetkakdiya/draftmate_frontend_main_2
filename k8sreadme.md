# 🚀 DraftMate: Official Company Production Deployment Guide

This is the official, production-grade documentation for deploying DraftMate on the company's AWS infrastructure. 

This guide uses a **True Ingress Controller**, meaning the application will be exposed naturally on Port 80 and 443 **without** needing hacky `port-forward` scripts.

---

## 🖥️ Step 1: Launch Company AWS EC2 Instance

Launch the main application server in the company AWS account:
- **OS:** Ubuntu 24.04 LTS
- **Instance Type:** `m7i-flex.large` (Required for heavy AI/ML processing)
- **Storage:** 30 GB `gp3` SSD
- **Security Group Ports:** 
  - `22` (SSH for Admins)
  - `80` (HTTP Web Traffic)
  - `443` (HTTPS Secure Traffic)

---

## 🛠️ Step 2: System Update & Core Installations

SSH into the new instance and install the core dependencies.

```bash
# 1. Update System
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
sudo apt install docker.io -y
sudo usermod -aG docker ubuntu
newgrp docker

# 3. Install Kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# 4. Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# 5. Install Kind
[ $(uname -m) = x86_64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```

---

## ☸️ Step 3: Create Cluster with Native Port Binding

We will configure the Kubernetes cluster to natively bind to the EC2 host ports (80 and 443) so traffic flows automatically.

```bash
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
EOF

# Create the cluster
kind create cluster --config kind-config.yaml
```

---

## 🚦 Step 4: Install Native NGINX Ingress Controller

**This replaces the need for `port-forward` scripts.** This controller sits on port 80/443 and automatically routes traffic to the Frontend and Backend pods.

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait until the ingress controller is ready (takes ~30 seconds)
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

---

## 🔐 Step 5: Clone Project & Setup Company Secrets

```bash
# Clone the codebase (Make sure to clone the branch with the Kubernetes setup!)
git clone -b preet/k8s-setup https://github.com/Preetkakdiya/draftmate_frontend_main_2.git
cd draftmate_frontend_main_2

# Create the secrets file for the company AWS RDS Database and API Keys
# (NEVER commit this file to GitHub!)
cat <<EOF > draftmate-chart/values-secrets.yaml
frontend:
  env:
    # Database Credentials
    POSTGRES_PASSWORD: "CompanyRealPassword"
    PSQL_PASSWD: "CompanyRealPassword"
    POSTGRES_HOST: "company-lawdb-useast1.rds.amazonaws.com"
    POSTGRES_DSN: "postgresql://lawuser:CompanyRealPassword@company-lawdb-useast1.rds.amazonaws.com:5432/postgres"
    DATABASE_URL: "postgresql://lawuser:CompanyRealPassword@company-lawdb-useast1.rds.amazonaws.com:5432/postgres"
    
    # AI & Search API Keys
    GOOGLE_API_KEY: "Company-Gemini-Key"
    GEMINI_API_KEY: "Company-Gemini-Key"
    OPENAI_API_KEY: "Company-OpenAI-Key"
    TAVILY_API_KEY: "Company-Tavily-Key"
    FIRECRAWL_API_KEY: "Company-Firecrawl-Key"
    FIRECRAWLER_API_KEY: "Company-Firecrawl-Key"
    SERPER_API_KEY: "Company-Serper-Key"
    GOOGLE_SERP_API_KEY: "Company-Serper-Key"
    LANGSMITH_API_KEY: "Company-Langsmith-Key"
    
    # AWS S3 Integration
    AWS_ACCESS_KEY_ID: "Company-AWS-Access-Key"
    AWS_SECRET_ACCESS_KEY: "Company-AWS-Secret-Key"
    
    # Payments Integration (Cashfree)
    CASHFREE_APP_ID: "Company-Cashfree-App-ID"
    CASHFREE_SECRET_KEY: "Company-Cashfree-Secret-Key"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: "Company-Google-Client-ID"
    GOOGLE_CLIENT_SECRET: "Company-Google-Client-Secret"
    
    # Email / SMTP Authentication
    SMTP_PASSWORD: "gmail-app-password-for-sending-notifications"

backend:
  env:
    # Database Credentials
    POSTGRES_PASSWORD: "CompanyRealPassword"
    PSQL_PASSWD: "CompanyRealPassword"
    POSTGRES_HOST: "company-lawdb-useast1.rds.amazonaws.com"
    POSTGRES_DSN: "postgresql://lawuser:CompanyRealPassword@company-lawdb-useast1.rds.amazonaws.com:5432/postgres"
    DATABASE_URL: "postgresql://lawuser:CompanyRealPassword@company-lawdb-useast1.rds.amazonaws.com:5432/postgres"
    
    # AI & Search API Keys
    GOOGLE_API_KEY: "Company-Gemini-Key"
    GEMINI_API_KEY: "Company-Gemini-Key"
    OPENAI_API_KEY: "Company-OpenAI-Key"
    TAVILY_API_KEY: "Company-Tavily-Key"
    FIRECRAWL_API_KEY: "Company-Firecrawl-Key"
    FIRECRAWLER_API_KEY: "Company-Firecrawl-Key"
    SERPER_API_KEY: "Company-Serper-Key"
    GOOGLE_SERP_API_KEY: "Company-Serper-Key"
    LANGSMITH_API_KEY: "Company-Langsmith-Key"
    
    # AWS S3 Integration
    AWS_ACCESS_KEY_ID: "Company-AWS-Access-Key"
    AWS_SECRET_ACCESS_KEY: "Company-AWS-Secret-Key"
    
    # Payments Integration (Cashfree)
    CASHFREE_APP_ID: "Company-Cashfree-App-ID"
    CASHFREE_SECRET_KEY: "Company-Cashfree-Secret-Key"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: "Company-Google-Client-ID"
    GOOGLE_CLIENT_SECRET: "Company-Google-Client-Secret"
    
    # Email / SMTP Authentication
    SMTP_PASSWORD: "gmail-app-password-for-sending-notifications"
EOF
```

---

## 🚢 Step 6: Deploy DraftMate

Deploy the application using Helm. The ingress rules in `values.yaml` will automatically register the services with the NGINX Ingress Controller.

```bash
helm upgrade --install draftmate ./draftmate-chart \
  -f ./draftmate-chart/values.yaml \
  -f ./draftmate-chart/values-secrets.yaml
```

---

## 🌐 Step 7: Final DNS Setup

1. In your Company DNS Provider (e.g., AWS Route53 or GoDaddy), create an **A Record** for your target domain (e.g., `draftmate.company.com`).
2. Point the record directly to the **Public IPv4 Address** of this new EC2 instance.
3. Once deployed, any traffic hitting `draftmate.company.com` will hit the EC2 instance on Port 80, automatically pass through to the Kubernetes Ingress Controller, and securely route to your Frontend or Backend APIs without any extra port forwarding!
