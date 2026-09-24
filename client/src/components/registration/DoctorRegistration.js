import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { validateDocForm } from "../../validations/validate";
import AuthService from "../../services/AuthService";

const DoctorRegistration = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    nic: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    specialization: "",
    licenseNumber: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { setAuthData } = useAuthContext();
  const navigate = useNavigate();

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle input blur for validation
  const handleBlur = (e) => {
    const { name } = e.target;

    setTouched((prevTouched) => ({
      ...prevTouched,
      [name]: true,
    }));

    const fieldError = validateDocForm(formData, name);
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: fieldError,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const firstErrorField = Object.keys(errors).find(
      (field) => errors[field] !== null
    );

    // If there is an error, show that error message
    if (firstErrorField) {
      alert(errors[firstErrorField]);
      setLoading(false);
      return;
    }

    // Prepare data to send
    const dataToSend = {
      name: formData.name,
      email: formData.email,
      nic: formData.nic,
      password: formData.password,
      mobile: formData.mobile,
      doctorInfo: {
        specialization: formData.specialization,
        licenseNumber: formData.licenseNumber,
      },
    };

    try {
      // Register the doctor using AuthService
      const response = await AuthService.registerDoctor(dataToSend);

      // Check if registration requires approval
      if (response.requiresApproval) {
        setRegistrationSuccess(true);
        setSuccessMessage(response.message);
      } else {
        // Use the token directly from registration response
        setAuthData(response.accessToken, response.user, response.activeRole);
        navigate("/account");
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  // If registration was successful, show a thank you message
  if (registrationSuccess) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm max-w-md mx-auto">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4CAF50"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-16 h-16"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Registration Submitted
          </h2>
          <p className="text-lg text-gray-700 mb-4">{successMessage}</p>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Your registration requires administrative approval. You will
                  not be able to log in until your account is approved.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <p className="text-gray-600 text-sm font-semibold">
              What happens next?
            </p>
            <ul className="text-gray-600 text-sm list-disc pl-5 space-y-2">
              <li>
                An administrator will review your registration information
              </li>
              <li>
                You will receive an email when your account has been approved
              </li>
              <li>
                Once approved, you can log in using the credentials you provided
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full mt-6 bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {errorMsg && (
        <div className="mb-4 p-4 rounded-md bg-red-50 text-red-700 border border-red-200">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <h3 className="text-lg font-medium text-gray-700 mb-3">
          Personal Information
        </h3>

        <div>
          <label htmlFor="name" className="sr-only">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border ${
              touched.name && errors.name ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="Full Name"
            required
          />
          {touched.name && errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border ${
              touched.email && errors.email
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="Email"
            required
          />
          {touched.email && errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="nic" className="sr-only">
            NIC
          </label>
          <input
            id="nic"
            name="nic"
            type="text"
            value={formData.nic}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border ${
              touched.nic && errors.nic ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="NIC"
          />
          {touched.nic && errors.nic && (
            <p className="mt-1 text-sm text-red-600">{errors.nic}</p>
          )}
        </div>

        <div>
          <label htmlFor="mobile" className="sr-only">
            Mobile
          </label>
          <input
            id="mobile"
            name="mobile"
            type="tel"
            value={formData.mobile}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border ${
              touched.mobile && errors.mobile
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="Mobile Number"
            required
          />
          {touched.mobile && errors.mobile && (
            <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>
          )}
        </div>

        <h3 className="text-lg font-medium text-gray-700 mb-3 pt-4">
          Security
        </h3>

        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border ${
              touched.password && errors.password
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="Password"
            required
          />
          {touched.password && errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="sr-only">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border ${
              touched.confirmPassword && errors.confirmPassword
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="Confirm Password"
            required
          />
          {touched.confirmPassword && errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <h3 className="text-lg font-medium text-gray-700 mb-3 pt-4">
          Professional Information
        </h3>

        <div>
          <label htmlFor="specialization" className="sr-only">
            Specialization
          </label>
          <input
            id="specialization"
            name="specialization"
            type="text"
            value={formData.specialization}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border ${
              touched.specialization && errors.specialization
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="Specialization"
          />
          {touched.specialization && errors.specialization && (
            <p className="mt-1 text-sm text-red-600">{errors.specialization}</p>
          )}
        </div>

        <div>
          <label htmlFor="licenseNumber" className="sr-only">
            License Number
          </label>
          <input
            id="licenseNumber"
            name="licenseNumber"
            type="text"
            value={formData.licenseNumber}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border ${
              touched.licenseNumber && errors.licenseNumber
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="License Number"
            required
          />
          {touched.licenseNumber && errors.licenseNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.licenseNumber}</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full mt-6 bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200"
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Already have an account?
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-indigo-500 hover:text-indigo-600 ml-1 font-medium"
            >
              Log in
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default DoctorRegistration;
