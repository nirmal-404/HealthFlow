import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import AuthService from "../../services/AuthService";
import PreRegistrationService from "../../services/PreRegistrationService";

const StaffRegistration = () => {
  console.log("[StaffRegistration] Component rendered");

  // State for email verification step
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nic, setNic] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { dispatch } = useAuthContext();

  // Verify if email has pre-registrations
  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    console.log("[StaffRegistration] Verifying email:", email);
    setError(null);

    if (!email || !email.includes("@")) {
      console.log("[StaffRegistration] Invalid email format");
      setError("Please enter a valid email address");
      return;
    }

    setEmailVerifying(true);

    try {
      console.log(
        "[StaffRegistration] Calling PreRegistrationService.checkEmailPreRegistration"
      );
      // Call API to check if this email has pre-registrations
      const response = await PreRegistrationService.checkEmailPreRegistration(
        email
      );

      console.log(
        "[StaffRegistration] Pre-registration check response:",
        response
      );
      if (response.hasPreRegistration) {
        console.log(
          "[StaffRegistration] Email verified with pre-registrations:",
          response.count
        );
        setEmailVerified(true);
      } else {
        console.log("[StaffRegistration] Email not pre-registered");
        setError(
          "This email is not pre-registered to join the system. Please contact an administrator."
        );
      }
    } catch (error) {
      console.error("[StaffRegistration] Email verification error:", error);
      setError(
        error.message || "Failed to verify email access. Please try again."
      );
    } finally {
      setEmailVerifying(false);
    }
  };

  // Handle the full registration form submission
  const handleRegister = async (e) => {
    e.preventDefault();
    console.log("[StaffRegistration] Processing registration form submission");
    setError(null);

    // Validate form
    const errorMessage = validateStaffForm({
      name,
      email,
      mobile,
      password,
      confirmPassword,
      nic,
    });
    if (errorMessage) {
      console.log("[StaffRegistration] Validation error:", errorMessage);
      setError(errorMessage);
      return;
    }

    setLoading(true);

    // Prepare data to send
    const formData = {
      name,
      email,
      mobile,
      password,
      confirmPassword,
      nic: nic || undefined,
      authType: "traditional",
    };

    console.log("[StaffRegistration] Submitting staff registration data:", {
      name,
      email,
      mobile,
      hasNic: !!nic,
      hasPassword: !!password,
      hasConfirmPassword: !!confirmPassword,
    });

    try {
      // Register the staff member using AuthService
      console.log("[StaffRegistration] Calling AuthService.registerStaff");
      const response = await AuthService.registerStaff(formData);

      // Store the token from registration response
      if (response.accessToken) {
        console.log(
          "[StaffRegistration] Storing authentication data from registration response"
        );
        AuthService.storeAuthData(response);

        // Dispatch LOGIN_SUCCESS directly without calling login again
        if (response.user && response.activeRole) {
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: {
              user: response.user,
              role: response.activeRole,
              authType: "traditional",
            },
          });

          console.log(
            "[StaffRegistration] Auth state updated, navigating to account page"
          );
          navigate("/account");
        } else {
          throw new Error(
            "Registration successful but login data is incomplete"
          );
        }
      }
    } catch (error) {
      console.error("[StaffRegistration] Registration error:", error);
      setError(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Validation function for staff registration
  const validateStaffForm = ({
    name,
    email,
    mobile,
    password,
    confirmPassword,
    nic,
  }) => {
    console.log("[StaffRegistration] Validating form data");
    if (!name) return "Name is required";
    if (!email) return "Email is required";
    if (!mobile || !mobile.match(/^\d{10}$/))
      return "Mobile number must be 10 digits";
    if (!password || password.length < 6)
      return "Password must be at least 6 characters";
    if (password !== confirmPassword) return "Passwords do not match";

    // NIC validation (optional field)
    if (nic && !nic.match(/^[0-9]{9}[vVxX]$|^[0-9]{12}$/))
      return "NIC must be in valid format (9 digits + V/X or 12 digits)";

    console.log("[StaffRegistration] Form validation passed");
    return null; // No errors
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 rounded-md bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {!emailVerified ? (
        // Email verification step
        <form onSubmit={handleVerifyEmail} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                console.log("[StaffRegistration] Email input changed");
                setEmail(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200"
            disabled={emailVerifying}
          >
            {emailVerifying ? "Verifying..." : "Verify Email"}
          </button>

          <div className="text-center mt-6">
            <p className="text-gray-500 text-sm">
              Already have an account?
              <button
                type="button"
                onClick={() => {
                  console.log(
                    "[StaffRegistration] Navigating to login page from email verification"
                  );
                  navigate("/login");
                }}
                className="text-indigo-500 hover:text-indigo-600 ml-1 font-medium"
              >
                Log in
              </button>
            </p>
          </div>
        </form>
      ) : (
        // Full registration form after email is verified
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative">
            <label htmlFor="verifiedEmail" className="sr-only">
              Verified Email
            </label>
            <input
              id="verifiedEmail"
              type="email"
              name="verifiedEmail"
              value={email}
              disabled={true}
              className="w-full px-3 py-2 border border-green-400 bg-green-50 rounded-md"
              readOnly
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              Verified
            </span>
          </div>

          <div>
            <label htmlFor="name" className="sr-only">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Enter name"
              value={name}
              onChange={(e) => {
                console.log("[StaffRegistration] Name input changed");
                setName(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="nic" className="sr-only">
              NIC (Optional)
            </label>
            <input
              id="nic"
              type="text"
              name="nic"
              placeholder="Enter NIC number (optional)"
              value={nic}
              onChange={(e) => {
                console.log("[StaffRegistration] NIC input changed");
                setNic(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="mobile" className="sr-only">
              Mobile
            </label>
            <input
              id="mobile"
              type="text"
              name="mobile"
              placeholder="Enter mobile number"
              value={mobile}
              onChange={(e) => {
                console.log("[StaffRegistration] Mobile input changed");
                setMobile(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                console.log("[StaffRegistration] Password input changed");
                setPassword(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="sr-only">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => {
                console.log(
                  "[StaffRegistration] Confirm Password input changed"
                );
                setConfirmPassword(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200 mt-6"
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
      )}
    </div>
  );
};

export default StaffRegistration;
