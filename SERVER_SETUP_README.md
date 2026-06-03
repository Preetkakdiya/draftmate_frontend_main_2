# DraftMate Server Setup & Disk Maintenance Guide

This guide details how the DraftMate production/staging server is set up on AWS EC2, how Kubernetes (Kind) is configured, and how the automated disk pruning system maintains host storage.

---

## 1. AWS EC2 Instance Requirements

DraftMate runs several heavy Large Language Model (LLM) processing modules and requires an instance with sufficient CPU/memory.
- **OS**: Ubuntu 24.04 LTS (or 22.04 LTS)
- **Instance Type**: `m7i-flex.large` or `t3.large` (Minimum 8GB RAM required)
- **Disk**: 40GB General Purpose SSD (gp3)
- **Security Group (Inbound Rules)**:
  - **SSH (22)**: Admins only
  - **HTTP (80)**: Public web traffic (mapped to Frontend / API Ingress)
  - **HTTPS (443)**: Public secure traffic (mapped to Frontend / API Ingress)

---

## 2. Server Swap Space (OOM Prevention)

To prevent the backend pods from crashing under heavy AI tasks due to Out-Of-Memory (OOM) errors, a **8GB Swapfile** must be active on the host.

To verify or recreate the swapfile on a new server:
```bash
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent after reboot
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 3. Kubernetes (Kind) Architecture & Port Mapping

We run **Kind** (Kubernetes in Docker) to orchestrate our containers.
* **Nodes**: 3 containers representing `kind-control-plane`, `kind-worker`, and `kind-worker2`.
* **Host Port Bindings**: The Kind cluster is configured to bind the host instance ports `80` and `443` directly to the NGINX Ingress controller container inside Kubernetes.
* **API Gateway Routing**: Any HTTP traffic hitting port 80/443 passes directly through the Ingress controller. Path prefixes are mapped as follows:
  - `/` (All root paths) -> Routes to `frontend` ClusterIP service.
  - `/converter/`, `/lexbot/`, `/query/`, `/auth/`, etc. -> Routes to `api-gateway` NodePort service at Port 8080.

---

## 4. Automated Disk Maintenance & Pruning

Because the EC2 host root disk is only 40GB and the backend image is very large (4.5GB+ uncompressed), the host disk will run out of space if multiple image tags accumulate.

To prevent pipeline failures due to `no space left on device`, we have implemented an automated **pre-deploy and post-deploy cleanup cycle** inside [.github/workflows/deploy.yml](file:///d:/draftmate/draftmate_frontend_main_2/.github/workflows/deploy.yml).

### The Cleanup Routine:
1. **Docker Prune**: Clears unused dangling containers, builders, and networks on the host (`docker system prune -af`).
2. **Journal Cleanup**: Vacuums system log journals older than 1 day (`journalctl --vacuum-time=1d`).
3. **Containerd Pruning**: Executes [prune_images.py](file:///d:/draftmate/draftmate_frontend_main_2/prune_images.py).
   - Inspects the images inside each Kind worker node container using `crictl`.
   - Aggressively keeps only **1** version (the active running tag) of the `draftmate-frontend` and `draftmate-backend` images.
   - Deletes all older, inactive image tags and calls `crictl rmi --prune`.
   - This keeps containerd snapshot storage at a constant **~4.5 GB** per node instead of continuously expanding.

### Manual Disk Status Check:
To check if disk usage is healthy, SSH into the EC2 instance and run:
```bash
# Check host disk space
df -h /

# Check Docker space
sudo docker system df

# Check containerd image list inside the worker node
sudo docker exec kind-worker crictl images
```
