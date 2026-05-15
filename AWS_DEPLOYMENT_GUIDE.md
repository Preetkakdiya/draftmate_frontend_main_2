# DraftMate Deployment Guide

This guide covers both the **Local Development Setup** (using Kind) and the **AWS Production/Staging Setup**.

---

## Part 1: Local Setup (Windows/Mac/Linux)

The local setup uses a single-node Kubernetes cluster via `kind` (Kubernetes in Docker). A single-node cluster is highly recommended for local development because the DraftMate backend contains heavy ML models; running a multi-node cluster locally will crash Docker Desktop.

### Prerequisites
1. **Docker Desktop** (Make sure WSL2 is enabled if on Windows)
2. **kubectl**
3. **kind**
4. **helm**

### Step-by-Step Instructions

**1. Create a Single-Node Kind Cluster with Ingress Support**
Create a file named `kind-config.yaml` with the following content:
```yaml
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
```
Run the command to create the cluster:
```bash
kind create cluster --name draftmate-cluster --config kind-config.yaml
```

**2. Install NGINX Ingress Controller**
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
```
Wait for the ingress controller to be ready:
```bash
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=90s
```

**3. Configure Your Secrets**
Ensure you have created `draftmate-chart/values-secrets.yaml` containing your sensitive environment variables (API keys, DB credentials, etc.). Ensure this file is added to your `.gitignore`.

**4. Build the Docker Image**
You **must** pass the `VITE_CLIENT_ID` as a build argument so Vite can bake it into the static JavaScript files.
```bash
docker build -f Dockerfile \
  --build-arg VITE_CLIENT_ID="YOUR_ACTUAL_CLIENT_ID" \
  -t draftmate_frontend_main_2-frontend:latest .
```

**5. Load the Image into Kind**
Since Kubernetes runs inside Docker, it cannot see your local images automatically. You must load it:
```bash
kind load docker-image draftmate_frontend_main_2-frontend:latest --name draftmate-cluster
```

**6. Deploy using Helm**
```bash
helm upgrade --install draftmate ./draftmate-chart \
  -f ./draftmate-chart/values.yaml \
  -f ./draftmate-chart/values-secrets.yaml
```

*Your app is now accessible at `http://draftmate.test` (assuming you mapped it to `127.0.0.1` in your hosts file).*

---

## Part 2: AWS EC2 Setup (End-to-End)

Deploying DraftMate on AWS requires an instance with enough resources to handle the machine learning libraries (PyTorch, EasyOCR). 

### AWS Instance Recommendations
- **Instance Type:** `t3.xlarge` (4 vCPUs, 16 GB RAM) or `t3a.xlarge`. Do not use smaller instances (like `t2.micro`), as the ML models will cause Out-Of-Memory (OOM) crashes.
- **OS Image:** Ubuntu 24.04 LTS or 22.04 LTS
- **EBS Storage:** At least **50 GB gp3** (The Docker image is ~5GB, plus cluster overhead).
- **Security Group:** 
  - Port `22` (SSH) - Allow from your IP
  - Port `80` (HTTP) - Allow from Anywhere (0.0.0.0/0)
  - Port `443` (HTTPS) - Allow from Anywhere (0.0.0.0/0)

### Step-by-Step Instructions

**1. SSH into your EC2 Instance**
```bash
ssh -i your-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

**2. Install Prerequisites (Docker, Kubectl, Kind, Helm)**
Run the following commands to install all necessary tools:

```bash
# Update system and install basic tools
sudo apt-get update
sudo apt-get install -y ca-certificates curl apt-transport-https

# Install Docker
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io
sudo usermod -aG docker ubuntu
newgrp docker # Apply docker group changes without logging out

