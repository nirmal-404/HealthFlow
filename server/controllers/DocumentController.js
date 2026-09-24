const Document = require("../models/DocumentModel");
const User = require("../models/User");
const Patient = require("../models/Patient");
const cloudinary = require("../middleware/CloudinaryConfig");
const upload = require("../middleware/MulterConfig");
const fs = require('fs');

/**
 * Helper function to verify if the authenticated user has permission
 * to view, modify, or delete a specific document.
 */
const canUserAccessDocument = async (reqUser, document) => {
  if (!reqUser) return false;

  const roleName = reqUser.activeRole?.name;
  const userIdStr = reqUser.id?.toString();

  // Admins and Staff have full administrative access
  if (roleName === "sys_admin" || roleName === "sys_staff") {
    return true;
  }

  // Assigned Doctor can access
  const docDoctorId = document.doctorid?._id
    ? document.doctorid._id.toString()
    : document.doctorid?.toString();
  if (docDoctorId && docDoctorId === userIdStr) {
    return true;
  }

  // Patient matching direct ID can access
  const docPatientId = document.patientid?._id
    ? document.patientid._id.toString()
    : document.patientid?.toString();
  if (docPatientId && docPatientId === userIdStr) {
    return true;
  }

  // Check if user is linked to patient record via NIC or email
  if (docPatientId) {
    const userObj = await User.findById(userIdStr);
    if (userObj) {
      const patientObj = await Patient.findById(docPatientId);
      if (patientObj) {
        if (
          (userObj.nic && patientObj.nic && userObj.nic === patientObj.nic) ||
          (userObj.email && patientObj.email && userObj.email === patientObj.email)
        ) {
          return true;
        }
      }
    }
  }

  return false;
};

const insertDocument = async (req, res) => {
  upload.single("document")(req, res, async (err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "File upload failed", error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (!req.body.patientId) {
        return res.status(400).json({ message: "Patient ID is required" });
      }

      if (!req.body.doctorId) {
        return res.status(400).json({ message: "Doctor ID is required" });
      }

      if (!req.body.documentName) {
        return res.status(400).json({ message: "Document name is required" });
      }

      if (!req.body.documentType) {
        return res.status(400).json({ message: "Document type is required" });
      }

      // Determine if the file is a PDF
      const isPdf = req.file.mimetype === 'application/pdf';
      
      // Upload to Cloudinary with appropriate resource_type
      const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "HealthFlow",
        resource_type: isPdf ? "auto" : "auto",
        format: isPdf ? "pdf" : undefined,
        transformation: isPdf ? [{ flags: 'attachment' }] : undefined
      });

      // Remove temporary file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temporary file:', err);
      });

      const document = new Document({
        patientid: req.body.patientId,
        doctorid: req.body.doctorId,
        documentName: req.body.documentName,
        documentUrl: cloudinaryResult.secure_url,
        documentType: req.body.documentType.trim(),
        status: "Pending",
        modifiedAt: null,
      });

      const savedDocument = await document.save();

      res.status(201).json({
        message: "Document uploaded and inserted successfully",
        document: savedDocument,
      });
    } catch (error) {
      console.error("Document upload error:", error);
      // Clean up temporary file in case of error
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temporary file:', err);
        });
      }
      res.status(500).json({
        message: "Failed to save document metadata",
        error: error.message,
      });
    }
  });
};

const updateDocument = async (req, res) => {
  upload.single("document")(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ message: "File upload failed", error: err.message });
    }

    try {
      const { id } = req.params;
      const document = await Document.findById(id);

      if (!document) {
        return res.status(404).json({ message: "Document not found for the given id" });
      }

      // IDOR Authorization check
      const isAuthorized = await canUserAccessDocument(req.user, document);
      if (!isAuthorized) {
        return res.status(403).json({ message: "Forbidden: You are not authorized to update this document" });
      }

      // Only update fields that are provided
      if (req.body.documentName) {
        document.documentName = req.body.documentName;
      }
      if (req.body.documentType) {
        document.documentType = req.body.documentType;
      }
      if (req.body.doctorId) {
        document.doctorid = req.body.doctorId;
      }

      // Only update the file if one was uploaded
      if (req.file) {
        const isPdf = req.file.mimetype === 'application/pdf';
        
        const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
          folder: "HealthFlow",
          resource_type: isPdf ? "auto" : "auto",
          format: isPdf ? "pdf" : undefined,
          transformation: isPdf ? [{ flags: 'attachment' }] : undefined
        });
        
        document.documentUrl = cloudinaryResult.secure_url;

        // Remove temporary file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temporary file:', err);
        });
      }

      // Only reset status if any changes were made
      if (req.body.documentName || req.body.documentType || req.file) {
        document.status = "Pending";
      }

      document.modifiedAt = new Date();
      await document.save();

      res.status(200).json({
        message: "Document updated successfully",
        document,
      });
    } catch (error) {
      console.error(error);
      // Clean up temporary file in case of error
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temporary file:', err);
        });
      }
      res.status(500).json({
        message: "Failed to update document",
        error: error.message,
      });
    }
  });
};

const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('patientid', 'name')
      .populate('doctorid', 'name');

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // IDOR Authorization check
    const isAuthorized = await canUserAccessDocument(req.user, document);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Forbidden: You are not authorized to view this document" });
    }

    res.status(200).json({ document });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to get document", error: error.message });
  }
};

