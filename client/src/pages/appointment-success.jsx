import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export default function AppointmentSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        // Get payment details from URL parameters
        const params = new URLSearchParams(location.search);
        console.log('Payment return parameters:', Object.fromEntries(params));

        // Get orderId - this should be the actual APT number now
        const orderId = params.get('order_id');
        if (!orderId || !orderId.startsWith('APT')) {
          throw new Error('Invalid or missing order ID from PayHere');
        }

        // Add a small delay to allow server-side notification to process first
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Call backend to check/create appointment
        console.log('Creating appointment for order:', orderId);
        const response = await api.post('/api/payments/success', { orderId });

        console.log('Appointment creation response:', response.data);
        
        if (response.data.success) {
          console.log('Payment successful and appointment created');
          toast.success('Appointment booked successfully!');
        } else {
          throw new Error(response.data.message || 'Failed to create appointment');
        }

        // Start redirection timer
        const timer = setTimeout(() => {
          console.log('Redirecting to appointments page...');
          navigate('/account/patient-appointments');
        }, 5000);

        return () => clearTimeout(timer);
      } catch (err) {
        console.error('Error confirming payment:', err);
        setError(err.message || 'Failed to confirm payment. Please contact support.');
        toast.error(err.message || 'Payment confirmation failed');

        // Redirect to appointments page after error
        setTimeout(() => {
          navigate('/account/patient-appointments');
        }, 5000);
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            {loading ? 'Processing Appointment...' : error ? 'Payment Status' : 'Appointment Booked Successfully!'}
          </h2>
          {loading ? (
            <div className="mt-4 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Creating your appointment...</span>
            </div>
          ) : error ? (
            <>
              <p className="mt-2 text-center text-red-600">{error}</p>
              <p className="mt-4 text-sm text-gray-500">
                Redirecting to appointments page in 5 seconds...
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-center text-gray-600">
                Your appointment has been confirmed and booked successfully.
                You will receive a confirmation email shortly.
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Redirecting to appointments page in 5 seconds...
              </p>
            </>
          )}
          <button
            onClick={() => navigate('/account/patient-appointments')}
            className="mt-6 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View My Appointments
          </button>
        </div>
      </div>
    </div>
  );
}















