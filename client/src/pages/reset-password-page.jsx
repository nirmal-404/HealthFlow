import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthService from "../services/AuthService";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Extract token and userId from URL query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');
    const userId = queryParams.get('userId');
    
    if (!token || !userId) {
      setError("Invalid reset link. Missing required parameters.");
      setValidatingToken(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const isValid = await AuthService.verifyResetToken(userId, token);
        setTokenValid(isValid);
        if (!isValid) {
          setError("The password reset link is invalid or has expired. Please request a new one.");
        }
      } catch (error) {
        console.error("Token verification error:", error);
        setError("Failed to verify reset link. Please try again or request a new one.");
      } finally {
        setValidatingToken(false);
      }
    };

    verifyToken();
  }, [location.search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "password") setPassword(value);
    if (name === "confirmPassword") setConfirmPassword(value);
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    try {
      setLoading(true);
      const queryParams = new URLSearchParams(location.search);
      const token = queryParams.get('token');
      const userId = queryParams.get('userId');
      
      await AuthService.resetPassword(userId, token, password);
      setSuccess(true);
    } catch (error) {
      console.error("Reset password error:", error);
      setError(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    navigate('/login');
  };

  const renderContent = () => {
    if (validatingToken) {
      return (
        <div className="w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verifying Reset Link
          </h1>
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <span className="ml-2">Verifying your reset link...</span>
          </div>
        </div>
      );
    }

    if (success) {
      return (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Password Reset Complete
          </h1>
          <p className="text-gray-500 mb-8">
            Your password has been successfully reset.
          </p>
          <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
            <p>Your password has been successfully reset!</p>
            <p className="mt-2">You can now log in with your new password.</p>
          </div>
          <button
            onClick={goToLogin}
            className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200"
          >
            Go to Login
          </button>
        </div>
      );
    }

    if (!tokenValid) {
      return (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Invalid Reset Link
          </h1>
          <p className="text-gray-500 mb-8">
            There was a problem with your password reset link.
          </p>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error || "The password reset link is invalid or has expired."}
          </div>
          <button
            onClick={() => navigate('/login?showForgotPassword=true')}
            className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition duration-200"
          >
            Request New Reset Link
          </button>
          <button
            onClick={goToLogin}
            className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200 mt-3"
          >
            Return to Login
          </button>
        </div>
      );
    }

    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Set New Password
        </h1>
        <p className="text-gray-500 mb-8">
          Create a new password for your HealthFlow account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="mb-4 p-4 rounded-md bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="sr-only">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="New Password"
              required
              disabled={loading}
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="sr-only">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Confirm Password"
              required
              disabled={loading}
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200"
            disabled={loading}
          >
            {loading ? "Resetting Password..." : "Reset Password"}
          </button>

          <button
            type="button"
            onClick={goToLogin}
            className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition duration-200 mt-3"
          >
            Cancel
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left side - Image and testimonial */}
      <div className="w-1/2 relative hidden md:block">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60 z-10"></div>
        <img
          src="/doctor-discussing-x-ray-ct-scan-patient-cervical-spine-injury-diagnosis-results-treatment-with-nurse-medical-appointment-radiology-medical-exam-sterile-antibacterial-clinic-environment.jpg"
          alt="Doctor discussing medical scan"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute top-8 left-8 z-20">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-white rounded-full"></div>
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            <span className="text-white text-xl font-semibold">HealthFlow</span>
          </div>
        </div>
        <div className="absolute bottom-20 left-8 right-8 z-20 text-white">
          <blockquote className="text-3xl font-bold mb-6">"Streamlined healthcare for professionals and patients."</blockquote>
          <div>
            <p className="font-semibold text-lg">Dr. Michael Chen</p>
            <p className="text-sm text-white/80">Head of Radiology</p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white">
        <div className="w-full max-w-[440px] px-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;