/**
 * Cloud Assignment Manager - Client Side Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Navigation Menu Toggle
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('show');
    });
  }

  // 2. Upload Page: Drag & Drop & File Selection Feedback
  const fileInput = document.getElementById('assignmentFile');
  const dropzone = document.getElementById('dropzone');
  const fileInfo = document.getElementById('fileSelectedInfo');
  const fileNameDisplay = document.getElementById('selectedFileName');

  if (fileInput && dropzone && fileInfo && fileNameDisplay) {
    // Helper to format bytes
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const updateFileInfo = (file) => {
      if (file) {
        fileNameDisplay.textContent = `Selected: ${file.name} (${formatBytes(file.size)})`;
        fileInfo.style.display = 'block';
      } else {
        fileInfo.style.display = 'none';
      }
    };

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      updateFileInfo(file);
    });

    // Drag and drop listeners
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        fileInput.files = files;
        updateFileInfo(files[0]);
      }
    });
  }

  // 3. Auto-dismiss alerts or manual dismiss
  const alertCloseBtns = document.querySelectorAll('.alert-close');
  alertCloseBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const alert = this.closest('.alert');
      if (alert) {
        alert.style.transition = 'opacity 0.3s ease';
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
      }
    });
  });
});
