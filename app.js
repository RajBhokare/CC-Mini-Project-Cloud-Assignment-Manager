/**
 * ================================================================
 * Cloud Assignment Manager - Mini Project
 * ================================================================
 * A secure, cloud-deployed student assignment management application.
 * Built for Cloud Computing Mini Project demonstration on AWS.
 *
 * Architecture:
 * Client Browser -> Express Server (Amazon EC2 Ubuntu t3.micro)
 *               -> Multer (Memory Storage)
 *               -> AWS SDK v3 (@aws-sdk/client-s3)
 *               -> Amazon S3 (Private Bucket, SSE-S3 AES-256)
 *
 * Security & Governance:
 * - AWS IAM Instance Profile: CloudAssignmentEC2Role (IMDSv2)
 * - S3 Bucket: Private, Block Public Access Enabled, SSE-S3 AES-256
 * - Presigned URLs: Temporary authenticated access for viewing & downloading
 * - Monitoring & Alerts: Amazon CloudWatch + Amazon SNS
 * ================================================================
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
const PORT = process.env.PORT || 3000;
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME ? process.env.S3_BUCKET_NAME.trim() : '';

// S3 Active Flag: true when a valid bucket name is configured
const isS3Configured = Boolean(
  S3_BUCKET_NAME &&
  S3_BUCKET_NAME !== '' &&
  S3_BUCKET_NAME !== 'your-s3-bucket-name'
);

// Initialize AWS S3 Client using AWS SDK v3
// When deployed on EC2 with CloudAssignmentEC2Role attached,
// the SDK automatically retrieves credentials from the EC2 Instance Metadata Service (IMDS).
const s3Client = new S3Client({
  region: AWS_REGION
});

// Local uploads directory (only used in explicitly active local development mode)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ----------------------------------------------------------------
// 1. MULTER CONFIGURATION
// ----------------------------------------------------------------
// Memory storage streams files directly to S3 via PutObjectCommand
// without saving unnecessary files to EC2 root disk.
const storage = multer.memoryStorage();

// Academic document formats supported
const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.zip'];

const fileFilter = (req, file, cb) => {
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

// Cloud metadata helper function
function getCloudStatus() {
  return {
    region: AWS_REGION,
    bucketName: S3_BUCKET_NAME || 'Not Configured (Staging)',
    isS3Active: isS3Configured,
    iamRole: 'CloudAssignmentEC2Role',
    instanceType: 't3.micro (Ubuntu Linux)',
    mode: isS3Configured ? 'AWS Production (Amazon S3 Active)' : 'Local Development Fallback'
  };
}

// Global view variables (cloud status accessible everywhere)
app.use((req, res, next) => {
  res.locals.cloudStatus = getCloudStatus();
  next();
});

// ----------------------------------------------------------------
// 3. IN-MEMORY DATA MODEL
// ----------------------------------------------------------------
let assignments = [
  {
    id: 1,
    title: 'Cloud Computing Project',
    subject: 'Cloud Computing',
    code: 'CC-401',
    deadline: '15 Oct 2026',
    status: 'Pending',
    description: 'Design and deploy a scalable, secure web application on AWS EC2 & S3 storage.'
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

// In-memory submission metadata cache (persists metadata alongside S3 objects during session)
let submissionMetadata = {};

// Local-only submissions cache (for offline local development)
let localSubmissions = [];

// Helper to format bytes to human-readable size
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper to format dates for display
function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Recently';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) + ', ' + d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
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
    recentAssignments: assignments.slice(0, 3)
  });
});

/**
 * Route: GET /assignments
 * Purpose: View all course assignments and their submission status
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
 * Architecture: Browser -> Express -> Multer -> AWS SDK v3 (PutObjectCommand) -> Amazon S3
 */
