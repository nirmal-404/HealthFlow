import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from '../ui/button';
import Card from '../ui/card';
import DocumentService from '../../services/DocumentService';

export default function DocumentViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const doc = await DocumentService.getDocumentById(id);
        setDocument(doc);
      } catch (err) {
        setError('Failed to load document');
        console.error('Error loading document:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  if (loading) {
    return (
      <div className="p-4">
        <Card>Loading document...</Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <div className="text-red-600">{error}</div>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-4">
        <Card>
          <div>Document not found</div>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const renderDocument = () => {
    if (!document.documentUrl) {
      return <div>Document URL not available</div>;
    }

    const extension = document.documentUrl.split('.').pop().toLowerCase();

    if (extension === 'pdf') {
      return (
        <iframe
          src={document.documentUrl}
          className="w-full h-[calc(100vh-200px)]"
          title={document.documentName}
        />
      );
    } else if (['jpg', 'jpeg', 'png'].includes(extension)) {
      return (
        <img
          src={document.documentUrl}
          alt={document.documentName}
          className="max-w-full max-h-[calc(100vh-200px)] object-contain"
        />
      );
    } else if (extension === 'doc' || extension === 'docx') {
      const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(document.documentUrl)}`;
      return (
        <iframe
          src={viewerUrl}
          className="w-full h-[calc(100vh-200px)]"
          title={document.documentName}
        />
      );
    } else {
      return (
        <div className="text-center p-4">
          <p>This file type cannot be previewed directly.</p>
          <Button onClick={() => window.open(document.documentUrl, '_blank')}>
            Open in New Tab
          </Button>
        </div>
      );
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
      </div>
      
      <Card>
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">{document.documentName}</h1>
          <div className="mb-4">
            <p className="text-gray-600">Type: {document.documentType}</p>
            <p className="text-gray-600">Status: {document.status}</p>
            <p className="text-gray-600">
              Uploaded: {new Date(document.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="border rounded-lg overflow-hidden">
            {renderDocument()}
          </div>
        </div>
      </Card>
    </div>
  );
} 