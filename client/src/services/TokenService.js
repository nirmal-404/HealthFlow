import { jwtDecode } from "jwt-decode";

const TokenService = {
  // Store access token in localStorage
  setAccessToken(token) {
    if (token) {
      console.log("[TokenService] Setting access token");
      localStorage.setItem("accessToken", token);
    } else {
      localStorage.removeItem("accessToken");
    }
  },

  // Get the current access token
  getAccessToken() {
    return localStorage.getItem("accessToken");
  },

  // Clear tokens (logout)
  clearTokens() {
    console.log("[TokenService] Clearing access token");
    localStorage.removeItem("accessToken");
  },

  // Check if a token is expired
  isTokenExpired(token) {
    if (!token) return true;

    try {
      const decoded = jwtDecode(token);
      if (!decoded.exp) return true;

      const currentTime = Math.floor(Date.now() / 1000);
      const bufferTime = 30; // 30 seconds buffer to force refresh slightly early

      console.log("[TokenService] Token expiration check:", {
        currentTime,
        expiration: decoded.exp,
        isExpired: currentTime >= decoded.exp - bufferTime,
      });

      return currentTime >= decoded.exp - bufferTime;
    } catch (error) {
      console.error("[TokenService] Error decoding token:", error);
      return true;
    }
  },

  // Check if current access token is expired
  isAccessTokenExpired() {
    return this.isTokenExpired(this.getAccessToken());
  },

  // Get payload from token
  decodeToken(token) {
    try {
      return jwtDecode(token);
    } catch (error) {
      console.error("[TokenService] Error decoding token:", error);
      return null;
    }
  },
};

export default TokenService;
