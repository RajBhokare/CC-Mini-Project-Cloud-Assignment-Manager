# Cloud Assignment Manager

> A secure, cloud-deployed student assignment management web application built with **Node.js**, **Express.js**, **EJS**, and deployed on **Amazon Web Services (AWS)** using **EC2**, **S3**, **IAM**, **CloudWatch**, and **SNS**.

[![AWS Deployment](https://img.shields.io/badge/AWS-EC2%20%7C%20S3%20%7C%20IAM%20%7C%20CloudWatch%20%7C%20SNS-orange.svg)](https://aws.amazon.com/)
[![Runtime](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Framework](https://img.shields.io/badge/Express.js-v4.21-blue.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-Academic%20Mini%20Project-lightgrey.svg)]()

---

## 📌 1. Project Overview

**Cloud Assignment Manager** is an academic mini project designed for the **Cloud Computing (CC)** course. It illustrates the complete transition from local web hosting to a decoupled, resilient, and secure AWS cloud architecture.

### Key Capabilities:
- **Interactive Dashboard:** View assignment progress statistics, recent activity, and cloud infrastructure connection state.
- **Assignment Catalog:** Browse course assignments, subject details, course codes, submission deadlines, and status badges.
- **Document Ingestion:** Upload assignment files (PDF, DOC, DOCX, PPT, PPTX, TXT, ZIP) with student details and 10MB size enforcement.
- **Amazon S3 Object Storage:** Decouples file storage from EC2 virtual machine storage; files are encrypted at rest with **Server-Side Encryption (AES-256)**.
- **Secure File Access:** Assignment files are stored in a private S3 bucket (Block Public Access enabled) and accessed securely using short-lived **AWS S3 Presigned URLs** (15 minutes).
- **IAM Instance Profile Security:** Zero hardcoded credentials. EC2 automatically acquires least-privilege temporary credentials using the `CloudAssignmentEC2Role` IAM role via the Instance Metadata Service (IMDS).
- **Cloud Monitoring & Alerting:** **Amazon CloudWatch** monitors EC2 metrics (CPU, Status, Network) and triggers **Amazon SNS** email notifications if CPU usage exceeds 70%.

---

## ⚡ Quick Run Guide (For Evaluators & Collaborators)

### 🚀 1. Access the Live AWS Cloud Deployment (Direct Links)
The application is deployed on Amazon EC2 (`eu-north-1`) with Amazon S3 object storage:
- **Dashboard:** [http://13.51.72.30:3000](http://13.51.72.30:3000)
- **Assignments:** [http://13.51.72.30:3000/assignments](http://13.51.72.30:3000/assignments)
- **File Upload:** [http://13.51.72.30:3000/upload](http://13.51.72.30:3000/upload)
- **My Files:** [http://13.51.72.30:3000/files](http://13.51.72.30:3000/files)
- **Health Check:** [http://13.51.72.30:3000/health](http://13.51.72.30:3000/health)

---

### ☁️ 2. Manage on AWS EC2 (SSH Commands)
```bash
# 1. Connect to EC2
ssh -i "path/to/cloud-assignment-key.pem" ubuntu@13.51.72.30

# 2. Check application status
pm2 status

# 3. View live logs (CloudWatch Logger & S3 uploads)
pm2 logs cloud-assignment-manager

# 4. Pull updates and restart
cd ~/CC-Mini-Project-Cloud-Assignment-Manager
git pull origin main
pm2 restart cloud-assignment-manager

# 5. Inspect S3 bucket objects via AWS CLI
aws s3 ls s3://cc-assignment-manager-raj-2026/ --recursive --region eu-north-1
```

---

### 💻 3. Run Locally on Any Computer (Windows / Mac / Linux)
```bash
# 1. Clone repository
git clone https://github.com/RajBhokare/CC-Mini-Project-Cloud-Assignment-Manager.git
cd CC-Mini-Project-Cloud-Assignment-Manager

# 2. Install dependencies
npm install

# 3. Set environment variables (Optional: defaults to Local Staging Mode)
cp .env.example .env

# 4. Start the server
npm start
# Open in browser: http://localhost:3000
```

---

### 🎯 4. Two-Minute Practical Exam Demonstration Guide
1. Open **[http://13.51.72.30:3000/upload](http://13.51.72.30:3000/upload)** and upload a PDF document.
2. Watch the green notification appear on **`/files`** displaying storage badge: `☁️ Amazon S3`.
3. Click **View** or **Download**: Observe the secure redirect to an Amazon S3 Presigned URL.
4. Open the AWS S3 Console (`cc-assignment-manager-raj-2026`) or run `aws s3 ls s3://cc-assignment-manager-raj-2026/assignments/` to show the file is physically stored in Amazon S3.
5. Visit **`/health`** to show the healthy JSON status check.

## 🏗️ 2. System Architecture

### High-Level Architecture Diagram

```text
                                  ┌───────────────────────────┐
                                  │      Student / Client     │
                                  │        Web Browser        │
                                  └─────────────┬─────────────┘
                                                │
                                    HTTP / HTTPS (Port 80/3000)
                                                │
                                                ▼
                        ┌──────────────────────────────────────────────┐
                        │              Amazon EC2 Instance             │
                        │           (Ubuntu Linux - t3.micro)          │
                        │                                              │
                        │   ┌──────────────────────────────────────┐   │
                        │   │        Node.js + Express.js          │   │
                        │   │      Cloud Assignment Manager        │   │
                        │   │          (Process: PM2)              │   │
                        │   └──────────────────┬───────────────────┘   │
                        │                      │                       │
                        │                      │ IMDSv2 Credential     │
                        │                      │ Provider Chain        │
                        │                      ▼                       │
                        │             CloudAssignmentEC2Role           │
                        └──────────────────────┬───────────────────────┘
                                               │
                                  AWS SDK v3 (PutObject / GetObject)
                                               │
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │               Amazon S3 Bucket               │
                        │       (Private, Block Public Access)         │
                        │                                              │
                        │   📁 assignments/                            │
                        │       ├── student_report-1792...pdf          │
                        │       └── dbms_schema-1792...docx            │
                        │                                              │
                        │   🔒 Server-Side Encryption: AES-256 (SSE-S3)│
                        │   🔗 Presigned URLs for Secure Downloads     │
                        └──────────────────────────────────────────────┘

                                               │
                                       EC2 System Metrics
                                               │
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │              Amazon CloudWatch               │
                        │   - CPUUtilization Metric                    │
                        │   - StatusCheckFailed_System / Instance      │
                        │   - NetworkIn / NetworkOut                   │
                        │   - Alarm: CPUUtilization > 70% for 5 min    │
                        └──────────────────────┬───────────────────────┘
                                               │
                                         Triggers Alarm
                                               │
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │                  Amazon SNS                  │
                        │           "CloudAssignmentAlerts"            │
                        │                                              │
                        │   📧 Email Notification to Administrator     │
                        └──────────────────────────────────────────────┘
```

### Application Data Flow
1. **Student** opens the web application and uploads an assignment document via the web form.
2. **Multer** receives the multipart form data into memory (`multer.memoryStorage()`) to prevent unnecessary disk wear on the EC2 root volume.
3. **Express.js** calls `@aws-sdk/client-s3` (`PutObjectCommand`) using credentials granted by the attached EC2 IAM Role.
4. The file is uploaded to the private **Amazon S3** bucket under the key `assignments/<filename>-<timestamp>.<ext>` with **AES-256** encryption.
5. On the **My Files** page, files are retrieved directly from S3 using `ListObjectsV2Command`.
6. When a user clicks **View** or **Download**, the server generates a time-limited **Presigned URL** (`@aws-sdk/s3-request-presigner`), securely streaming the object without exposing bucket credentials or making the bucket public.

---

## 🧰 3. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Structure** | HTML5 / EJS Templates | Dynamic server-side rendering of pages |
| **Styling** | Vanilla CSS3 (Custom Design System) | Clean, responsive, cloud-themed student portal |
| **Client Scripting** | Vanilla JavaScript | Drag-and-drop file upload, alert dismissals, UI toggles |
| **Backend Framework** | Node.js (v20+) & Express.js (v4.21) | Application routing, middleware, REST endpoints |
| **Upload Handling** | Multer (v1.4) | Memory buffer management and file type/size validation |
| **AWS SDK** | `@aws-sdk/client-s3` & `@aws-sdk/s3-request-presigner` (v3) | S3 object ingestion, listing, and presigned URL signing |
| **Compute** | Amazon EC2 (`t3.micro`, Ubuntu Linux) | Virtual machine hosting the Node.js application |
| **Cloud Storage** | Amazon S3 (eu-north-1) | Secure object storage for student assignment files |
| **Access Control** | AWS IAM (`CloudAssignmentEC2Role`) | Credential-free authentication from EC2 to S3 |
| **Monitoring** | Amazon CloudWatch | Infrastructure metric tracking and CPU alarm configuration |
| **Alerting** | Amazon SNS (`CloudAssignmentAlerts`) | Automated email notifications for high CPU utilization |

---

## 📁 4. Project Directory Structure

```text
CC-Mini-Project-Cloud-Assignment-Manager/
├── .env.example            # Environment variables configuration template
├── .gitignore              # Strict exclusions for .env, node_modules, *.pem
├── package.json            # Node.js dependencies and run scripts
├── package-lock.json       # Exact dependency lockfile
├── app.js                  # Main Express application with AWS SDK v3 integration
├── README.md               # Complete project documentation and deployment manual
├── public/
│   ├── style.css           # Clean, professional cloud-themed CSS styling
│   └── script.js          # Interactive client-side JavaScript (drag & drop, modals)
├── views/
│   ├── index.ejs           # Home dashboard (stats, upcoming tasks, cloud status)
│   ├── assignments.ejs     # Course assignment listing & submission links
│   ├── upload.ejs          # File upload interface with drag & drop and validation
│   └── files.ejs           # Submitted files table with presigned View & Download
└── uploads/
    └── .gitkeep            # Staging folder for local offline testing
```

---

## 🔑 5. Environment Variables Configuration

To run the application, create a `.env` file in the project root by copying the provided `.env.example`:

```bash
cp .env.example .env
```

### What You Need to Provide in `.env`:

```env
# Application Port (Default: 3000)
PORT=3000

# AWS Region where EC2 and S3 are deployed
AWS_REGION=eu-north-1

# Amazon S3 Bucket Name (Private bucket created in your AWS account)
S3_BUCKET_NAME=cc-assignment-manager-raj-2026
```

> [!IMPORTANT]
> **No AWS Access Keys Needed in `.env`:**
> When the application runs on your Amazon EC2 instance with the `CloudAssignmentEC2Role` IAM role attached, the AWS SDK automatically fetches temporary credentials through the EC2 Instance Metadata Service.
> **NEVER** put `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in `.env` or commit `.env` to GitHub.

---

## 💻 6. Local Development Setup

To test the application locally on your computer:

### 1. Clone the repository:
```bash
git clone https://github.com/RajBhokare/CC-Mini-Project-Cloud-Assignment-Manager.git
cd CC-Mini-Project-Cloud-Assignment-Manager
```

### 2. Install dependencies:
```bash
npm install
```

### 3. Configure environment variables (Optional for local testing):
```bash
cp .env.example .env
```
*(If `S3_BUCKET_NAME` is left blank or unset, the application automatically activates **Local Staging Mode**, saving uploads to `uploads/` for offline testing).*

### 4. Start the server:
```bash
npm start
# or for auto-restart with development:
npm run dev
```

### 5. Access the application:
- Web App: `http://localhost:3000`
- Health Check: `http://localhost:3000/health`

---

## ☁️ 7. Step-by-Step AWS Deployment Guide

### Step 7.1 — Create Amazon S3 Bucket
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/) and navigate to **Amazon S3**.
2. Click **Create bucket**.
3. **Bucket name:** `cc-assignment-manager-raj-2026` (or your globally unique bucket name).
4. **AWS Region:** Select `eu-north-1` (Stockholm) to match your EC2 instance.
5. **Object Ownership:** Keep *ACLs disabled (recommended)*.
6. **Block Public Access settings for this bucket:** Ensure **Block *all* public access** is **CHECKED** (enabled).
7. **Bucket Versioning:** Optional (keep disabled to stay within free tier).
8. **Default encryption:** Select **Server-side encryption with Amazon S3 managed keys (SSE-S3)**.
9. Click **Create bucket**.

---

### Step 7.2 — Configure IAM Role (`CloudAssignmentEC2Role`)
1. In the AWS Console, navigate to **IAM** -> **Roles** -> **Create role**.
2. **Trusted entity type:** Select **AWS service**.
3. **Use case:** Select **EC2**.
4. Click **Next**.
5. Click **Create policy** (opens in a new tab) -> Choose **JSON** tab and paste the least-privilege policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VisualEditor0",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::cc-assignment-manager-raj-2026",
        "arn:aws:s3:::cc-assignment-manager-raj-2026/*"
      ]
    }
  ]
}
```
*(Replace `cc-assignment-manager-raj-2026` if using a different bucket name).*

6. Name the policy `CloudAssignmentS3Policy` and save it.
7. Return to the Create Role tab, refresh the policies, select `CloudAssignmentS3Policy`, and click **Next**.
8. Set the **Role name** to:
   ```text
   CloudAssignmentEC2Role
   ```
9. Click **Create role**.

---

### Step 7.3 — Attach IAM Role to EC2 Instance
1. Go to **EC2 Console** -> **Instances**.
2. Select your running Ubuntu instance (`t3.micro`, region `eu-north-1`).
3. Click **Actions** -> **Security** -> **Modify IAM role**.
4. Select `CloudAssignmentEC2Role` from the dropdown.
5. Click **Update IAM role**.

---

### Step 7.4 — Configure EC2 Security Group
In the EC2 Console, navigate to your instance's **Security Groups** and verify inbound rules:

| Type | Protocol | Port Range | Source | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | TCP | `22` | `My IP` (e.g. `your.ip.address/32`) | Secure terminal access |
| **HTTP** | TCP | `80` | `0.0.0.0/0` | Public web application access |
| **Custom TCP** | TCP | `3000` | `0.0.0.0/0` (or `My IP`) | Direct Node.js application access |

*(Never open port 22 to `0.0.0.0/0` to prevent unauthorized brute-force attempts).*

---

### Step 7.5 — SSH into EC2 & Deploy Application
Open your terminal on your computer and connect to the EC2 server:

```bash
ssh -i "path/to/your-key.pem" ubuntu@<EC2_PUBLIC_IP>
```

Once logged into Ubuntu, execute:

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Git and build tools
sudo apt install -y git curl

# 3. Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
node -v
npm -v

# 4. Clone the repository
git clone https://github.com/RajBhokare/CC-Mini-Project-Cloud-Assignment-Manager.git
cd CC-Mini-Project-Cloud-Assignment-Manager

# 5. Install production dependencies
npm install

# 6. Configure environment variables
cat << 'EOF' > .env
PORT=3000
AWS_REGION=eu-north-1
S3_BUCKET_NAME=cc-assignment-manager-raj-2026
EOF

# 7. Install PM2 Process Manager for persistent background execution
sudo npm install -g pm2

# 8. Start application with PM2
pm2 start app.js --name "cloud-assignment-manager"

# 9. Configure PM2 to automatically restart on server reboots
pm2 startup
pm2 save
```

### Useful Server Management Commands:
```bash
# View application logs
pm2 logs cloud-assignment-manager

# Restart application after updates
pm2 restart cloud-assignment-manager

# Check process status
pm2 status

# Pull newest code from GitHub and restart
git pull origin main
npm install
pm2 restart cloud-assignment-manager
```

---

### Step 7.6 — (Optional Production) Configure Nginx Reverse Proxy
To serve the app cleanly on standard HTTP port **80** without typing `:3000` in the browser:

```bash
# Install Nginx
sudo apt install -y nginx

# Configure reverse proxy
sudo tee /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    client_max_body_size 15M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Test and reload Nginx
sudo nginx -t
sudo systemctl restart nginx
```
*Now, visit `http://<EC2_PUBLIC_IP>` directly!*

---

## 📊 8. Amazon CloudWatch Monitoring Setup

Amazon CloudWatch provides operational monitoring and alarm metrics for your EC2 instance.

### Default EC2 Hypervisor Metrics (No Agent Required):
- **CPUUtilization:** Percentage of allocated compute units currently in use.
- **NetworkIn / NetworkOut:** Volume of incoming and outgoing network traffic.
- **StatusCheckFailed_System:** Checks AWS systems hosting your instance.
- **StatusCheckFailed_Instance:** Checks whether your instance operating system is reachable.

### Optional OS-Level Metrics (Requires CloudWatch Agent):
- `mem_used_percent` (RAM utilization)
- `disk_used_percent` (Disk storage consumption)

---

## 🚨 9. Amazon SNS & CloudWatch Alarm Setup

### Step 9.1 — Create SNS Topic (`CloudAssignmentAlerts`)
1. In the AWS Console, navigate to **Amazon SNS** -> **Topics** -> **Create topic**.
2. **Type:** Select **Standard**.
3. **Name:** `CloudAssignmentAlerts`.
4. Click **Create topic**.
5. Under the **Subscriptions** tab, click **Create subscription**:
   - **Protocol:** Select **Email**.
   - **Endpoint:** Enter your email address.
   - Click **Create subscription**.
6. Check your inbox and click the **Confirm subscription** link. The status will change to **Confirmed**.

### Step 9.2 — Create CloudWatch CPU Alarm
1. In the AWS Console, navigate to **Amazon CloudWatch** -> **Alarms** -> **Create alarm**.
2. Click **Select metric** -> **EC2** -> **Per-Instance Metrics**.
3. Locate your instance ID and select `CPUUtilization`.
4. Set the **Period** to **5 minutes**.
5. Under **Conditions**:
   - **Threshold type:** Static
   - **Whenever CPUUtilization is...:** Greater than `70`
6. Click **Next**.
7. Under **Notification**:
   - **Alarm state trigger:** In alarm
   - **Send a notification to:** Select an existing SNS topic -> choose `CloudAssignmentAlerts`.
8. Click **Next** -> **Alarm name:** `EC2-High-CPU-Utilization-Alarm`.
9. Click **Create alarm**.

### Step 9.3 — Simulate High CPU to Test Alarm (Optional)
To verify the alarm and email notification:
```bash
# Connect to EC2 and run a CPU stress test for 6 minutes:
sudo apt install -y stress
stress --cpu 2 --timeout 360s
```
*You will receive an automated email alert from Amazon SNS when CPU exceeds 70%!*

---

## 🧪 10. Verification & Testing Procedure

| Test Case | Procedure | Expected Result | Verified |
| :--- | :--- | :--- | :---: |
| **TC-01: Health Endpoint** | Visit `http://<EC2_IP>:3000/health` | Returns JSON status `healthy` with region and bucket | `[x]` |
| **TC-02: Dashboard Load** | Visit `http://<EC2_IP>:3000/` | Displays cards, metrics, and AWS architecture banner | `[x]` |
| **TC-03: Assignment List** | Visit `/assignments` | Lists 5 assignments with deadlines and "Submit" links | `[x]` |
| **TC-04: File Validation** | Upload an unsupported `.exe` or file > 10MB | Rejects with clear red error flash message | `[x]` |
| **TC-05: S3 Upload** | Upload `sample.pdf` via `/upload` | Redirects to `/files` with green success notification | `[x]` |
| **TC-06: S3 Bucket Check** | Inspect AWS S3 Console | Object appears in `assignments/` folder with AES-256 | `[x]` |
| **TC-07: Presigned View** | Click **View** on `/files` | Browser opens S3 object securely in a new tab | `[x]` |
| **TC-08: Presigned Download** | Click **Download** on `/files` | File downloads directly to user's computer | `[x]` |
| **TC-09: Process Persistence**| Run `sudo reboot` on EC2 | Node.js automatically resumes via PM2 startup hook | `[x]` |

---

## 💰 11. Cost Optimization & Cleanup

This project is architected specifically to minimize cloud cost while demonstrating enterprise cloud concepts:

- **Single `t3.micro` EC2:** Eligible for the AWS Free Tier (750 hours/month).
- **Amazon S3 Standard:** Free Tier covers 5GB of storage, 20,000 GET requests, and 2,000 PUT requests.
- **CloudWatch Free Tier:** Free Tier includes 10 basic metrics and 10 alarms.
- **Amazon SNS:** First 1,000 email notifications per month are free.
- **Intentionally Avoided Costly Services:** No Amazon RDS database, NAT Gateways, Elastic Load Balancers, or OpenSearch clusters.

### Cleanup Instructions (After Practical Examination):
To avoid recurring AWS charges after your project evaluation:
```bash
# 1. Delete S3 objects and bucket:
aws s3 rm s3://your-s3-bucket-name --recursive
aws s3 rb s3://your-s3-bucket-name

# 2. Terminate EC2 instance in the AWS Console.
# 3. Delete CloudWatch Alarm ("EC2-High-CPU-Utilization-Alarm").
# 4. Delete SNS Topic ("CloudAssignmentAlerts").
```

---

## 🎓 12. Course Outcome (CO) Mapping

| Course Outcome | Description | Demonstrated Implementation in Project |
| :---: | :--- | :--- |
| **CO1** | Understand cloud computing architecture, models, and virtualization | Designed a decoupled 3-tier cloud architecture separating compute (EC2), storage (S3), and access control (IAM). |
| **CO2** | Configure and deploy virtual instances on IaaS platforms | Deployed and configured a Node.js web application on an Amazon EC2 Ubuntu Linux virtual machine. |
| **CO3** | Implement secure cloud storage, IAM roles, and monitoring | Configured private Amazon S3 with SSE-S3 encryption, presigned URLs, EC2 IAM Instance Profile, CloudWatch, and SNS. |
| **CO4** | Evaluate and demonstrate practical cloud solutions | End-to-end working assignment management portal with remote deployment, health checks, and alerting. |

---

## 📸 13. Recommended Screenshots for Final Mini Project Report

Capture the following 12 screenshots for your practical exam submission:

1. **Application Dashboard:** Browser showing `http://<EC2_IP>:3000/` with AWS Architecture metrics.
2. **Assignment Catalog:** Browser view of `/assignments` showing pending and submitted items.
3. **Upload Form:** Form view showing student name, selected assignment, and drag-and-drop box.
4. **Successful Submission:** Green banner confirmation and submission recorded in `/files`.
5. **Secure Document View:** Document viewed securely in browser via S3 Presigned URL.
6. **EC2 Instance Console:** AWS Console displaying the running Ubuntu `t3.micro` instance and public IP.
7. **Security Group Rules:** Inbound rules showing SSH (port 22) and Web (port 80/3000).
8. **IAM Role Details:** `CloudAssignmentEC2Role` attached to EC2 with S3 policy.
9. **S3 Bucket Console:** Bucket properties showing **Block Public Access: Enabled** and **Default Encryption: AES-256**.
10. **S3 Objects Ingested:** S3 bucket list displaying uploaded assignment files under `assignments/`.
11. **CloudWatch Metrics Dashboard:** CPU utilization graph and status check graphs.
12. **Amazon SNS Alert:** Email inbox displaying the confirmed subscription and CPU alert email.

---

## 📌 14. Project Implementation Status

| Component | Status | Details |
| :--- | :---: | :--- |
| **Express & EJS Web Interface** | ✅ Completed | Clean, responsive student portal with dynamic stats |
| **File Upload & Validation** | ✅ Completed | 10MB limit, file extension filter, error handling |
| **AWS SDK v3 S3 Integration** | ✅ Completed | Implemented in `app.js` using `@aws-sdk/client-s3` |
| **Server-Side Encryption** | ✅ Completed | AES-256 enabled on all S3 `PutObjectCommand` calls |
| **Presigned URLs (View/Download)** | ✅ Completed | Implemented via `@aws-sdk/s3-request-presigner` |
| **EC2 IAM Role Authentication** | ✅ Completed | Uses automatic IMDS credential chain (zero hardcoded keys) |
| **Local Staging Fallback** | ✅ Completed | Offline/local execution supported when S3 is unconfigured |
| **Health Check Endpoint** | ✅ Completed | JSON endpoint `/health` for monitoring and uptime |
| **Environment Template** | ✅ Completed | Documented in `.env.example` |
| **Amazon S3 Bucket** | 🔧 AWS Console | Create private bucket in `eu-north-1` with Block Public Access |
| **EC2 Instance Deployment** | 🔧 AWS Console | Launch Ubuntu `t3.micro` in `eu-north-1` and run PM2 |
| **CloudWatch Alarm & SNS Topic**| 🔧 AWS Console | Create `CloudAssignmentAlerts` and link to CPU > 70% alarm |

---

## 👨‍💻 Author & Project Credits

- **Developer:** Raj Bhokare
- **Project:** Cloud Assignment Manager
- **Course:** Cloud Computing (CC) Mini Project
- **GitHub Repository:** [RajBhokare/CC-Mini-Project-Cloud-Assignment-Manager](https://github.com/RajBhokare/CC-Mini-Project-Cloud-Assignment-Manager)