const getAllDocuments = async (req, res) => {
  try {
    const { patientId, doctorId } = req.query;
    let query = {};

    const roleName = req.user?.activeRole?.name;

    if (roleName === "sys_patient") {
      // If user is a patient, strictly restrict to their patient records/user ID
      const userObj = await User.findById(req.user.id);
      let patientRecordIds = [req.user.id];
      if (userObj) {
        const patientMatch = await Patient.find({
          $or: [
            { _id: req.user.id },
            ...(userObj.nic ? [{ nic: userObj.nic }] : []),
            ...(userObj.email ? [{ email: userObj.email }] : [])
          ]
        });
        patientRecordIds.push(...patientMatch.map(p => p._id));
      }
      query.patientid = { $in: patientRecordIds };
    } else if (roleName === "sys_doctor") {
      // If user is a doctor, default to their doctor ID unless staff/admin
      query.doctorid = req.user.id;
    } else {
      // Admin / Staff can query by provided filters
      if (patientId) {
        query.patientid = patientId;
      }
      if (doctorId) {
        query.doctorid = doctorId;
      }
    }

    const documents = await Document.find(query)
      .populate('patientid', 'name')
      .populate('doctorid', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ documents });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get documents", error: error.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // IDOR Authorization check
    const isAuthorized = await canUserAccessDocument(req.user, document);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Forbidden: You are not authorized to delete this document" });
    }

    await Document.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to delete document", error: error.message });
  }
};

const statusUpdate = async (req, res) => {
  try {
    const targetId = req.params.id || req.params.patentid;
    const { doctorid, status } = req.body;

    const document = await Document.findById(targetId);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Authorization check - only doctors, admin, or staff can update status
    const isAuthorized = await canUserAccessDocument(req.user, document);
    const roleName = req.user?.activeRole?.name;
    if (!isAuthorized || roleName === "sys_patient") {
      return res.status(403).json({ message: "Forbidden: Only doctors or staff can update document status" });
    }

    const validStatuses = ["Pending", "Doctor Review", "Approved", "Rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status provided" });
    }

    document.doctorid = doctorid || document.doctorid;
    document.status = status;
    document.modifiedAt = new Date();

    await document.save();

    res.status(200).json({
      message: "Document status updated successfully",
      document,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update document status",
      error: error.message,
    });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // IDOR Authorization check
    const isAuthorized = await canUserAccessDocument(req.user, document);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Forbidden: You are not authorized to download this document" });
    }

    // Check if the document URL exists
    if (!document.documentUrl) {
      return res.status(404).json({ message: "Document URL not found" });
    }

    // Get the file extension from documentUrl
    const fileExtension = document.documentUrl.split('.').pop().toLowerCase();

    // Set appropriate content type
    const contentTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png'
    };

    const contentType = contentTypes[fileExtension] || 'application/octet-stream';

    // Format filename for download
    const filename = `${document.documentName}${fileExtension ? '.' + fileExtension : ''}`;

    let url = document.documentUrl;
    if (url.includes('cloudinary.com')) {
      url = url.replace('/upload/', '/upload/fl_attachment/');
    }

    res.status(200).json({
      url,
      filename,
      contentType
    });
  } catch (error) {
    console.error("Download document error:", error);
    res.status(500).json({
      message: "Failed to process document download",
      error: error.message,
    });
  }
};

const getAllDocumentsByDoctor = async (req, res) => {
  try {
    const roleName = req.user?.activeRole?.name;
    let doctorId = req.query.doctorId;

    if (roleName === "sys_doctor") {
      doctorId = req.user.id;
    } else if (!doctorId && (roleName === "sys_admin" || roleName === "sys_staff")) {
      doctorId = req.user.id;
    }
    
    if (!doctorId) {
      return res.status(400).json({ message: "Doctor ID is required" });
    }

    const documents = await Document.find({ doctorid: doctorId })
      .populate('patientid', 'name')
      .populate('doctorid', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ documents });
  } catch (error) {
    console.error("Error in getAllDocumentsByDoctor:", error);
    res.status(500).json({ 
      message: "Failed to get doctor's documents", 
      error: error.message 
    });
  }
};

const getDocumentPreview = async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // IDOR Authorization check
    const isAuthorized = await canUserAccessDocument(req.user, document);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You are not authorized to preview this document' });
    }

    const documentUrl = document.documentUrl;
    if (!documentUrl) {
      return res.status(404).json({ message: 'Document URL not found' });
    }

    let previewUrl = documentUrl;
    if (documentUrl.includes('cloudinary.com')) {
      const fileExtension = document.documentName.split('.').pop().toLowerCase();
      
      if (fileExtension === 'pdf') {
        previewUrl = documentUrl.replace('/upload/', '/upload/fl_attachment:false,fl_raw:true/');
      } else {
        previewUrl = documentUrl.replace('/upload/', '/upload/fl_attachment:false,fl_force_strip:true/');
      }
    }

    res.json({ previewUrl });
  } catch (error) {
    console.error('Error getting document preview:', error);
    res.status(500).json({ message: 'Error getting document preview' });
  }
};

module.exports = {
  insertDocument,
  updateDocument,
  getDocumentById,
  getAllDocuments,
  deleteDocument,
  statusUpdate,
  downloadDocument,
  getAllDocumentsByDoctor,
  getDocumentPreview,
};
