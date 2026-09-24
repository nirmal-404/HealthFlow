import { X } from "lucide-react";
import Button from "./button";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
}) {
  if (!isOpen) return null;

  const modalWidth = "w-[500px]";
  const modalHeight = "h-[600px]"; // Fixed height

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-end p-4">
        <div
          className={`relative bg-white ${modalWidth} ${modalHeight} overflow-hidden rounded-2xl shadow-2xl animate-slide-in my-4 mr-4`}
          style={{
            animation: 'slide-in 0.3s ease-out'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ height: 'calc(100% - 130px)' }}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end gap-2 p-4 bg-white border-t border-gray-200 rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add sliding animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }
`;
document.head.appendChild(style);