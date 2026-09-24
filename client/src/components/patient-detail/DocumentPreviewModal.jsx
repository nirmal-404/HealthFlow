import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import Button from '../ui/button';
import { useState, useEffect } from 'react';
import DocumentService from '../../services/DocumentService';

export default function DocumentPreviewModal({ isOpen, onClose, document }) {
  const [scale, setScale] = useState(1);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPreviewUrl = async () => {
      if (!document) return;
      
      try {
        setLoading(true);
        const url = await DocumentService.getDocumentPreviewUrl(document._id);
        setPreviewUrl(url);
        setError(null);
      } catch (err) {
        console.error('Error loading preview URL:', err);
        setError('Failed to load document preview');
      } finally {
        setLoading(false);
      }
    };

    loadPreviewUrl();
  }, [document]);

  if (!isOpen || !document) return null;

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  const renderImage = () => {
    if (loading) {
      return <div className="flex items-center justify-center h-full">Loading...</div>;
    }

    if (error) {
      return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;
    }

    if (!previewUrl) {
      return <div className="flex items-center justify-center h-full">Preview not available</div>;
    }

    return (
      <div className="relative w-full h-[calc(100vh-200px)] flex items-center justify-center bg-gray-50">
        <div 
          className="overflow-auto w-full h-full flex items-center justify-center"
          style={{ cursor: 'move' }}
        >
          <img
            src={previewUrl}
            alt={document.documentName}
            className="max-w-none"
            style={{ 
              transform: `scale(${scale})`,
              transition: 'transform 0.2s ease-in-out'
            }}
          />
        </div>
        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomOut}
            className="bg-white shadow-md hover:bg-gray-50"
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetZoom}
            className="bg-white shadow-md hover:bg-gray-50"
          >
            {Math.round(scale * 100)}%
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomIn}
            className="bg-white shadow-md hover:bg-gray-50"
            disabled={scale >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(document.documentUrl, '_blank')}
            className="bg-white shadow-md hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">{document.documentName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {document.documentType} • {new Date(document.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4 overflow-hidden flex-1">
          {renderImage()}
        </div>
      </div>
    </div>
  );
} 