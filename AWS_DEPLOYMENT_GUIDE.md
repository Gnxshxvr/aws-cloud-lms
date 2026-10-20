# AWS Deployment Guide: Cloud-Native Academic Submission Portal

This guide provides step-by-step instructions for deploying the **Academic Submission Portal** to Amazon Web Services (AWS) using **Amazon EC2**, **Amazon RDS (PostgreSQL)**, **Amazon S3**, **Amazon CloudWatch**, **AWS IAM**, and **Amazon VPC**.

---

## 🏗️ Architecture Overview & AWS Services Used

```
                         Internet / Students & Faculty
                                      │
                                      ▼
                        ┌──────────────────────────┐
                        │   Amazon VPC (10.0.0.0)  │
                        │                          │
                        │   ┌──────────────────┐   │
                        │   │    Amazon EC2    │   │
                        │   │   Ubuntu 24.04   │   │
                        │   │                  │   │
                        │   │ ┌──────────────┐ │   │
                        │   │ │    Nginx     │ │   │ (Reverse Proxy & Static Files)
                        │   │ └──────┬───────┘ │   │
                        │   │        │ :5000   │   │
                        │   │ ┌──────▼───────┐ │   │
                        │   │ │  Node.js API │ │   │ (Express + TypeScript under PM2)
                        │   │ └──────┬───────┘ │   │
                        │   └────────┼─────────┘   │
                        │            │             │
                        │     :5432  ▼             │
                        │   ┌──────────────────┐   │
                        │   │ Amazon RDS Postgre│  │ (Encrypted Multi-AZ / Single-AZ)
                        │   │ student_portal   │   │
                        │   └──────────────────┘   │
                        └────────────┬─────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
        ┌──────────────────┐                   ┌──────────────────┐
        │    Amazon S3     │                   │ Amazon CloudWatch│
        │ Submission Files │                   │ Operational Logs │
        │  & Reference Docs│                   │ & System Metrics │
        └──────────────────┘                   └──────────────────┘
```

### AWS Services Breakdown

| AWS Service | Purpose in this Architecture |
|---|---|
| **Amazon EC2** | Compute instance hosting the Nginx web server and PM2 Node.js backend. |
| **Amazon S3** | Encrypted object storage for student deliverables (PDFs, ZIPs) and faculty reference materials via presigned URLs. |
| **Amazon RDS (PostgreSQL)** | Managed database storing institutional users, courses, rosters, assignments, and audit logs. |
| **Amazon CloudWatch** | Real-time monitoring and central log ingestion into the `/aws/student-portal` log stream. |
| **AWS IAM** | EC2 Instance Profile Role granting scoped access to S3 and CloudWatch without hardcoding root credentials. |
| **Amazon VPC & Security Groups** | Network isolation ensuring the RDS database is only reachable by the EC2 instance on port 5432. |

---

## 🚀 Deployment Method 1: Automated Deployment via AWS CloudFormation (Recommended)

The repository includes a ready-to-use template in [`infrastructure/cloudformation.yaml`](./infrastructure/cloudformation.yaml).

