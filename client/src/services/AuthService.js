import TokenService from "./TokenService";

const AuthService = {
  // Step 1: Login with credentials only to receive OTP
  async login(identifier, password) {
    console.log("[AuthService] Login attempt:", { identifier });

    try {
      console.log("[AuthService] Making POST request to /auth/login");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ identifier, password }),
        }
      );

      const data = await response.json();
      console.log("[AuthService] Login response status:", response.status);

      if (!response.ok) {
        console.error("[AuthService] Login failed:", data.message);
        throw new Error(data.message || "Login failed");
      }

      // If OTP is required, store userId for later verification
      if (data.requiresOTP) {
        console.log("[AuthService] Credentials verified, OTP required");
        // Return the userId needed for OTP verification
        return {
          requiresOTP: true,
          message: data.message,
          userId: data.userId,
        };
      }

      // For NIC login or when OTP is not needed
      if (data.accessToken) {
        console.log("[AuthService] Login successful, storing access token");
        TokenService.setAccessToken(data.accessToken);
      }

      console.log("[AuthService] Login completed successfully");
      return data;
    } catch (error) {
      console.error("[AuthService] Login error:", error);
      throw error;
    }
  },

  // Step 2: Verify OTP in a separate API call
  async verifyOtp(userId, otp) {
    console.log("[AuthService] Verifying OTP for user:", userId);

    try {
      console.log("[AuthService] Making POST request to /auth/verify-otp");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, otp }),
        }
      );

      const data = await response.json();
      console.log("[AuthService] Verify OTP response status:", response.status);

      if (!response.ok) {
        console.error("[AuthService] OTP verification failed:", data.message);
        throw new Error(data.message || "OTP verification failed");
      }

      // Store the access token after successful verification
      if (data.accessToken) {
        console.log(
          "[AuthService] OTP verification successful, storing access token"
        );
        TokenService.setAccessToken(data.accessToken);
      }

      console.log("[AuthService] OTP verification completed successfully");
      return data;
    } catch (error) {
      console.error("[AuthService] OTP verification error:", error);
      throw error;
    }
  },

  // Helper function to store auth data directly after OTP verification
  storeAuthData(authData) {
    console.log("[AuthService] Manually storing authentication data");

    if (authData.accessToken) {
      console.log("[AuthService] Storing access token");
      TokenService.setAccessToken(authData.accessToken);
    } else {
      console.warn(
        "[AuthService] No access token found in authentication data"
      );
    }

    // Clear any temporary authentication data
    localStorage.removeItem("temp_userId");
    localStorage.removeItem("temp_identifier");
    localStorage.removeItem("temp_password");

    return true;
  },

  async getMe() {
    console.log("[AuthService] Fetching current user data");
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      });

      console.log("[AuthService] getMe response status:", response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("[AuthService] Failed to fetch user data:", errorData);
        throw new Error(errorData.message || "Failed to fetch user data");
      }

      const userData = await response.json();
      console.log("[AuthService] User data fetched successfully");
      return userData;
    } catch (error) {
      console.error("[AuthService] getMe error:", error);
      throw error;
    }
  },

  async getAllDoctors() {
    console.log("[AuthService] getAllDoctors called");
    try {
      // Use the same URL pattern as login and getMe
      console.log("[AuthService] Making API call to auth/doctors");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/doctors`,
        {
          headers: {
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
        }
      );

      console.log(
        "[AuthService] getAllDoctors response status:",
        response.status
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[AuthService] Error response:",
          response.status,
          errorText
        );
        throw new Error(`Failed to fetch doctors: ${response.status}`);
      }

      const data = await response.json();
      console.log("[AuthService] Doctors fetched successfully:", data.length);
      return data;
    } catch (error) {
      console.error("[AuthService] Error fetching doctors:", error);
      throw error;
    }
  },

  async registerPatient(data) {
    console.log("[AuthService] registerPatient called with data:", {
      name: data.name,
      hasEmail: !!data.email,
      hasNIC: !!data.nic,
      hasMobile: !!data.mobile,
    });

    try {
      console.log(
        "[AuthService] Making POST request to /auth/register/patient"
      );
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/register/patient`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const responseData = await response.json();
      console.log(
        "[AuthService] registerPatient response status:",
        response.status
      );

      if (!response.ok) {
        console.error(
          "[AuthService] Patient registration failed:",
          responseData.message
        );
        throw new Error(responseData.message || "Failed to register patient");
      }

      console.log("[AuthService] Patient registration successful");
      return responseData;
    } catch (error) {
      console.error("[AuthService] Registration error:", error);
      throw error;
    }
  },

  async registerDoctor(data) {
    console.log("[AuthService] registerDoctor called with data:", {
      name: data.name,
      hasEmail: !!data.email,
      hasNIC: !!data.nic,
      hasMobile: !!data.mobile,
      hasSpecialization: !!(data.doctorInfo && data.doctorInfo.specialization),
      hasLicenseNumber: !!(data.doctorInfo && data.doctorInfo.licenseNumber),
    });

    try {
      console.log("[AuthService] Making POST request to /auth/register/doctor");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/register/doctor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      console.log(
        "[AuthService] registerDoctor response status:",
        response.status
      );
      const responseData = await response.json();

      if (!response.ok) {
        console.error(
          "[AuthService] Doctor registration failed:",
          responseData.message
        );
        throw new Error(responseData.message || "Failed to register doctor");
      }

      console.log("[AuthService] Doctor registration successful");
      return responseData;
    } catch (error) {
      console.error("[AuthService] Doctor registration error:", error);
      throw error;
    }
  },

  async registerStaff(data) {
    console.log("[AuthService] registerStaff called with data:", {
      name: data.name,
      hasEmail: !!data.email,
      hasNic: !!data.nic,
      hasMobile: !!data.mobile,
      hasConfirmPassword: !!data.confirmPassword,
      authType: data.authType || "traditional",
    });

    try {
      console.log("[AuthService] Making POST request to /auth/register/staff");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/register/staff`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      console.log(
        "[AuthService] registerStaff response status:",
        response.status
      );
      const responseData = await response.json();

      if (!response.ok) {
        console.error(
          "[AuthService] Staff registration failed:",
          responseData.message
        );
        throw new Error(responseData.message || "Failed to register staff");
      }

      console.log("[AuthService] Staff registration successful");
      return responseData;
    } catch (error) {
      console.error("[AuthService] Staff registration error:", error);
      throw error;
    }
  },

  async get2FAStatus() {
    console.log("[AuthService] Getting 2FA status");
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/2fa-status`,
        {
          headers: {
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[AuthService] Failed to get 2FA status:", errorData);
        throw new Error(errorData.message || "Failed to get 2FA status");
      }

      const data = await response.json();
      console.log("[AuthService] 2FA status retrieved:", data.otpEnabled);
      return data.otpEnabled;
    } catch (error) {
      console.error("[AuthService] get2FAStatus error:", error);
      throw error;
    }
  },

  async toggle2FA() {
    console.log("[AuthService] Toggling 2FA status");
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/toggle-2fa`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[AuthService] Failed to toggle 2FA:", errorData);
        throw new Error(errorData.message || "Failed to toggle 2FA");
      }

      const data = await response.json();
      console.log("[AuthService] 2FA toggled successfully:", data.otpEnabled);
      return data;
    } catch (error) {
      console.error("[AuthService] toggle2FA error:", error);
      throw error;
    }
  },

  async forgotPassword(email) {
    console.log("[AuthService] Forgot password request for email:", email);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          "[AuthService] Forgot password request failed:",
          errorData
        );
        throw new Error(
          errorData.message || "Failed to process password reset request"
        );
      }

      const data = await response.json();
      console.log("[AuthService] Forgot password request successful");
      return data;
    } catch (error) {
      console.error("[AuthService] Forgot password error:", error);
      throw error;
    }
  },

  async verifyResetToken(userId, token) {
    console.log("[AuthService] Verifying reset token");
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/verify-reset-token?userId=${userId}&token=${token}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[AuthService] Token verification failed:", errorData);
        throw new Error(errorData.message || "Failed to verify reset token");
      }

      const data = await response.json();
      console.log("[AuthService] Reset token verification result:", data.valid);
      return data.valid;
    } catch (error) {
      console.error("[AuthService] Reset token verification error:", error);
      throw error;
    }
  },

  async resetPassword(userId, token, password) {
    console.log("[AuthService] Resetting password");
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, token, password }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[AuthService] Password reset failed:", errorData);
        throw new Error(errorData.message || "Failed to reset password");
      }

      const data = await response.json();
      console.log("[AuthService] Password reset successful");
      return data;
    } catch (error) {
      console.error("[AuthService] Password reset error:", error);
      throw error;
    }
  },

  async switchRole(roleId) {
    console.log("[AuthService] Switching to role:", roleId);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/switch-role`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
          body: JSON.stringify({ roleId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[AuthService] Failed to switch role:", errorData);
        throw new Error(errorData.message || "Failed to switch role");
      }

      const data = await response.json();
      console.log("[AuthService] Role switched successfully");

      // Update the token if a new one is provided
      if (data.accessToken) {
        TokenService.setAccessToken(data.accessToken);
      }

      return data;
    } catch (error) {
      console.error("[AuthService] switchRole error:", error);
      throw error;
    }
  },

  logout() {
    console.log("[AuthService] Logging out");
    TokenService.clearTokens();
  },
};

export default AuthService;
