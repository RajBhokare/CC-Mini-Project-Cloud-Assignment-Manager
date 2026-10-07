/**
 * ================================================================
 * Cloud Assignment Manager - Mini Project
 * ================================================================
 * A simple, clean, student assignment management web application.
 * Designed for easy future integration with AWS (S3, EC2, CloudWatch, SNS).
 * 
 * Future Architecture:
 * Browser -> Express Server (EC2) -> Amazon S3 (Object Storage)
 * 
 * Current Mode: Local storage & In-memory mock data
 * ================================================================
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ----------------------------------------------------------------
// 1. MULTER CONFIGURATION (Local File Storage)
// ----------------------------------------------------------------
// Note for AWS Integration:
// Later, this local diskStorage can be replaced with `multer-s3`
// or the AWS SDK (@aws-sdk/client-s3) `PutObjectCommand` to stream
// uploads directly to your Amazon S3 Bucket.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate safe unique filename: originalname-timestamp.ext
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E4);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// File filter for supported academic document formats
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.zip'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Supported formats: PDF, DOC, DOCX, PPT, PPTX, TXT, ZIP'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ----------------------------------------------------------------
// 2. MIDDLEWARE & VIEW ENGINE
// ----------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------------------
// 3. IN-MEMORY MOCK DATA
// ----------------------------------------------------------------
// Standard list of college assignments
let assignments = [
  {
    id: 1,
    title: 'Cloud Computing Project',
    subject: 'Cloud Computing',
    code: 'CC-401',
    deadline: '15 Oct 2026',
    status: 'Pending',
    description: 'Design and simulate deployment of a scalable web application on AWS EC2 & S3 storage.'
  },
  {
    id: 2,
    title: 'Database Assignment',
    subject: 'DBMS',
    code: 'CS-302',
    deadline: '18 Oct 2026',
    status: 'Submitted',
    description: 'Design an ER diagram and normalized relational schema for a healthcare management portal.'
  },
  {
    id: 3,
    title: 'Operating Systems Lab',
    subject: 'Operating Systems',
    code: 'CS-304',
    deadline: '20 Oct 2026',
    status: 'Pending',
    description: 'Implement CPU scheduling algorithms (FCFS, SJF, Round Robin) in C/C++.'
  },
  {
    id: 4,
    title: 'Network Security Report',
    subject: 'Computer Networks',
    code: 'CS-305',
    deadline: '24 Oct 2026',
    status: 'Pending',
    description: 'Analyze TLS handshake protocols and Wireshark packet capture logs.'
  },
  {
    id: 5,
    title: 'Web Development Portfolio',
    subject: 'Full Stack Web Dev',
    code: 'IT-308',
    deadline: '28 Oct 2026',
    status: 'Submitted',
    description: 'Build a responsive personal developer portfolio with modern CSS and JavaScript.'
  }
];

// Submitted files history (both mock & dynamically uploaded)
let submittedFiles = [
  {
    id: 'sub-1',
    fileName: 'dbms_healthcare_schema.pdf',
    storedFileName: null, // Mock pre-seeded file
    assignmentTitle: 'Database Assignment',
    subject: 'DBMS',
    studentName: 'Raj Bhokare',
    submittedAt: '07 Oct 2026, 04:30 PM',
    fileSize: '1.4 MB',
    status: 'Submitted',
    storageLocation: 'Amazon S3 (Planned)',
    isLocal: false
  },
  {
    id: 'sub-2',
    fileName: 'web_dev_portfolio_report.pdf',
    storedFileName: null, // Mock pre-seeded file
    assignmentTitle: 'Web Development Portfolio',
    subject: 'Full Stack Web Dev',
    studentName: 'Raj Bhokare',
    submittedAt: '08 Oct 2026, 11:15 AM',
    fileSize: '2.8 MB',
    status: 'Submitted',
    storageLocation: 'Amazon S3 (Planned)',
    isLocal: false
  }
];

// Helper to format bytes to human readable size
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ----------------------------------------------------------------
// 4. APPLICATION ROUTES
// ----------------------------------------------------------------

/**
 * Route: GET /
 * Purpose: Home Dashboard with metrics, quick actions & cloud info
 */
