import { useState } from "react";
import Button from "../ui/button";
import Input from "../ui/input";
import AuthService from "../../services/AuthService";

const ForgotPassword = ({ onCancel }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      await AuthService.forgotPassword(email);
      setSuccess(true);
    } catch (error) {
      console.error("Forgot password error:", error);
      setError(error.message || "Failed to process your request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Reset your password
      </h1>
      <p className="text-gray-500 mb-8">
        Enter your email to receive a password reset link.
      </p>

      {success ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
            <p>
              If your email exists in our system, you will receive a password
              reset link shortly.
            </p>
            <p className="mt-2">
              Please check your inbox and follow the instructions to reset
              your password.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200"
          >
            Return to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="mb-4 p-4 rounded-md bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Email Address"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition duration-200"
          >
            Back to Login
          </button>
        </form>
      )}
    </div>
  );
};

export default ForgotPassword;