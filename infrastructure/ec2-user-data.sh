#!/bin/bash
# ==============================================================================
# AWS EC2 BOOTSTRAP SCRIPT: STUDENT SUBMISSION PORTAL
# ==============================================================================
set -e

echo "=== [1/7] Updating system packages ==="
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git nginx build-essential certbot python3-certbot-nginx

echo "=== [2/7] Installing Node.js 22 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pm2 tsx

echo "=== [3/7] Setting up application directory ==="
mkdir -p /var/www/student-portal
cd /var/www/student-portal

# Note: In production CI/CD, code is pulled from GitHub or AWS CodeCommit:
# git clone https://github.com/your-org/aws-student-portal.git .

echo "=== [4/7] Configuring Environment Variables ==="
cat << 'EOF' > /var/www/student-portal/backend/.env
PORT=5000
NODE_ENV=production
CLIENT_URL=http://localhost

# Database Configuration (Point to Amazon RDS Endpoint from CloudFormation)
DB_TYPE=postgres
DATABASE_URL=postgresql://dbadmin:PortalSecurePass2026!@<RDS_ENDPOINT>:5432/student_portal
PGHOST=<RDS_ENDPOINT>
PGPORT=5432
PGUSER=dbadmin
PGPASSWORD=PortalSecurePass2026!
PGDATABASE=student_portal

# AWS Configuration (Resolved automatically via EC2 IAM Instance Profile Role)
AWS_REGION=us-east-1
AWS_S3_BUCKET=<S3_BUCKET_NAME>
USE_LOCAL_STORAGE=false

# CloudWatch Logging
CLOUDWATCH_ENABLED=true
CLOUDWATCH_LOG_GROUP=/aws/student-portal
CLOUDWATCH_LOG_STREAM=api-server

# Admin Credentials
ADMIN_EMAIL=admin@portal.edu
ADMIN_PASSWORD=AdminPassword123!
ADMIN_NAME=System Administrator
JWT_SECRET=production-secret-token-replace-with-secrets-manager
JWT_EXPIRES_IN=7d
EOF

echo "=== [5/7] Installing dependencies & building frontend/backend ==="
# Backend
cd /var/www/student-portal/backend
npm install
npm run build

# Frontend
cd /var/www/student-portal/frontend
npm install
npm run build

echo "=== [6/7] Configuring Nginx ==="
cp /var/www/student-portal/infrastructure/nginx.conf /etc/nginx/sites-available/student-portal
ln -sf /etc/nginx/sites-available/student-portal /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "=== [7/7] Starting Node.js backend under PM2 Process Manager ==="
cd /var/www/student-portal/backend
pm2 start dist/server.js --name "student-portal-api"
pm2 save
pm2 startup systemd -u root --hp /root

echo "=== Deployment Complete! ==="
echo "Access portal at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
