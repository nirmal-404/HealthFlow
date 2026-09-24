import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function AppointmentCancelPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to doctor search page after 5 seconds
    const timer = setTimeout(() => {
      navigate('/account/search');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center">
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            Appointment Booking Cancelled
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Your payment was cancelled and no appointment has been booked.
            You can try booking another appointment.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Redirecting to doctor search in 5 seconds...
          </p>
          <button
            onClick={() => navigate('/account/search')}
            className="mt-6 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    </div>
  );}