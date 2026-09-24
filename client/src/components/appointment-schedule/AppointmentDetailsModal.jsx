import { ChevronRight, Monitor, X, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import { useAuthContext } from "../../context/AuthContext"
import api from "../../services/api"
import { toast } from "react-hot-toast"

// Form validation function
const validateForm = (data, field = null) => {
  const errors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{10}$/;
  const nicRegex = /^\d{9}[VvXx]$|^\d{12}$/;

  // Title validation
  if (!data.title?.trim()) errors.title = "Title is required";

  // First name validation
  if (!data.firstName?.trim()) errors.firstName = "First name is required";
  if (data.firstName?.length < 2) errors.firstName = "First name must be at least 2 characters";

  // Last name validation
  if (!data.lastName?.trim()) errors.lastName = "Last name is required";
  if (data.lastName?.length < 2) errors.lastName = "Last name must be at least 2 characters";

  // Phone validation
  if (!data.phone?.trim()) errors.phone = "Phone number is required";
  if (data.phone && !phoneRegex.test(data.phone)) errors.phone = "Phone number must be exactly 10 digits";

  // NIC validation (optional but must be valid if provided)
  if (data.nic && !nicRegex.test(data.nic)) errors.nic = "Please enter a valid NIC number";

  // Email validation
  if (!data.email?.trim()) errors.email = "Email is required";
  if (data.email && !emailRegex.test(data.email)) errors.email = "Please enter a valid email address";

  // Reason validation
  if (!data.reason?.trim()) errors.reason = "Reason for visit is required";
  if (data.reason?.length < 3) errors.reason = "Please provide a more detailed reason (at least 10 characters)";

  // Return specific field error if requested
  if (field) return errors[field] || null;
  return errors;
};

export default function AppointmentDetailsModal({ isOpen, onClose, appointmentData }) {
  const { currentUser } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(2);
  const [consultationFee, setConsultationFee] = useState(null);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    title: "",
    firstName: "",
    lastName: "",
    phone: "",
    nic: "",
    email: "",
    reason: ""
  });

  useEffect(() => {
    // Pre-fill email if user is logged in
    if (currentUser?.email) {
      setFormData(prev => ({
        ...prev,
        email: currentUser.email
      }));
    }

    // Fetch consultation fee when component mounts
    const fetchConsultationFee = async () => {
      try {
        console.log('Fetching consultation fee for doctor:', appointmentData.doctorId);
        const schedules = await api.get(`/api/appointments/doctors/${appointmentData.doctorId}/getSchedule`);
        console.log('Received schedules:', schedules.data);
        
        if (Array.isArray(schedules.data)) {
          // Find the schedule containing the selected slot's time
          const selectedDate = new Date(appointmentData.selectedSlot.slotTime);
          console.log('Looking for slot time:', selectedDate);
          
          const schedule = schedules.data.find(s => 
            s.slots.some(slot => new Date(slot.slotTime).getTime() === selectedDate.getTime())
          );
          
          if (schedule) {
            console.log('Found matching schedule with fee:', schedule.consultationFee);
            setConsultationFee(schedule.consultationFee);
          } else {
            console.error('No matching schedule found for the selected time slot');
            toast.error('Could not fetch consultation fee. Please try again.');
          }
        }
      } catch (err) {
        console.error('Error fetching consultation fee:', err);
        console.error('Error details:', err.response?.data);
        toast.error('Failed to fetch consultation fee');
      }
    };
    fetchConsultationFee();
  }, [appointmentData.doctorId, appointmentData.selectedSlot.slotTime, currentUser?.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validate the field
    const fieldError = validateForm(formData, name);
    setErrors(prev => ({
      ...prev,
      [name]: fieldError
    }));
  };

  const handleNext = () => {
    // Validate all fields
    const formErrors = validateForm(formData);
    const hasErrors = Object.keys(formErrors).length > 0;
    
    // Mark all fields as touched to show all errors
    setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    
    if (hasErrors) {
      setErrors(formErrors);
      setError("Please fix the errors in the form before proceeding.");
      return;
    }
    
    setCurrentStep(3);
    setError(null);
  };

  const handleBack = () => {
    setCurrentStep(2);
    setError(null);
  };

  const initiatePayment = async (appointmentDetails) => {
    try {
      console.log('Initiating payment with details:', appointmentDetails);
      console.log('Current consultation fee:', consultationFee);

      if (!consultationFee) {
        console.error('No consultation fee available');
        throw new Error('Consultation fee not available');
      }

      const paymentPayload = {
        appointment: {
          ...appointmentDetails,
          consultationFee,
          doctorName: appointmentData.doctorName
        },
        returnUrl: `${window.location.origin}/account/appointment-success`,
        cancelUrl: `${window.location.origin}/account/appointment-cancel`
      };

      console.log('Sending payment request with payload:', paymentPayload);
      const response = await api.post('/api/payments/initiate', paymentPayload);

      console.log('Payment initiation response:', response.data);
      const { paymentData, checkoutUrl } = response.data;

      // Create and submit form to PayHere
      console.log('Creating payment form with URL:', checkoutUrl);
      console.log('Payment data to be submitted:', paymentData);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = checkoutUrl;

      // Add all payment data as hidden fields
      Object.entries(paymentData).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = typeof value === 'string' ? value : JSON.stringify(value);
        form.appendChild(input);
        console.log(`Added form field: ${key} = ${value}`);
      });

      document.body.appendChild(form);
      console.log('Submitting payment form to PayHere...');
      form.submit();
      document.body.removeChild(form);

    } catch (err) {
      console.error('Payment initiation failed:', err);
      console.error('Error details:', err.response?.data);
      throw new Error('Failed to initiate payment: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBookAppointment = async () => {
    try {
      console.log('Starting appointment booking process...');
      setLoading(true);
      setError(null);

      const appointmentDetails = {
        doctorId: appointmentData.doctorId,
        patientId: currentUser?.id,
        slotId: appointmentData.selectedSlot._id,
        reason: formData.reason,
        title: formData.title,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        nic: formData.nic,
        email: formData.email,
        time: appointmentData.selectedSlot.slotTime
      };

      console.log('Appointment details prepared:', appointmentDetails);

      // Initiate payment first
      await initiatePayment(appointmentDetails);
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to book appointment';
      console.error('Appointment booking failed:', errorMessage);
      console.error('Full error:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const doctorInitials = appointmentData.doctorName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="fixed top-[50%] right-[calc(4rem+30px)] -translate-y-1/2 z-50">
      <div className="w-[450px] min-h-[850px] bg-white shadow-lg rounded-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex flex-col">
            <span className="text-sm text-gray-600">Appointment No</span>
            <span className="font-medium text-gray-800">#DOC0010</span>
          </div>
          <div className="flex items-center">
            <div className="flex items-center mr-4">
              <Monitor className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-xs text-gray-400">MANUAL APPOINTMENT</span>
            </div>
            <button onClick={onClose}>
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="p-4 flex items-center justify-between border-b">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-medium mr-3">
              {doctorInitials}
            </div>
            <div>
              <p className="text-xs text-gray-500">Doctor</p>
              <p className="font-medium text-gray-800">{appointmentData.doctorName}</p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="text-right mr-6">
              <p className="text-xs text-gray-500">DATE AND TIME</p>
              <p className="text-sm text-gray-800">{format(appointmentData.selectedDate, 'EEE, dd MMM')}</p>
              <p className="text-sm text-gray-800">{format(new Date(appointmentData.selectedSlot.slotTime), 'hh:mm a')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Specialization</p>
              <p className="text-sm text-gray-800">{appointmentData.specialization}</p>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
              1
            </div>
            <div className="flex-1 h-1 mx-2 bg-blue-500"></div>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
              2
            </div>
            <div className="flex-1 h-1 mx-2 bg-blue-500"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
              currentStep === 3 ? 'bg-blue-500 text-white' : 'border-2 border-gray-300 text-gray-400'
            }`}>
              3
            </div>
          </div>
        </div>

        {currentStep === 2 ? (
          /* Form */
          <div className="p-6 space-y-4 flex-grow">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    touched.title && errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Mr/Mrs/Ms"
                />
                {touched.title && errors.title && (
                  <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIC</label>
                <input
                  type="text"
                  name="nic"
                  value={formData.nic}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    touched.nic && errors.nic ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="National ID Number"
                />
                {touched.nic && errors.nic && (
                  <p className="mt-1 text-sm text-red-500">{errors.nic}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    touched.firstName && errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="First Name"
                />
                {touched.firstName && errors.firstName && (
                  <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    touched.lastName && errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Last Name"
                />
                {touched.lastName && errors.lastName && (
                  <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  touched.phone && errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Phone Number"
              />
              {touched.phone && errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  touched.email && errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Email Address"
              />
              {touched.email && errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Visit <span className="text-red-500">*</span>
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                onBlur={handleBlur}
                rows="3"
                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  touched.reason && errors.reason ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Please describe your reason for visit"
              />
              {touched.reason && errors.reason && (
                <p className="mt-1 text-sm text-red-500">{errors.reason}</p>
              )}
            </div>
          </div>
        ) : (
          /* Summary View */
          <div className="p-6 space-y-6 flex-grow">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Appointment Summary</h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-gray-600">Patient:</span>{' '}
                  <span className="font-medium">{formData.title} {formData.firstName} {formData.lastName}</span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-600">Contact:</span>{' '}
                  <span className="font-medium">{formData.phone}</span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-600">Email:</span>{' '}
                  <span className="font-medium">{formData.email}</span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-600">Reason:</span>{' '}
                  <span className="font-medium">{formData.reason}</span>
                </p>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Payment Details</h3>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Consultation Fee</span>
                <span className="font-medium text-green-800">Rs. {consultationFee || '0'}</span>
              </div>
            </div>

            <div className="mt-auto"></div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t mt-auto">
          {error && (
            <div className="mb-4 p-2 bg-red-50 text-red-600 rounded text-sm">
              {error}
            </div>
          )}
          {currentStep === 2 ? (
            <button
              onClick={handleNext}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Review Appointment
            </button>
          ) : (
            <div className="flex space-x-4">
              <button
                onClick={handleBack}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleBookAppointment}
                disabled={loading}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}