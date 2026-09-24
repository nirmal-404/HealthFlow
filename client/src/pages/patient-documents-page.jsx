import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { File, Download, Eye, Search, Plus, Filter, ChevronDown } from 'lucide-react';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import Card from '../components/ui/card';
import Toast from '../components/ui/toast';
import DocumentService from '../services/DocumentService';
import DocumentUpload from '../components/ui/DocumentUpload';
import DocumentPreviewModal from '../components/patient-detail/DocumentPreviewModal';
import ConfirmDialog from '../components/ui/confirm-dialog';
import DropdownMenu, { DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../components/ui/dropdown-menu';

export default function PatientDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  
  const { currentUser } = useAuthContext();
  const navigate = useNavigate();

  const statusOptions = ["All", "Pending", "Doctor Review", "Approved", "Rejected"];

  useEffect(() => {
    fetchDocuments();
  }, [currentUser?.id]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await DocumentService.getAllDocuments(currentUser.id);
      setDocuments(response.documents || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (document) => {
    if (!document) {
      setToast({
        visible: true,
        message: "Failed to upload document",
        type: "error"
      });
      return;
    }

    setDocuments(prev => [...prev, document]);
    setToast({
      visible: true,
      message: "Document uploaded successfully",
      type: "success"
    });
    setIsUploadModalOpen(false);
  };

  const handleUpdateSuccess = (updatedDoc) => {
    if (!updatedDoc) {
      setToast({
        visible: true,
        message: "Failed to update document",
        type: "error"
      });
      return;
    }

    setDocuments(prev => prev.map(doc => 
      doc._id === updatedDoc._id ? updatedDoc : doc
    ));
    setToast({
      visible: true,
      message: "Document updated successfully",
      type: "success"
    });
    setIsUploadModalOpen(false);
    setEditingDocument(null);
  };

  const handleDownload = async (documentId) => {
    try {
      const downloadInfo = await DocumentService.downloadDocument(documentId);
      // Now downloadInfo will contain { url, filename, contentType }
      if (!downloadInfo || !downloadInfo.url) {
        throw new Error('Download URL not available');
      }
      
      const link = document.createElement('a');
      link.href = downloadInfo.url; // Use the URL directly from the response
      link.setAttribute('download', downloadInfo.filename); // Use the filename from the response
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setToast({
        visible: true,
        message: "Download started successfully",
        type: "success"
      });
    } catch (err) {
      console.error('Error downloading document:', err);
      setToast({
        visible: true,
        message: err.message || "Failed to download document",
        type: "error"
      });
    }
  };

  const handleView = async (doc) => {
    try {
      if (!doc.documentUrl) {
        setToast({
          visible: true,
          message: "Document URL is not available",
          type: "error"
        });
        return;
      }

      const extension = doc.documentUrl.split('.').pop().toLowerCase();

      if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        setPreviewDocument(doc);
      } else if (extension === 'pdf') {
        const previewUrl = await DocumentService.getDocumentPreviewUrl(doc._id);
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
      } else if (extension === 'doc' || extension === 'docx') {
        const previewUrl = await DocumentService.getDocumentPreviewUrl(doc._id);
        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`;
        window.open(viewerUrl, '_blank', 'noopener,noreferrer');
      } else {
        const previewUrl = await DocumentService.getDocumentPreviewUrl(doc._id);
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error previewing document:', error);
      setToast({
        visible: true,
        message: "Failed to preview document",
        type: "error"
      });
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      await DocumentService.deleteDocument(documentToDelete._id);
      setDocuments(prev => prev.filter(doc => doc._id !== documentToDelete._id));
      setToast({
        visible: true,
        message: "Document deleted successfully",
        type: "success"
      });
    } catch (error) {
      setToast({
        visible: true,
        message: "Failed to delete document",
        type: "error"
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = 
      doc.documentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentType?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !selectedStatus || selectedStatus === "All" || doc.status === selectedStatus;

    const docDate = new Date(doc.createdAt);
    const matchesDateRange = (!startDate || docDate >= new Date(startDate)) &&
                            (!endDate || docDate <= new Date(endDate));

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Toast 
        isVisible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />

      <DocumentPreviewModal
        isOpen={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        document={previewDocument}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDocumentToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this document? This action cannot be undone."
      />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Documents</h1>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <Card>
        <div className="p-6 space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <div className="max-w-md w-full">
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="h-4 w-4 text-gray-400" />}
                  className="w-full"
                />
              </div>
              <Button
                variant="secondary"
                icon={<Filter className="h-4 w-4" />}
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>

            {showFilters && (
              <div className="flex space-x-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedStatus || "All Status"}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[200px]">
                      {statusOptions.map((status) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => setSelectedStatus(status === "All" ? "" : status)}
                        >
                          {status}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setSelectedStatus("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            {filteredDocuments.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No documents found
              </div>
            ) : (
              filteredDocuments.map((document) => (
                <div
                  key={document._id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <File className="w-6 h-6 text-blue-500" />
                      <div>
                        <h3 className="font-medium">{document.documentName}</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{document.documentType}</span>
                          <span>•</span>
                          <span>Uploaded on {new Date(document.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${document.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                              document.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              document.status === 'Doctor Review' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'}`}>
                            {document.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(document)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(document._id)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingDocument(document);
                          setIsUploadModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDocumentToDelete(document);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <DocumentUpload
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setEditingDocument(null);
        }}
        mode={editingDocument ? "edit" : "create"}
        documentData={editingDocument}
        patientId={currentUser.id}
        onUploadSuccess={handleUploadSuccess}
        onUpdateSuccess={handleUpdateSuccess}
        isPatientView={true}
      />
    </div>
  );
}