app.get('/', (req, res) => {
  const totalAssignments = assignments.length;
  const submittedCount = assignments.filter(a => a.status === 'Submitted').length;
  const pendingCount = assignments.filter(a => a.status === 'Pending').length;

  res.render('index', {
    pageTitle: 'Dashboard',
    activePage: 'home',
    stats: {
      total: totalAssignments,
      submitted: submittedCount,
      pending: pendingCount
    },
    recentAssignments: assignments.slice(0, 3),
    recentFiles: submittedFiles.slice(0, 3)
  });
});

/**
 * Route: GET /assignments
 * Purpose: View all assignments and their status
 */
app.get('/assignments', (req, res) => {
  res.render('assignments', {
    pageTitle: 'Assignments',
    activePage: 'assignments',
    assignments: assignments
  });
});

/**
 * Route: GET /upload
 * Purpose: View assignment upload form
 */
app.get('/upload', (req, res) => {
  const selectedAssignmentId = req.query.assignmentId ? parseInt(req.query.assignmentId) : null;
  
  res.render('upload', {
    pageTitle: 'Upload Assignment',
    activePage: 'upload',
    assignments: assignments,
    selectedAssignmentId: selectedAssignmentId,
    errorMessage: null,
    successMessage: null
  });
});

/**
 * Route: POST /upload
 * Purpose: Handle assignment submission file upload
 */
app.post('/upload', (req, res) => {
  upload.single('assignmentFile')(req, res, (err) => {
    const { studentName, assignmentId } = req.body;
    const selectedAssignment = assignments.find(a => a.id === parseInt(assignmentId));

    if (err) {
      return res.status(400).render('upload', {
        pageTitle: 'Upload Assignment',
        activePage: 'upload',
        assignments: assignments,
        selectedAssignmentId: assignmentId ? parseInt(assignmentId) : null,
        errorMessage: err.message || 'File upload error occurred.',
        successMessage: null
      });
    }

    // Validation
    if (!studentName || !studentName.trim()) {
      return res.status(400).render('upload', {
        pageTitle: 'Upload Assignment',
        activePage: 'upload',
        assignments: assignments,
        selectedAssignmentId: assignmentId ? parseInt(assignmentId) : null,
        errorMessage: 'Please enter your student name.',
        successMessage: null
      });
    }

    if (!selectedAssignment) {
      return res.status(400).render('upload', {
        pageTitle: 'Upload Assignment',
        activePage: 'upload',
        assignments: assignments,
        selectedAssignmentId: null,
        errorMessage: 'Please select a valid assignment.',
        successMessage: null
      });
    }

    if (!req.file) {
      return res.status(400).render('upload', {
        pageTitle: 'Upload Assignment',
        activePage: 'upload',
        assignments: assignments,
        selectedAssignmentId: assignmentId ? parseInt(assignmentId) : null,
        errorMessage: 'Please select a file to upload.',
        successMessage: null
      });
    }

    // Format submission timestamp
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Create new submission record
    const newSubmission = {
      id: 'sub-' + Date.now(),
      fileName: req.file.originalname,
      storedFileName: req.file.filename,
      assignmentTitle: selectedAssignment.title,
      subject: selectedAssignment.subject,
      studentName: studentName.trim(),
      submittedAt: dateFormatted,
      fileSize: formatBytes(req.file.size),
      status: 'Submitted',
      storageLocation: 'Local (uploads/) -> S3 Ready',
      isLocal: true
    };

    // Store in submission list (newest first)
    submittedFiles.unshift(newSubmission);

    // Update assignment status to 'Submitted'
    selectedAssignment.status = 'Submitted';

    // Redirect to files page with a success message banner
    res.redirect('/files?uploadSuccess=true&file=' + encodeURIComponent(req.file.originalname));
  });
});

/**
 * Route: GET /files
 * Purpose: View list of submitted assignment files
 */
app.get('/files', (req, res) => {
  const uploadSuccess = req.query.uploadSuccess === 'true';
  const uploadedFileName = req.query.file || '';

  res.render('files', {
    pageTitle: 'My Files',
    activePage: 'files',
    files: submittedFiles,
    uploadSuccess: uploadSuccess,
    uploadedFileName: uploadedFileName
  });
});