app.post('/upload', (req, res) => {
  upload.single('assignmentFile')(req, res, async (err) => {
    const { studentName, assignmentId } = req.body;
    const selectedAssignment = assignments.find(a => a.id === parseInt(assignmentId));

    // Handle Multer upload errors (size limit or invalid file format)
    if (err) {
      let errorText = err.message || 'File upload error occurred.';
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        errorText = 'File size exceeds the 10MB limit. Please upload a smaller document.';
      }

      return res.status(400).render('upload', {
        pageTitle: 'Upload Assignment',
        activePage: 'upload',
        assignments: assignments,
        selectedAssignmentId: assignmentId ? parseInt(assignmentId) : null,
        errorMessage: errorText,
        successMessage: null
      });
    }

    // Input Validations
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
        errorMessage: 'Please select a valid assignment from the list.',
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

    const dateFormatted = formatDate(new Date());

    // Clean collision-resistant S3 object key
    const ext = path.extname(req.file.originalname).toLowerCase();
    const rawBase = path.basename(req.file.originalname, ext);
    const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const uniqueId = Date.now() + '-' + Math.random().toString(36).substring(2, 8);

    // ----------------------------------------------------------------
    // S3 Cloud Storage Upload
    // ----------------------------------------------------------------
    if (isS3Configured) {
      const s3Key = `assignments/${safeBase}-${uniqueId}${ext}`;

      try {
        const putParams = {
          Bucket: S3_BUCKET_NAME,
          Key: s3Key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype || 'application/octet-stream',
          ServerSideEncryption: 'AES256', // SSE-S3 Server-Side Encryption
          Metadata: {
            'original-name': encodeURIComponent(req.file.originalname),
            'student-name': encodeURIComponent(studentName.trim()),
            'assignment-id': String(selectedAssignment.id),
            'assignment-title': encodeURIComponent(selectedAssignment.title),
            'subject': encodeURIComponent(selectedAssignment.subject)
          }
        };

        // Upload to S3 - only report success if AWS S3 confirms!
        await s3Client.send(new PutObjectCommand(putParams));
        console.log(`[CloudWatch Logger] Successfully uploaded "${req.file.originalname}" to s3://${S3_BUCKET_NAME}/${s3Key} with AES256 encryption`);

        // Cache metadata for display
        submissionMetadata[s3Key] = {
          fileName: req.file.originalname,
          assignmentTitle: selectedAssignment.title,
          subject: selectedAssignment.subject,
          studentName: studentName.trim(),
          submittedAt: dateFormatted,
          fileSize: formatBytes(req.file.size)
        };

        selectedAssignment.status = 'Submitted';

        return res.redirect('/files?uploadSuccess=true&file=' + encodeURIComponent(req.file.originalname));
      } catch (s3Error) {
        console.error('[AWS S3 Upload Error]:', s3Error);
        // Genuine error display - never falsely claim success or silently fall back to local disk in production!
        return res.status(500).render('upload', {
          pageTitle: 'Upload Assignment',
          activePage: 'upload',
          assignments: assignments,
          selectedAssignmentId: parseInt(assignmentId),
          errorMessage: `Amazon S3 Upload Failed: ${s3Error.message || 'Check EC2 IAM role permissions or bucket configuration.'}`,
          successMessage: null
        });
      }
    } else {
      // Local fallback mode (ONLY active when S3_BUCKET_NAME is not configured)
      const localFileName = `${safeBase}-${uniqueId}${ext}`;
      const localFilePath = path.join(uploadsDir, localFileName);

      try {
        fs.writeFileSync(localFilePath, req.file.buffer);

        const newSubmission = {
          id: 'local-' + uniqueId,
          s3Key: null,
          fileName: req.file.originalname,
          storedFileName: localFileName,
          assignmentTitle: selectedAssignment.title,
          subject: selectedAssignment.subject,
          studentName: studentName.trim(),
          submittedAt: dateFormatted,
          fileSize: formatBytes(req.file.size),
          status: 'Submitted',
          storageLocation: 'Local Development (uploads/)',
          isS3: false,
          isLocal: true
        };

        localSubmissions.unshift(newSubmission);
        selectedAssignment.status = 'Submitted';

        return res.redirect('/files?uploadSuccess=true&file=' + encodeURIComponent(req.file.originalname));
      } catch (fsErr) {
        console.error('[Local Storage Error]:', fsErr);
        return res.status(500).render('upload', {
          pageTitle: 'Upload Assignment',
          activePage: 'upload',
          assignments: assignments,
          selectedAssignmentId: parseInt(assignmentId),
          errorMessage: 'Local file write failed: ' + fsErr.message,
          successMessage: null
        });
      }
    }
  });
});

/**
 * Route: GET /files
 * Purpose: View list of submitted assignment files
 * In S3 mode: Lists actual objects from S3 bucket under assignments/ prefix
 */
