const multer = require("multer");
const path = require("path");

// Configure local storage for temporary files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads")); // Temporary storage
  },
  filename: function (req, file, cb) {
    // Sanitize original filename to prevent path traversal attack (e.g., ../../evil.pdf)
    const sanitizedOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, `${Date.now()}-${sanitizedOriginalName}`);
  }
});

// File filter with improved MIME type checking
const fileFilter = (req, file, cb) => {
  // Define allowed MIME types and their corresponding extensions
  const allowedTypes = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  };

  const mime = file.mimetype;
  const ext = path.extname(file.originalname).toLowerCase();

  // Check if the MIME type is allowed
  if (allowedTypes[mime] && allowedTypes[mime].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only PDF, JPG, PNG, DOC and DOCX files are allowed. Received: ${mime}`), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Limit to 1 file per upload
  }
});

module.exports = upload;
