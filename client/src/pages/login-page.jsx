import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import AuthService from "../services/AuthService";
import ForgotPassword from "../components/auth/ForgotPassword";

const LoginPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifiedCredentials, setVerifiedCredentials] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { login } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Clear states when component mounts and check for reset token and showForgotPassword
  useEffect(() => {
    console.log("[LoginPage] Component mounted, resetting OTP states");
    setShowOtpInput(false);
    setVerifiedCredentials(false);
    setUserId(null);

    // Check if we should show forgot password form based on URL parameter
    const showForgotPasswordParam = searchParams.get('showForgotPassword');
    if (showForgotPasswordParam === 'true') {
      setShowForgotPassword(true);
    }

    // Check if the URL contains reset token parameters
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    if (token && userId) {
      // If we have token and userId, redirect to reset password page
      navigate(`/reset-password?token=${token}&userId=${userId}`);
    }
  }, [searchParams, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`[LoginPage] Input changed: ${name}`);
    if (name === "identifier") setIdentifier(value);
    if (name === "password") setPassword(value);
    if (name === "otp") setOtp(value);
    // Clear error when user types
    if (error) setError(null);
  };

  // Step 1: Verify credentials and send OTP
  const handleVerifyCredentials = async (e) => {
    e.preventDefault();
    console.log("[LoginPage] Verifying credentials for identifier:", identifier);
    setLoading(true);
    setError(null);

    try {
      console.log("[LoginPage] Calling AuthService.login with identifier and password");
      const result = await AuthService.login(identifier, password);
      
      if (result?.requiresOTP) {
        console.log("[LoginPage] OTP required, showing OTP input form");
        setShowOtpInput(true);
        setVerifiedCredentials(true);
        setUserId(result.userId); // Store userId for OTP verification
        
        // Store in localStorage for auth context to access
        localStorage.setItem("temp_userId", result.userId);
        localStorage.setItem("temp_identifier", identifier);
        localStorage.setItem("temp_password", password);
        
        setError("A verification code has been sent to your email. Please check and enter it here.");
      } else if (result?.accessToken) {
        // This is a direct login (likely NIC login that doesn't need OTP)
        console.log("[LoginPage] Direct login successful (no OTP required), navigating to account");
        try {
          // Use login from AuthContext to properly set user state
          await login(identifier, password);
          navigate("/account");
        } catch (authErr) {
          console.error("[LoginPage] Error updating auth context:", authErr);
          setError(authErr.message || "Authentication failed after successful login");
        }
      }
    } catch (err) {
      console.error("[LoginPage] Credential verification error:", err);
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and complete login
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    console.log("[LoginPage] Verifying OTP:", otp ? "OTP provided" : "No OTP");
    setLoading(true);
    setError(null);

    try {
      console.log("[LoginPage] Calling AuthService.verifyOtp with userId and OTP");
      const result = await AuthService.verifyOtp(userId, otp);
      
      if (result?.user && result?.accessToken) {
        console.log("[LoginPage] OTP verification successful, updating application state directly");
        
        // Store token manually
        AuthService.storeAuthData(result);
        
        // Force a page reload to trigger reinitialization of the auth context
        console.log("[LoginPage] Authentication successful, reloading application");
        window.location.href = "/account";
      } else {
        console.log("[LoginPage] OTP verification unsuccessful, no user or token returned");
        throw new Error("Invalid verification code");
      }
    } catch (err) {
      console.error("[LoginPage] OTP verification error:", err);
      setError(err.message || "Invalid verification code");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  // Go back to credentials input
  const handleBack = () => {
    console.log("[LoginPage] Going back to credential input form");
    setShowOtpInput(false);
    setVerifiedCredentials(false);
    setOtp("");
    setUserId(null);
    setError(null);
    
    // Clear temporary storage
    localStorage.removeItem("temp_userId");
    localStorage.removeItem("temp_identifier");
    localStorage.removeItem("temp_password");
  };

  const handleShowForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const handleCancelForgotPassword = () => {
    setShowForgotPassword(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left side - Image and testimonial */}
      <div className="w-1/2 relative hidden md:block">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60 z-10"></div>
        <img
          src="/login.jpg"
          alt="Healthcare professional"
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
          <blockquote className="text-3xl font-bold mb-6">"The perfect platform for healthcare management."</blockquote>
          <div>
            <p className="font-semibold text-lg">Dr. Sarah Johnson</p>
            <p className="text-sm text-white/80">Chief Medical Officer</p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white">
        <div className="w-full max-w-[440px] px-8">
          {showForgotPassword ? (
            <ForgotPassword onCancel={handleCancelForgotPassword} />
          ) : showOtpInput ? (
            // OTP Input Form
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Verification Required
              </h1>
              <p className="text-gray-500 mb-8">
                Please enter the verification code sent to your email.
              </p>
              
              {error && (
                <div className="mb-4 p-4 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="sr-only">
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    value={otp}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter the 6-digit code"
                    required
                    autoFocus
                    disabled={loading}
                    maxLength={6}
                    pattern="[0-9]*"
                    inputMode="numeric"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200"
                  disabled={loading || !verifiedCredentials}
                >
                  {loading ? "Verifying..." : "Submit Verification Code"}
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition duration-200 mt-3"
                  disabled={loading}
                >
                  Back to Login
                </button>
              </form>
            </div>
          ) : (
            // Login Form
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back to HealthFlow
              </h1>
              <p className="text-gray-500 mb-8">
                Access your healthcare dashboard to manage appointments and patient records.
              </p>

              {error && (
                <div className="mb-4 p-4 rounded-md bg-red-50 text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyCredentials} className="space-y-4">
                <div>
                  <label htmlFor="identifier" className="sr-only">
                    Email or NIC
                  </label>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    value={identifier}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Email or NIC"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Password"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleShowForgotPassword}
                    className="text-indigo-500 hover:text-indigo-600 text-sm"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Login"}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">OR</span>
                  </div>
                </div>

                <p className="text-center text-gray-500 text-sm mt-6">
                  Don't have an account?
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="text-indigo-500 hover:text-indigo-600 ml-1 font-medium"
                  >
                    Sign up
                  </button>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
