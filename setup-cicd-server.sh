#!/bin/bash
# ==========================================
# DraftMate CI/CD Automation Script
# Installs: Java 21, Jenkins, Docker, SonarQube, Trivy
# ==========================================

set -e # Exit immediately if a command exits with a non-zero status
echo "🚀 Starting CI/CD Server Installation..."

echo "📦 1. Updating System Packages..."
sudo apt update && sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y

echo "☕ 2. Installing Java 21..."
sudo apt install fontconfig openjdk-21-jre -y

echo "🛠️ 3. Installing Jenkins..."
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt-get update
sudo apt-get install jenkins -y
sudo systemctl enable jenkins
sudo systemctl start jenkins

echo "🐳 4. Installing Docker..."
sudo apt install docker.io -y
sudo usermod -aG docker ubuntu
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins

echo "🔎 5. Installing SonarQube (via Docker)..."
sudo docker run -d --name sonarqube -p 9000:9000 sonarqube:lts-community

echo "🛡️ 6. Installing Trivy (Security Scanner)..."
wget https://github.com/aquasecurity/trivy/releases/download/v0.70.0/trivy_0.70.0_Linux-64bit.deb
sudo dpkg -i trivy_0.70.0_Linux-64bit.deb
rm trivy_0.70.0_Linux-64bit.deb

echo "✅ Setup Complete!"
echo "------------------------------------------------"
echo "Jenkins is running on: http://<Server-IP>:8080"
echo "SonarQube is running on: http://<Server-IP>:9000"
echo "------------------------------------------------"
echo "Your initial Jenkins Admin Password is:"
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
echo "------------------------------------------------"
echo "⚠️ IMPORTANT: Please log out and log back in (or run 'newgrp docker') to use docker without sudo."