/**
 * Route: GET /files/download/:id
 * Purpose: Download uploaded file from uploads/ or return mock content
 */
app.get('/files/download/:id', (req, res) => {
  const fileRecord = submittedFiles.find(f => f.id === req.params.id);

  if (!fileRecord) {
    return res.status(404).send('File record not found.');
  }

  if (fileRecord.isLocal && fileRecord.storedFileName) {
    const filePath = path.join(uploadsDir, fileRecord.storedFileName);
    if (fs.existsSync(filePath)) {
      return res.download(filePath, fileRecord.fileName);
    }
  }

  // Fallback for pre-seeded mock files
  res.setHeader('Content-disposition', `attachment; filename="${fileRecord.fileName}"`);
  res.setHeader('Content-type', 'text/plain');
  res.send(`=== Cloud Assignment Manager (Mock File) ===\n\n` +
    `File Name: ${fileRecord.fileName}\n` +
    `Assignment: ${fileRecord.assignmentTitle}\n` +
    `Student: ${fileRecord.studentName}\n` +
    `Submitted At: ${fileRecord.submittedAt}\n` +
    `Storage Note: In the final AWS deployment, this file will be retrieved directly via AWS S3 Presigned URLs.\n`
  );
});

/**
 * Route: GET /files/view/:id
 * Purpose: View uploaded file in browser
 */
app.get('/files/view/:id', (req, res) => {
  const fileRecord = submittedFiles.find(f => f.id === req.params.id);

  if (!fileRecord) {
    return res.status(404).send('File record not found.');
  }

  if (fileRecord.isLocal && fileRecord.storedFileName) {
    const filePath = path.join(uploadsDir, fileRecord.storedFileName);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }

  // Fallback for pre-seeded mock files
  res.setHeader('Content-type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>View: ${fileRecord.fileName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; display: flex; justify-content: center; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; max-width: 600px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        h2 { color: #38bdf8; margin-top: 0; }
        .meta { margin: 16px 0; font-size: 15px; line-height: 1.8; color: #cbd5e1; }
        .badge { display: inline-block; background: #0284c7; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .s3-note { margin-top: 20px; padding: 14px; background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; color: #fde68a; font-size: 13px; border-radius: 4px; }
        a.btn { display: inline-block; margin-top: 20px; background: #2563eb; color: white; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 500; }
        a.btn:hover { background: #1d4ed8; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">Preview Mode</span>
        <h2>${fileRecord.fileName}</h2>
        <div class="meta">
          <div><strong>Assignment:</strong> ${fileRecord.assignmentTitle}</div>
          <div><strong>Subject:</strong> ${fileRecord.subject}</div>
          <div><strong>Student:</strong> ${fileRecord.studentName}</div>
          <div><strong>Date:</strong> ${fileRecord.submittedAt}</div>
          <div><strong>Status:</strong> ${fileRecord.status}</div>
          <div><strong>Size:</strong> ${fileRecord.fileSize}</div>
        </div>
        <div class="s3-note">
          <strong>Amazon S3 Cloud Architecture:</strong><br>
          In AWS deployment, this preview will load securely from Amazon S3 bucket object storage.
        </div>
        <a href="/files" class="btn">← Back to My Files</a>
      </div>
    </body>
    </html>
  `);
});

// ----------------------------------------------------------------
// 5. ERROR HANDLING & SERVER START
// ----------------------------------------------------------------
app.use((req, res) => {
  res.status(404).render('index', {
    pageTitle: 'Page Not Found',
    activePage: 'home',
    stats: {
      total: assignments.length,
      submitted: assignments.filter(a => a.status === 'Submitted').length,
      pending: assignments.filter(a => a.status === 'Pending').length
    },
    recentAssignments: assignments.slice(0, 3),
    recentFiles: submittedFiles.slice(0, 3)
  });
});

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 Cloud Assignment Manager is running!`);
  console.log(`🔗 Local URL: http://localhost:${PORT}`);
  console.log(`☁️  AWS Cloud Deployment Mode: Local (Ready for S3)`);
  console.log('====================================================');
});
