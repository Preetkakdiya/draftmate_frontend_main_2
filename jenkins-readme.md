# 🏗️ DraftMate: CI/CD Jenkins Server Guide (jenkins-new)

This is the official, highly-detailed documentation for the **Jenkins CI/CD Pipeline Server** (`jenkins-new` instance). 
This server handles testing, code quality checks, security scanning, and building Docker images before deploying them.

---

## 🖥️ 1. Server Architecture
- **Jenkins:** CI/CD Automation (Port `8080`)
- **SonarQube:** Code Quality & Bug Analysis (Port `9000`)
- **Docker & Trivy:** Image Building & Vulnerability Scanning

---

## 🛠️ 2. Automated Installation
1. SSH into your Ubuntu server.
2. Copy the contents of `setup-cicd-server.sh` and run `bash setup-cicd-server.sh`.
3. This installs Java 21, Jenkins, Docker, SonarQube, and Trivy automatically.

4. **Install NodeJS (Required for SonarQube JS scanning):**
   - Run: `sudo apt-get update && sudo apt-get install -y nodejs npm`

---

## ⚙️ 3. SonarQube: First-Time Setup (Port 9000)
1. Go to `http://<EC2-PUBLIC-IP>:9000` in your browser.
2. **Login:** The default credentials are Username: `admin` and Password: `admin`.
3. **Change Password:** It will force you to create a new password immediately. Save this password.
4. **Generate API Token (Required for Jenkins):**
   - Click your profile icon (top right) -> **My Account** -> **Security**.
   - In the "Generate Tokens" box, type `jenkins-token` and click **Generate**.
   - **COPY THIS TOKEN NOW!** You will not be able to see it again. We will paste it into Jenkins later.

5. **Create Jenkins Webhook (Required for Quality Gate):**
   - Go to **Administration** (top menu) -> **Configuration** -> **Webhooks**.
   - Click **Create**.
   - Name: `jenkins`
   - URL: `http://<JENKINS-EC2-PUBLIC-IP>:8080/sonarqube-webhook/`
   - Click **Create**.

---

## ⚙️ 4. Jenkins: First-Time Setup & Unlocking (Port 8080)

Unlike SonarQube, Jenkins does NOT use `admin/admin`. It uses a secure temporary password.

1. Go to `http://<EC2-PUBLIC-IP>:8080` in your browser.
2. You will see an **"Unlock Jenkins"** screen.
3. SSH into your server terminal and run this exact command to get your password:
   ```bash
   sudo cat /var/lib/jenkins/secrets/initialAdminPassword
   ```
4. Copy the long string of text, paste it into the Jenkins website, and click **Continue**.
5. Click **"Install suggested plugins"** and wait for them to finish installing.
6. **Create First Admin User:** Fill out the form with your desired Username, Password, Full Name, and Email. Click **Save and Continue**.
7. Keep the Jenkins URL as default and click **Finish**.

---

## 🧩 5. Jenkins: Installing Required Plugins
1. From the Jenkins Dashboard, click **Manage Jenkins** -> **Plugins**.
2. Click on the **Available plugins** tab.
3. Search for and check the boxes for:
   - `SonarQube Scanner`
   - `OWASP Dependency-Check Plugin`
   - `Docker Pipeline`
   - `Workspace Cleanup`
4. Click **Install without restart**. Once finished, check the box to restart Jenkins.

---

## 🛠️ 6. Jenkins: Global Tool Configuration
This tells Jenkins exactly where to find the scanners. The names here **MUST** match your `Jenkinsfile` perfectly.

1. Go to **Manage Jenkins** -> **Tools**.
2. **Configure SonarQube Scanner:**
   - Scroll down to "SonarQube Scanner installations".
   - Click **Add SonarQube Scanner**.
   - Name: `sonar-scanner` *(Type this exactly!)*
   - Check the box for **"Install automatically"**.
   - Click **Add Installer** and select **Install from Maven Central**.
