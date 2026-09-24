import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TokenService from "../services/TokenService";
import AuthService from "../services/AuthService";
import { useAuthContext } from "../context/AuthContext";
import { ShieldCheck, AlertCircle } from "lucide-react";

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { dispatch } = useAuthContext();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get("token");
      const errParam = searchParams.get("error");

      if (errParam) {
        setError(`OAuth Authentication Failed: ${errParam}`);
        return;
      }

      if (!token) {
        setError("No authentication token received from OAuth callback.");
        return;
      }

      try {
        console.log("[OAuthCallbackPage] Storing access token from OAuth callback");
        TokenService.setAccessToken(token);

        // Fetch user info from getMe
        const userData = await AuthService.getMe();
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: {
            user: userData.user,
            role: userData.activeRole,
          },
        });

        console.log("[OAuthCallbackPage] Authentication successful, navigating to account");
        navigate("/account");
      } catch (err) {
        console.error("[OAuthCallbackPage] Failed to complete authentication:", err);
        setError(err.message || "Failed to complete Google OAuth authentication.");
      }
    };

    handleCallback();
  }, [searchParams, navigate, dispatch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl"></div>

        {!error ? (
          <div className="space-y-6 relative z-10">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <ShieldCheck className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900">Completing Sign-In</h2>
              <p className="text-sm text-gray-500 mt-1">
                Authenticating your credentials with HealthFlow...
              </p>
            </div>

            <div className="flex justify-center items-center space-x-2">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-ping"></div>
              <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping delay-100"></div>
              <div className="w-2.5 h-2.5 bg-purple-600 rounded-full animate-ping delay-200"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">Authentication Failed</h2>
              <p className="text-xs text-rose-600 mt-2 bg-rose-50 p-3 rounded-xl border border-rose-200">
                {error}
              </p>
            </div>

            <button
              onClick={() => navigate("/login")}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
