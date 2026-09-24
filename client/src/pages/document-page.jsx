import { useState, useEffect } from "react";
import { Search, ChevronDown, File, ImageIcon, Download, Filter } from "lucide-react";
import Input from "../components/ui/input";
import Button from "../components/ui/button";
import DocumentService from "../services/DocumentService";
import Toast from "../components/ui/toast";
import { useAuthContext } from "../context/AuthContext";
import DropdownMenu, { DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu";

export default function DocumentList() {
  const [searchTerm, setSearchTerm] = useState("");
  const { currentUser} = useAuthContext();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Status options
  const statusOptions = ["All", "Pending", "Doctor Review", "Approved", "Rejected"];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {

      const doctorId = currentUser?.id;
      console.log("Fetching documents for doctor ID:", doctorId);
      setLoading(true);
      const data = await DocumentService.getAllDocumentsByDoctor(doctorId);
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid document data received');
      }
      setDocuments(data);
    } catch (error) {
      console.error("Failed to load documents:", error);
      setToast({
        visible: true,
        message: "Failed to load documents. Please try again later.",
        type: "error"
      });
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (documentUrl) => {
    if (!documentUrl) return <File className="h-5 w-5 text-gray-500" />;
    const extension = documentUrl.split('.').pop().toLowerCase();
    
    switch(extension) {
      case 'pdf':
        return <File className="h-5 w-5 text-red-500" />;
      case 'doc':
      case 'docx':
        return <File className="h-5 w-5 text-blue-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <ImageIcon className="h-5 w-5 text-green-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleViewDocument = async (documentId) => {
    try {
      const doc = await DocumentService.getDocumentById(documentId);
      if (!doc || !doc.documentUrl) {
        setToast({
          visible: true,
          message: "Document URL is not available",
          type: "error"
        });
        return;
      }

      const extension = doc.documentUrl.split('.').pop().toLowerCase();
      
      // Handle different file types
      if (extension === 'pdf') {
        // Open PDFs in new window
        window.open(doc.documentUrl, '_blank', 'noopener,noreferrer');
      } else if (['jpg', 'jpeg', 'png'].includes(extension)) {
        // For images, open directly in new tab
        window.open(doc.documentUrl, '_blank', 'noopener,noreferrer');
      } else if (extension === 'doc' || extension === 'docx') {
        // For Word documents, use Office Online Viewer
        const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(doc.documentUrl)}`;
        window.open(viewerUrl, '_blank', 'noopener,noreferrer');
      } else {
        // For other file types, trigger download
        window.location.href = doc.documentUrl;
      }
    } catch (error) {
      console.error("Error viewing document:", error);
      setToast({
        visible: true,
        message: "Failed to view document. Please try again.",
        type: "error"
      });
    }
  };

  const handleDownload = async (id) => {
    try {
      const downloadInfo = await DocumentService.downloadDocument(id);
      if (!downloadInfo || !downloadInfo.url) {
        throw new Error('Download URL not available');
      }
      
      const link = document.createElement('a');
      // For Cloudinary URLs, ensure download attachment flag is set
      const downloadUrl = downloadInfo.url.includes('cloudinary.com') 
        ? downloadInfo.url.replace('/upload/', '/upload/fl_attachment/') 
        : downloadInfo.url;
        
      link.href = downloadUrl;
      link.setAttribute('download', downloadInfo.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setToast({
        visible: true,
        message: "Download started successfully",
        type: "success"
      });
    } catch (error) {
      console.error('Download failed:', error);
      setToast({
        visible: true,
        message: "Failed to download document. Please try again.",
        type: "error"
      });
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = 
      doc._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentType?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !selectedStatus || selectedStatus === "All" || doc.status === selectedStatus;

    const docDate = new Date(doc.createdAt);
    const matchesDateRange = (!startDate || docDate >= new Date(startDate)) &&
                            (!endDate || docDate <= new Date(endDate));

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  // Calculate document statistics
  const documentStats = {
    total: documents.length,
    ...documents.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {})
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          Loading documents...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <Toast 
        isVisible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />

      {/* Document Statistics Dashboard */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Total Documents</h3>
          <p className="text-2xl font-bold text-blue-600">{documentStats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Approved</h3>
          <p className="text-2xl font-bold text-green-600">{documentStats.Approved || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Doctor Review</h3>
          <p className="text-2xl font-bold text-yellow-600">{documentStats['Doctor Review'] || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Pending</h3>
          <p className="text-2xl font-bold text-orange-600">{documentStats.Pending || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Rejected</h3>
          <p className="text-2xl font-bold text-red-600">{documentStats.Rejected || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">Document List</h1>

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
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  DOCUMENT ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  CREATED
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  NAME
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  TYPE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  STATUS
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocuments.map((doc) => (
                <tr key={doc._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{doc._id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getFileIcon(doc.documentUrl)}
                      <div className="text-sm text-gray-900 hover:text-blue-600 cursor-pointer ml-2" 
                           onClick={() => handleViewDocument(doc._id)}>
                        {doc.documentName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.documentType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                      doc.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      doc.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      doc.status === 'Doctor Review' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleViewDocument(doc._id)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDownload(doc._id)}
                        className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
