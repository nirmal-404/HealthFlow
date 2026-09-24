import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import Input from "../components/ui/input";
import AuthService from "../services/AuthService";

const ForgotPasswordPage = () => {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Card title="Reset your password">
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
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  Return to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <p className="text-sm text-gray-600 mb-4">
                  Enter your email address, and we'll send you a link to reset
                  your password.
                </p>

                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Email Address"
                  placeholder="Enter your email"
                  value={email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <Link
                  to="/login"
                  className="block text-center text-sm text-blue-600 hover:text-blue-800"
                >
                  Return to login
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;