# ☁️ Cloud Assignment Manager

A simple, clean, and professional student assignment management web application built with **Node.js**, **Express.js**, and **EJS**.

This project serves as a college mini-project for **Cloud-Based Application Deployment on AWS**.

---

## 🎯 Features

- 📊 **Dashboard:** Real-time assignment overview (Total, Submitted, Pending) with quick action cards.
- 📚 **Assignment Catalog:** View active course assignments, subjects, deadlines, and submission statuses.
- 📤 **Local File Upload:** Submit assignment documents (PDF, DOC, DOCX, PPT, PPTX) handled with Multer.
- 🗂️ **My Files:** View and download submitted files with storage status tracking.
- ☁️ **AWS Cloud Ready:** Architected for seamless drop-in integration with Amazon S3, EC2, IAM, CloudWatch, and SNS in the next phase.

---

## 🏗️ Project Structure

```text
cloud-assignment-manager/
│
├── app.js               # Express server, mock database, routing & upload handling
├── package.json         # Minimal dependencies (express, ejs, multer)
├── .gitignore           # Ignores node_modules, .env, uploads/*, *.pem
├── README.md            # Project documentation
│
├── views/               # EJS view templates
│   ├── index.ejs        # Dashboard view
│   ├── assignments.ejs  # Assignments list view
│   ├── upload.ejs       # File upload form view
│   └── files.ejs        # Submitted files list & download view
│
├── public/              # Static frontend assets
│   ├── style.css        # Clean, modern responsive CSS
│   └── script.js        # Drag-and-drop & UI interactions
│
└── uploads/             # Temporary local storage for submitted files
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed (v16 or higher).

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RajBhokare/CC-Mini-Project-Cloud-Assignment-Manager.git
   cd CC-Mini-Project-Cloud-Assignment-Manager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Access the web app:**
   Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

---

## 🔮 Future AWS Deployment Architecture

In the upcoming cloud integration phase:
- **Compute:** The Express.js server will be hosted on an **AWS EC2** Ubuntu instance.
- **Storage:** Local `uploads/` will be transitioned to **Amazon S3** object storage.
- **Security:** EC2 will utilize **AWS IAM Roles** (no hardcoded keys).
- **Monitoring & Alerts:** **Amazon CloudWatch** for system logs and **Amazon SNS** for automated email alerts on submission.