3. **Configure OWASP Dependency-Check:**
   - Scroll down to "Dependency-Check installations".
   - Click **Add Dependency-Check**.
   - Name: `DP-Check` *(Type this exactly!)*
   - Check the box for **"Install automatically"**.
   - Click **Add Installer** and select **Install from github.com**.
4. Click **Save** at the bottom.

---

## 🔐 7. Jenkins: Adding Credentials

Jenkins needs credentials to talk to SonarQube and Docker Hub.

### A. Add SonarQube Token
1. Go to **Manage Jenkins** -> **System**.
2. Scroll down to **SonarQube servers** and click **Add SonarQube**.
3. Check **Enable injection of SonarQube server configuration as build environment variables**.
4. Name: `sonar-server` *(Type this exactly!)*
5. Server URL: `http://<EC2-PUBLIC-IP>:9000` (Use the Jenkins server IP).
6. **Server authentication token:** Click the **Add** button -> Select **Jenkins**.
   - Kind: Select `Secret text` from the dropdown.
   - Secret: Paste the SonarQube token you copied in Step 3.
   - ID: `sonar-token`
   - Click **Add**.
7. Now select `sonar-token` from the dropdown menu and hit **Save**.

### B. Add Docker Hub Credentials
1. Go to the main Dashboard -> **Manage Jenkins** -> **Credentials** -> **System** -> **Global credentials (unrestricted)**.
2. Click **Add Credentials** (top right).
3. Kind: `Username with password`.
4. Username: Your exact DockerHub Username (e.g., `preetkakdiya`).
5. Password: Your DockerHub Password.
6. ID: `docker-hub-creds` *(Type this exactly! The Jenkinsfile looks for this ID)*.
7. Click **Create**.

---

## 🔑 8. Jenkins: Connecting to the Kubernetes Server

Because the final step of the `Jenkinsfile` connects to your Production server to run `helm upgrade`, Jenkins needs the SSH key (`jenkins-v2.pem`).

1. SSH into the Jenkins server terminal.
2. Run these exact commands to switch to the Jenkins user and add the key:
```bash
sudo su - jenkins
mkdir -p ~/.ssh
nano ~/.ssh/k8s.pem
```
3. Paste the entire contents of your Kubernetes server's PEM key (including `-----BEGIN RSA PRIVATE KEY-----`) into the editor.
4. Press `Ctrl+O`, `Enter`, then `Ctrl+X` to save and exit.
5. Secure the key:
```bash
chmod 400 ~/.ssh/k8s.pem
exit
```

---

## 🔗 9. Creating the GitHub Webhook

This links GitHub and Jenkins so builds start automatically.

1. **In Jenkins:**
   - Click **New Item**.
   - Name: `draftmate-pipeline` -> Select **Pipeline** -> OK.
   - Under **Build Triggers**, check **"GitHub hook trigger for GITScm polling"**.
   - Under **Pipeline**, change Definition to **"Pipeline script from SCM"**.
   - SCM: `Git`.
   - Repository URL: `https://github.com/Preetkakdiya/draftmate_frontend_main_2.git`.
   - Branch Specifier: `*/preet/k8s-setup` (Make sure this is correct!).
   - **Script Path:** `Jenkinsfile` *(This is the most important part! It tells Jenkins to search the root of your GitHub repository for the file literally named 'Jenkinsfile' and execute it).*
   - Click **Save**.

2. **In GitHub:**
   - Go to your Repository -> **Settings** -> **Webhooks** -> **Add webhook**.
   - **Payload URL:** `http://<JENKINS-EC2-PUBLIC-IP>:8080/github-webhook/` *(Do not forget the trailing slash `/` at the very end!)*.
   - **Content type:** `application/json`.
   - **Events:** Just the `push` event.
   - Click **Add webhook**.

<!-- Test webhook trigger -->