# Install Kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Kind
[ $(uname -m) = x86_64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

**3. Clone Repository & Setup Secrets**
```bash
git clone <YOUR_GITHUB_REPO_URL> draftmate
cd draftmate

# Create your secrets file (Paste your secrets here)
nano draftmate-chart/values-secrets.yaml
```

**4. Create the Kind Cluster**
Create the exact same `kind-config.yaml` as the local setup:
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

kind create cluster --name draftmate-cluster --config kind-config.yaml
```

**5. Install NGINX Ingress Controller**
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=90s
```

**6. Get and Load the Docker Image**

*You have two options here: Pulling an existing image from your GitHub account (Recommended), or building it from scratch on the EC2 instance.*

**Option A: Pull from GitHub Container Registry (GHCR) - Recommended**
If you pushed your built Docker image to GitHub, you can pull it directly without wasting CPU/Time on the EC2 instance.

1. Create a **Personal Access Token (PAT)** on GitHub with the `read:packages` scope.
2. Log into Docker using the AWS CLI:
```bash
# It will prompt you for your password. Paste your GitHub PAT here!
docker login ghcr.io -u <YOUR_GITHUB_USERNAME>
```
3. Pull the image from your GitHub repository:
```bash
docker pull ghcr.io/<YOUR_GITHUB_USERNAME>/draftmate-frontend:latest
```
4. Load the pulled image into your Kubernetes cluster:
```bash
kind load docker-image ghcr.io/<YOUR_GITHUB_USERNAME>/draftmate-frontend:latest --name draftmate-cluster
```
*(Note: If you use this option, you MUST update your `draftmate-chart/values.yaml` file so the `image.repository` points to `ghcr.io/<YOUR_GITHUB_USERNAME>/draftmate-frontend` instead of `draftmate_frontend_main_2-frontend`)*

**Option B: Build Locally on EC2**
*(Note: Building the image on EC2 might take 10-15 minutes depending on the instance CPU)*
```bash
docker build -f Dockerfile \
  --build-arg VITE_CLIENT_ID="<YOUR_VITE_CLIENT_ID>" \
  -t draftmate_frontend_main_2-frontend:latest .

kind load docker-image draftmate_frontend_main_2-frontend:latest --name draftmate-cluster
```

**7. Deploy Application**
```bash
helm upgrade --install draftmate ./draftmate-chart \
  -f ./draftmate-chart/values.yaml \
  -f ./draftmate-chart/values-secrets.yaml
```

### Production Domain Configuration (Deploying to Your Real Domain)

If you are moving from local testing to a live production domain (e.g., `draftmate.in`), you must update several configurations across your DNS provider, Kubernetes Ingress (NGINX), Helm values, and Google OAuth. 

Follow these steps exactly:

#### 1. Point Your Domain to AWS (DNS Configuration)
1. Log into your AWS Console and go to **EC2**. Find your instance and copy the **Public IPv4 address**.
2. Go to your Domain Registrar (GoDaddy, Namecheap, Route 53, etc.).
3. Add an **A Record**:
   - **Name/Host:** `@` (or leave blank)
   - **Value/Points To:** `<YOUR_EC2_PUBLIC_IP>`
   - **TTL:** Lowest possible (e.g., 300 seconds)
4. Add a **CNAME Record** (optional, for `www`):
   - **Name/Host:** `www`
   - **Value/Points To:** `draftmate.in`

#### 2. Update Kubernetes NGINX Ingress (Helm Chart)
Your Helm chart controls the NGINX Ingress routing. You need to tell it to listen for your real domain instead of `draftmate.test`.

Open `draftmate-chart/values.yaml` and locate the `ingress` section. Change it to match your domain:

```yaml
ingress:
  enabled: true
  className: "nginx"
  annotations:
    kubernetes.io/ingress.class: nginx
    # If you install Cert-Manager for HTTPS, you would add an annotation here later:
    # cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: draftmate.in       # <--- Change this from draftmate.test
      paths:
        - path: /
          pathType: Prefix
```

#### 3. Update Environment Variables
Your frontend and backend need to know the official URL for API requests, redirects, and CORS.

In your `draftmate-chart/values-secrets.yaml` (or your local `.env`), update the following:
```yaml
    ENVIRONMENT: "production"
    FRONTEND_URL_PROD: "https://draftmate.in"
    # Ensure AUTH_SERVICE_URL and other URLs point to the correct production endpoints if applicable
```

#### 4. Update Google OAuth Authorized Domains
If you do not do this, users will get an **"Error 400: redirect_uri_mismatch"** when trying to log in with Google.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services** > **Credentials**.
3. Edit your **OAuth 2.0 Client ID**.
4. Under **Authorized JavaScript origins**, add your real domain:
   - `https://draftmate.in`
   - `https://www.draftmate.in`
5. Click **Save**.

#### 5. Redeploy the Application
Once all configurations are updated, apply the changes to your Kubernetes cluster:

```bash
helm upgrade --install draftmate ./draftmate-chart \
  -f ./draftmate-chart/values.yaml \
  -f ./draftmate-chart/values-secrets.yaml
```

*Note on HTTPS:* Out of the box, this setup uses HTTP over port 80. To secure your domain with HTTPS (port 443), you will need to install **Cert-Manager** onto your Kubernetes cluster and configure it to automatically issue Let's Encrypt SSL certificates for your NGINX ingress.