### Steps in the AWS Management Console:
1. Open the **[AWS CloudFormation Console](https://console.aws.amazon.com/cloudformation)**.
2. Ensure you have chosen your preferred region (e.g., `us-east-1` or `ap-south-1`).
3. Click **Create stack** → **With new resources (standard)**.
4. Select **Template is ready** → **Upload a template file**.
5. Upload [`infrastructure/cloudformation.yaml`](./infrastructure/cloudformation.yaml) from your computer.
6. Click **Next** and fill in parameters:
   - **Stack name:** `student-submission-portal`
   - **DBUsername:** `dbadmin` (default)
   - **DBPassword:** Set a strong password (e.g., `PortalSecurePass2026!`)
   - **KeyName:** Select an existing EC2 Key Pair (or leave empty if using AWS EC2 Instance Connect).
7. Click **Next** → **Next**.
8. At the bottom of the review page, acknowledge the IAM capabilities checkbox:  
   ☑ *"I acknowledge that AWS CloudFormation might create IAM resources with custom names."*
9. Click **Submit**.
10. Wait ~8–10 minutes until stack status is **CREATE_COMPLETE**.
11. Go to the **Outputs** tab and copy:
    - **`EC2PublicIP`**
    - **`S3BucketName`**
    - **`RDSEndpoint`**

---

## 🛠️ Deployment Method 2: Manual Setup via AWS Console

### Step 1: Create the Amazon S3 Bucket
1. Open **[Amazon S3 Console](https://console.aws.amazon.com/s3)** → **Create bucket**.
2. **Bucket name**: e.g., `aws-student-portal-submissions-yourname` (must be globally unique).
3. **Region**: e.g., `us-east-1`.
4. Keep **Block all public access** checked (files are accessed securely via presigned URLs).
5. Enable **Server-side encryption** (SSE-S3).
6. Under **Permissions** → **Cross-origin resource sharing (CORS)**, paste:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
       "AllowedOrigins": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

### Step 2: Create the Amazon RDS PostgreSQL Database
1. Open **[Amazon RDS Console](https://console.aws.amazon.com/rds)** → **Create database**.
2. Engine: **PostgreSQL** (version 16.x).
3. Template: **Free Tier** (uses `db.t4g.micro` or `db.t3.micro`).
4. **DB instance identifier**: `student-portal-db`.
5. **Master username**: `dbadmin`.
6. **Master password**: `PortalSecurePass2026!`.
7. Under **Connectivity**:
   - **Public access**: `No`.
   - Security Group: Create new, named `rds-postgres-sg`.
8. Under **Additional configuration**:
   - **Initial database name**: `student_portal`.
9. Click **Create database** and copy the **Endpoint** once created.

### Step 3: Create the EC2 IAM Role
1. Open **[IAM Console](https://console.aws.amazon.com/iam)** → **Roles** → **Create role**.
2. Trusted entity: **AWS Service** → **EC2**.
3. Attach policies:
   - `AmazonS3FullAccess` (or scoped policy from [`infrastructure/iam-policies.json`](./infrastructure/iam-policies.json))
   - `CloudWatchLogsFullAccess`
4. Name the role: `StudentPortal-EC2-Role`.

### Step 4: Launch the EC2 Instance
1. Open **[Amazon EC2 Console](https://console.aws.amazon.com/ec2)** → **Launch instance**.
2. **Name**: `student-portal-web-server`.
3. **OS**: **Ubuntu 24.04 LTS** (or 22.04 LTS).
4. **Instance Type**: `t3.small` (recommended) or `t3.micro`.
5. **Security Group Inbound Rules**:
   - HTTP (80) → `0.0.0.0/0`
   - HTTPS (443) → `0.0.0.0/0`
   - SSH (22) → `My IP` (or `0.0.0.0/0`)
6. **Advanced details** → **IAM instance profile**: Select `StudentPortal-EC2-Role`.
7. Launch the instance.

### Step 5: Link EC2 to RDS Security Group
1. Go to **EC2** → **Security Groups** → Open `rds-postgres-sg`.
2. Add Inbound Rule:
   - **Type**: PostgreSQL (port 5432)
   - **Source**: Select your EC2 Security Group ID (`sg-xxxx`).

---

## 💻 Server Configuration on the EC2 Instance

Once your EC2 instance is running, connect using **EC2 Instance Connect** or SSH:

```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### 1. Install System Dependencies & Node.js 22 LTS
```bash
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl git nginx build-essential

# Install Node.js 22 LTS & PM2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2 tsx
```

### 2. Clone the Repository
```bash
sudo mkdir -p /var/www/student-portal
sudo chown -R ubuntu:ubuntu /var/www/student-portal
git clone https://github.com/prasannasenthilrajan74-oss/aws-project.git /var/www/student-portal
cd /var/www/student-portal
```

### 3. Create the Production `.env`
```bash
nano /var/www/student-portal/backend/.env
```

Paste and adapt the following configuration:

```env
PORT=5000
NODE_ENV=production
CLIENT_URL=http://<YOUR_EC2_PUBLIC_IP>

# Database Configuration (Point to Amazon RDS Endpoint)
DB_TYPE=postgres
DATABASE_URL=postgresql://dbadmin:PortalSecurePass2026!@<RDS_ENDPOINT>:5432/student_portal
PGHOST=<RDS_ENDPOINT>
PGPORT=5432
PGUSER=dbadmin
PGPASSWORD=PortalSecurePass2026!
PGDATABASE=student_portal

# AWS Configuration (Resolved automatically via EC2 IAM Instance Profile Role)
AWS_REGION=us-east-1
AWS_S3_BUCKET=<YOUR_S3_BUCKET_NAME>
USE_LOCAL_STORAGE=false

# CloudWatch Logging
CLOUDWATCH_ENABLED=true
CLOUDWATCH_LOG_GROUP=/aws/student-portal
CLOUDWATCH_LOG_STREAM=api-server

# Admin Credentials
ADMIN_EMAIL=admin@portal.edu
ADMIN_PASSWORD=AdminPassword123!
ADMIN_NAME=System Administrator
JWT_SECRET=super-secret-jwt-key-aws-student-portal-production-ready
JWT_EXPIRES_IN=7d
```

### 4. Build and Start Backend under PM2
```bash
cd /var/www/student-portal/backend
npm install
npm run build
pm2 start dist/server.js --name "student-portal-backend"
pm2 save
pm2 startup
```

*(The backend automatically creates all PostgreSQL tables and initial seed data on startup).*

### 5. Build Frontend & Configure Nginx
```bash
cd /var/www/student-portal/frontend
npm install
npm run build

# Deploy Nginx configuration
sudo cp /var/www/student-portal/infrastructure/nginx.conf /etc/nginx/sites-available/student-portal
sudo ln -sf /etc/nginx/sites-available/student-portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## ✅ Verifying Your Deployment

1. **Visit the Web Portal:**
   Open `http://<EC2_PUBLIC_IP>` in your browser.
2. **Log in with Admin credentials:**
   - **Email:** `admin@portal.edu`
   - **Password:** `AdminPassword123!`
3. **Verify S3 & Database:**
   - Go to **Course Management** (`/admin/courses`) and create a course.
   - Go to **AWS Infrastructure** (`/admin/infrastructure`) to view live CloudWatch, S3, and RDS connectivity indicators.
4. **CloudWatch Logs:**
   Open **AWS CloudWatch Console** → **Log groups** → `/aws/student-portal` → `api-server` to see live streaming logs.

---

## 🔒 Optional: Add HTTPS with Free Let's Encrypt SSL
If you have a custom domain name (e.g. `portal.youruniversity.edu`) pointing to your EC2 public IP:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d portal.youruniversity.edu
```
Certbot will automatically install and configure your SSL certificates.