app.get('/files', async (req, res) => {
  const uploadSuccess = req.query.uploadSuccess === 'true';
  const uploadedFileName = req.query.file || '';

  let filesToDisplay = [];
  let s3Error = null;

  if (isS3Configured) {
    try {
      // Fetch actual objects from S3
      const listCommand = new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: 'assignments/'
      });

      const s3Data = await s3Client.send(listCommand);

      // Filter valid objects (exclude directory markers)
      const contents = (s3Data.Contents || []).filter(item => item.Key && item.Key !== 'assignments/' && item.Size > 0);

      filesToDisplay = contents.map((obj) => {
        const cached = submissionMetadata[obj.Key];
        const baseKey = path.basename(obj.Key);
        // Clean original name without timestamp hash
        const cleanName = baseKey.replace(/-[0-9]+-[a-z0-9]+(\.[a-zA-Z0-9]+)$/, '$1');

        return {
          id: obj.Key,
          s3Key: obj.Key,
          fileName: cached ? cached.fileName : cleanName,
          storedFileName: obj.Key,
          assignmentTitle: cached ? cached.assignmentTitle : 'Course Assignment',
          subject: cached ? cached.subject : 'Cloud Computing',
          studentName: cached ? cached.studentName : 'Student Submission',
          submittedAt: cached ? cached.submittedAt : formatDate(obj.LastModified),
          fileSize: formatBytes(obj.Size),
          status: 'Submitted',
          storageLocation: 'Amazon S3',
          isS3: true,
          isLocal: false
        };
      });

      // Sort newest first
      filesToDisplay.reverse();
    } catch (err) {
      console.error('[AWS S3 List Error]:', err.message);
      s3Error = `Failed to list objects from Amazon S3 (${S3_BUCKET_NAME}): ${err.message}. Please verify IAM role permissions.`;
    }
  } else {
    // Local development mode: list locally submitted files
    filesToDisplay = localSubmissions;
  }

  res.render('files', {
    pageTitle: 'My Files',
    activePage: 'files',
    files: filesToDisplay,
    uploadSuccess: uploadSuccess,
    uploadedFileName: uploadedFileName,
    s3Error: s3Error
  });
});

/**
 * Route: GET /files/download/:id
 * Purpose: Secure file download (generates AWS S3 Presigned URL for private S3 objects)
 */
app.get('/files/download/:id(*)', async (req, res) => {
  const fileId = req.params.id;

  // 1. Amazon S3 Presigned Download URL
  if (isS3Configured && fileId.startsWith('assignments/')) {
    const cached = submissionMetadata[fileId];
    const downloadName = cached ? cached.fileName : path.basename(fileId);

    try {
      const getCommand = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: fileId,
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(downloadName)}"`
      });

      // 15-minute presigned URL allows direct, authenticated download without making bucket public
      const presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 900 });
      console.log(`[CloudWatch Logger] Generated secure S3 presigned DOWNLOAD URL for: ${fileId}`);
      return res.redirect(presignedUrl);
    } catch (err) {
      console.error('[AWS S3 Presign Download Error]:', err);
      return res.status(500).send(`Failed to generate secure S3 download URL: ${err.message}`);
    }
  }

  // 2. Local File Download (local dev fallback)
  const localRecord = localSubmissions.find(f => f.id === fileId);
  if (localRecord && localRecord.storedFileName) {
    const filePath = path.join(uploadsDir, localRecord.storedFileName);
    if (fs.existsSync(filePath)) {
      return res.download(filePath, localRecord.fileName);
    }
  }

  return res.status(404).send('File not found in storage.');
});

/**
 * Route: GET /files/view/:id
 * Purpose: Secure browser preview (generates AWS S3 Presigned URL for inline display)
 */
app.get('/files/view/:id(*)', async (req, res) => {
  const fileId = req.params.id;

  // 1. Amazon S3 Presigned Inline View URL
  if (isS3Configured && fileId.startsWith('assignments/')) {
    const cached = submissionMetadata[fileId];
    const fileName = cached ? cached.fileName : path.basename(fileId);

    try {
      const getCommand = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: fileId,
        ResponseContentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`
      });

      const presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 900 });
      console.log(`[CloudWatch Logger] Generated secure S3 presigned VIEW URL for: ${fileId}`);
      return res.redirect(presignedUrl);
    } catch (err) {
      console.error('[AWS S3 Presign View Error]:', err);
      return res.status(500).send(`Failed to generate secure S3 view URL: ${err.message}`);
    }
  }

  // 2. Local File View (local dev fallback)
  const localRecord = localSubmissions.find(f => f.id === fileId);
  if (localRecord && localRecord.storedFileName) {
    const filePath = path.join(uploadsDir, localRecord.storedFileName);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }

  return res.status(404).send('File not found in storage.');
});

/**
 * Route: GET /health
 * Purpose: Health check endpoint returning simple JSON status
 * Complies with Section 6 of requirements (no secrets or environment variables exposed)
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'cloud-assignment-manager',
    timestamp: new Date().toISOString()
  });
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
    recentAssignments: assignments.slice(0, 3)
  });
});

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 Cloud Assignment Manager is running!`);
  console.log(`🔗 Local Address: http://localhost:${PORT}`);
  console.log(`☁️  AWS Region:    ${AWS_REGION}`);
  console.log(`🪣  Amazon S3:     ${isS3Configured ? `Active (Bucket: ${S3_BUCKET_NAME})` : 'Local Development Fallback'}`);
  console.log(`🛡️  IAM Role:      CloudAssignmentEC2Role (IMDSv2)`);
  console.log(`🩺 Health Check:  http://localhost:${PORT}/health`);
  console.log('====================================================');
});
