import { useState, useEffect, useRef } from "react";
import { ArrowRight, File, ImageIcon, X, ChevronDown } from "lucide-react";
import Button from "./button";
import Input from "./input";
import DropdownMenu, {
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./dropdown-menu";
import { useAuthContext } from "../../context/AuthContext";
import DocumentService from "../../services/DocumentService";

// Get appropriate file icon based on file type
const getFileIcon = (fileType, preview = false) => {
  const type = fileType.toLowerCase();
  if (type.includes("pdf")) {
    return (
      <File className={`${preview ? "h-10 w-10" : "h-6 w-6"} text-red-500`} />
    );
  } else if (type.includes("doc")) {
    return (
      <File className={`${preview ? "h-10 w-10" : "h-6 w-6"} text-blue-500`} />
    );
  } else if (type.startsWith("image/")) {
    return (
      <ImageIcon
        className={`${preview ? "h-10 w-10" : "h-6 w-6"} text-green-500`}
      />
    );
  }
  return (
    <File className={`${preview ? "h-10 w-10" : "h-6 w-6"} text-gray-400`} />
  );
};

export default function DocumentUpload({
  isOpen,
  onClose,
  mode = "create",
  documentData = null,
  isPatientView = false,
  patientId,
  doctorId,
  onUploadSuccess,
  onUpdateSuccess,
}) {
  const { activeRole, currentUser } = useAuthContext();
  const isDoctor = activeRole?.name === "sys_doctor";
  const isBulkUpdate = mode === "bulk-update";

  const [attachments, setAttachments] = useState([]);
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("Lab Report");
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState("Pending");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Get the doctor ID from context
  const doctorIdFromContext = currentUser?.id; // Use either the role's ID or currentUser's ID if role doesn't have one

  useEffect(() => {
    if ((mode === "edit" || mode === "bulk-update") && documentData) {
      if (isBulkUpdate) {
        const firstDoc = Array.isArray(documentData)
          ? documentData[0]
          : documentData;
        setDocumentName(firstDoc.documentName || "");
        setDocumentType(firstDoc.documentType || "Lab Report");
        setStatus(firstDoc.status || "Pending");
      } else {
        setDocumentName(documentData.documentName || "");
        setDocumentType(documentData.documentType || "Lab Report");
        setStatus(documentData.status || "Pending");
      }
    }
  }, [mode, documentData, isBulkUpdate]);

  // If doctor is trying to modify in patient view, or modal is not open, don't render
  if (!isOpen || (isPatientView && isDoctor)) {
    return null;
  }

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files) => {
    const newAttachments = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file: file,
      name: file.name,
      type: file.type,
      size: file.size,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => {
      const filtered = prev.filter((att) => att.id !== id);
      const removed = prev.find((att) => att.id === id);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return filtered;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSubmit = async () => {
    try {
      setUploading(true);

      if (mode === "create") {
        // For create, all fields are required
        if (!documentName.trim()) {
          throw new Error("Document name is required");
        }

        if (!patientId) {
          throw new Error("Patient ID is required");
        }

        const actualDoctorId = doctorId || doctorIdFromContext;
        if (!actualDoctorId) {
          throw new Error("Doctor ID is required");
        }

        if (attachments.length === 0) {
          throw new Error("Please select a file to upload");
        }

        const formData = new FormData();
        formData.append("document", attachments[0].file);
        formData.append("documentName", documentName.trim());
        formData.append("documentType", documentType);
        formData.append("patientId", patientId);
        formData.append("doctorId", actualDoctorId);
        formData.append("status", status);

        const uploadedDoc = await DocumentService.uploadDocument(formData);
        if (uploadedDoc) {
          onUploadSuccess(uploadedDoc);
          handleCleanup();
        }
      } else {
        // For edit mode, only send changed fields
        const id = documentData._id;
        const updates = {};
        
        // Only include changed fields
        if (documentName !== documentData.documentName) {
          updates.documentName = documentName;
        }
        if (documentType !== documentData.documentType) {
          updates.documentType = documentType;
        }
        if (attachments.length > 0) {
          updates.file = attachments[0].file;
        }

        // Only proceed if there are changes
        if (Object.keys(updates).length > 0) {
          const updatedDoc = await DocumentService.updateDocument(id, updates);
          if (updatedDoc) {
            onUpdateSuccess(updatedDoc);
            handleCleanup();
          }
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error("Document operation failed:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleCleanup = () => {
    setDocumentName("");
    setDocumentType("Lab Report");
    setStatus("Pending");
    setAttachments([]);
    setDragActive(false);
    onClose();
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="flex w-full max-w-5xl bg-white rounded-lg shadow-lg overflow-hidden relative h-[80vh]">
        {/* Left sidebar - Attachments */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="p-2 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-600">
              Attachments ({attachments.length})
            </h2>
            <button className="text-gray-400">
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 p-2 overflow-y-auto">
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="border border-gray-200 rounded-md overflow-hidden"
                >
                  <div className="relative">
                    {attachment.type.startsWith("image/") ? (
                      <img
                        src={attachment.preview}
                        alt={attachment.name}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 bg-gray-50 flex items-center justify-center">
                        {getFileIcon(attachment.type, true)}
                      </div>
                    )}
                    <button
                      className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm hover:bg-gray-100"
                      onClick={() => removeAttachment(attachment.id)}
                    >
                      <X className="h-3 w-3 text-gray-500" />
                    </button>
                  </div>
                  <div className="p-2 bg-gray-50">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {attachment.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {formatFileSize(attachment.size)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {attachment.type.split("/")[1].toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right content - Document details */}
        <div className="w-2/3 flex flex-col">
          {/* Header */}
          <div className="p-2 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {isBulkUpdate
                  ? "Bulk Update Documents"
                  : mode === "edit"
                  ? `Edit Document: ${documentData?.documentName}`
                  : "New Document"}
              </span>
              {isBulkUpdate && documentData && (
                <span className="text-xs text-gray-400">
                  ({Array.isArray(documentData) ? documentData.length : 0}{" "}
                  documents selected)
                </span>
              )}
            </div>
            <button className="text-gray-400" onClick={handleCleanup}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main content */}
          <div className="flex-1 p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Name
                </label>
                <Input
                  placeholder="Enter document name"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {documentType}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    {[
                      "Lab Report",
                      "Scan",
                      "Prescription",
                      "System Generated",
                    ].map((type) => (
                      <DropdownMenuItem
                        key={type}
                        onClick={() => setDocumentType(type.trim())}
                      >
                        {type}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* File upload section */}
              <div
                className={`border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center h-[180px] ${
                  dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx"
                />
                {getFileIcon("file", false)}
                <p className="text-sm text-gray-600 mb-1">
                  {mode === "edit"
                    ? "Select a new file to replace the current one"
                    : "Select a file or drag and drop here"}
                </p>
                <p className="text-xs text-gray-400 mb-2">
                  PNG, JPG, PDF or DOC (max. 10MB)
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-blue-100 text-blue-600 hover:bg-blue-200"
                  onClick={handleBrowseClick}
                >
                  Browse Files
                </Button>
                {mode === "edit" && attachments.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Current file will be kept if no new file is selected
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleCleanup}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSubmit}
                disabled={
                  uploading ||
                  (!isBulkUpdate && attachments.length === 0) ||
                  !documentName
                }
              >
                {uploading
                  ? "Processing..."
                  : isBulkUpdate
                  ? "Update Selected"
                  : mode === "edit"
                  ? "Save Changes"
                  : "Upload Document"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
