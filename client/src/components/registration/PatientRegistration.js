import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { validatePatientForm } from "../../validations/validate";
import AuthService from "../../services/AuthService";

const PatientRegistration = () => {
  console.log("[PatientRegistration] Component rendered");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    nic: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const { dispatch } = useAuthContext(); // Getting dispatch function instead of login
  const navigate = useNavigate();

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`[PatientRegistration] Field changed: ${name}`);
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle input blur for validation
  const handleBlur = (e) => {
    const { name } = e.target;
    console.log(`[PatientRegistration] Field blurred: ${name}`);

    setTouched((prevTouched) => ({
      ...prevTouched,
      [name]: true,
    }));

    const fieldError = validatePatientForm(formData, name);
    console.log(
      `[PatientRegistration] Validation result for ${name}:`,
      fieldError
    );
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: fieldError,
    }));
  };

  // Handle form submission
  const handleRegister = async (e) => {
    e.preventDefault();
    console.log("[PatientRegistration] Form submission started");
    setLoading(true);
    setErrorMsg(null);

    const firstErrorField = Object.keys(errors).find(
      (field) => errors[field] !== null
    );

    if (firstErrorField) {
      console.log(
        `[PatientRegistration] Validation error in field: ${firstErrorField}`,
        errors[firstErrorField]
      );
      alert(errors[firstErrorField]);
      setLoading(false);
      return;
    }

    console.log("[PatientRegistration] Form validation passed, preparing data");
    // Only send required fields to match server expectations
    const dataToSend = {
      name: formData.name,
      email: formData.email || undefined, // Only send if provided
      nic: formData.nic || undefined, // Only send if provided
      password: formData.password,
      mobile: formData.mobile,
    };

    console.log("[PatientRegistration] Sending registration data:", {
      name: dataToSend.name,
      hasEmail: !!dataToSend.email,
      hasNIC: !!dataToSend.nic,
      hasMobile: !!dataToSend.mobile,
    });

    try {
      console.log("[PatientRegistration] Calling AuthService.registerPatient");
      const response = await AuthService.registerPatient(dataToSend);

      // Store the token from registration response
      if (response.accessToken) {
        console.log(
          "[PatientRegistration] Storing authentication data from registration response"
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
            "[PatientRegistration] Auth state updated, navigating to account page"
          );
          navigate("/account");
        } else {
          throw new Error(
            "Registration successful but login data is incomplete"
          );
        }
      }
    } catch (error) {
      console.error("[PatientRegistration] Registration failed:", error);
      setErrorMsg(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {errorMsg && (
        <div className="mb-4 p-4 rounded-md bg-red-50 text-red-700 border border-red-200">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
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

        <button
          type="submit"
          className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200"
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

export default PatientRegistration;
