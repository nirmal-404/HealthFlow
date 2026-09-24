import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Toast({ 
  message, 
  isVisible, 
  onClose, 
  type = "info", 
  duration = 3000 
}) {
  useEffect(() => {
    if (isVisible && duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const types = {
    info: "bg-blue-100 text-blue-800",
    error: "bg-red-100 text-red-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
  };

  const typeClass = types[type] || types.info;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`rounded-lg p-4 flex items-center shadow-lg ${typeClass}`}>
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-3 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}