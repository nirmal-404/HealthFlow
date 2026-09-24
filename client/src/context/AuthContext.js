import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import AuthService from "../services/AuthService";
import TokenService from "../services/TokenService";

// Context
const AuthContext = createContext();

// Initial state
const initialState = {
  currentUser: null,
  activeRole: null,
  permissions: [],
  loading: true,
  error: null,
  authType: "traditional", // Default to traditional auth type
};

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      console.log("[AuthContext] LOGIN_SUCCESS:", action.payload);
      return {
        ...state,
        currentUser: action.payload.user,
        activeRole: action.payload.role,
        permissions: action.payload.role?.permissions || [],
        authType: action.payload.user?.authType || "traditional", // Use user's authType or default
        loading: false,
        error: null,
      };
    case "LOGOUT":
      console.log("[AuthContext] LOGOUT");
      return { ...initialState, loading: false };
    case "SET_LOADING":
      return { ...state, loading: true };
    case "SET_LOADING_FALSE":
      return { ...state, loading: false };
    case "SET_ERROR":
      console.error("[AuthContext] SET_ERROR:", action.payload);
      return { ...state, error: action.payload, loading: false };
    case "SWITCH_ROLE":
      console.log("[AuthContext] SWITCH_ROLE:", action.payload);
      // Maintain current user data including authType when switching roles
      return {
        ...state,
        activeRole: action.payload.activeRole,
        permissions: action.payload.activeRole?.permissions || [],
        loading: false,
        error: null,
      };
    default:
      return state;
  }
}

// Provider
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Logout across tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "accessToken" && event.newValue === null) {
        console.log("[AuthContext] accessToken removed, logging out.");
        dispatch({ type: "LOGOUT" });
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Auth initialization
  useEffect(() => {
    const initAuth = async () => {
      dispatch({ type: "SET_LOADING" });
      console.log("[AuthContext] Initializing authentication...");

      const accessToken = TokenService.getAccessToken();

      if (!accessToken || TokenService.isTokenExpired(accessToken)) {
        console.warn("[AuthContext] No valid access token, logging out");
        logout();
        dispatch({ type: "SET_LOADING_FALSE" });
        return;
      }

      try {
        const userData = await AuthService.getMe();
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: {
            user: {
              ...userData.user,
              authType: userData.user.authType || "traditional", // Ensure authType is set
            },
            role: userData.activeRole,
          },
        });
      } catch (err) {
        console.error("[AuthContext] Failed to fetch user:", err);
        logout();
      } finally {
        dispatch({ type: "SET_LOADING_FALSE" });
      }
    };

    initAuth();
  }, []);

  // Updated login function that supports both direct login and the first step of OTP flow
  const login = async (identifier, password, otp = null) => {
    dispatch({ type: "SET_LOADING" });
    console.log("[AuthContext] Login process starting:", {
      identifier,
      hasPassword: !!password,
      hasOTP: !!otp,
    });

    try {
      // If OTP is provided, we're in step 2 of the login flow
      if (otp) {
        console.log("[AuthContext] OTP provided, verifying with server");
        // Get the stored userId from localStorage or session or pass it directly
        const userId = localStorage.getItem("temp_userId");

        if (!userId) {
          console.error("[AuthContext] No userId found for OTP verification");
          throw new Error(
            "Authentication session expired. Please try logging in again."
          );
        }

        // Verify OTP
        const response = await AuthService.verifyOtp(userId, otp);

        // Clear temporary userId
        localStorage.removeItem("temp_userId");

        if (response?.user && response?.activeRole) {
          console.log(
            "[AuthContext] OTP verified successfully, updating auth state"
          );
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: {
              user: {
                ...response.user,
                authType: response.user.authType || "traditional",
              },
              role: response.activeRole,
            },
          });
          return response;
        } else {
          throw new Error("Invalid response after OTP verification");
        }
      } else {
        // Step 1: Initial login to check credentials
        console.log("[AuthContext] Initial login step, checking credentials");
        const response = await AuthService.login(identifier, password);

        // If OTP is required, store userId temporarily and return response to UI
        if (response?.requiresOTP && response?.userId) {
          console.log("[AuthContext] OTP required, storing userId temporarily");
          localStorage.setItem("temp_userId", response.userId);
          dispatch({ type: "SET_LOADING_FALSE" });
          return response;
        }

        // If no OTP required (direct login, e.g. with NIC)
        if (response?.user && response?.activeRole) {
          console.log(
            "[AuthContext] Direct login successful, updating auth state"
          );
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: {
              user: {
                ...response.user,
                authType: response.user.authType || "traditional",
              },
              role: response.activeRole,
            },
          });
          return response;
        } else {
          throw new Error("Invalid response from server");
        }
      }
    } catch (err) {
      console.error("[AuthContext] Login error:", err);
      dispatch({ type: "SET_ERROR", payload: err.message });
      throw err;
    }
  };

  const logout = () => {
    console.log("[AuthContext] Logging out");
    AuthService.logout();
    localStorage.removeItem("temp_userId"); // Clear any temporary auth data
    dispatch({ type: "LOGOUT" });
  };

  const switchRole = async (roleId) => {
    dispatch({ type: "SET_LOADING" });
    console.log("[AuthContext] Switching to role:", roleId);
    try {
      const response = await AuthService.switchRole(roleId);

      if (!response || !response.activeRole) {
        throw new Error("Invalid response from server when switching role");
      }

      // Update the state with the new role and permissions without changing currentUser
      dispatch({
        type: "SWITCH_ROLE",
        payload: response,
      });

      return response;
    } catch (err) {
      console.error("[AuthContext] Failed to switch role:", err);
      dispatch({ type: "SET_ERROR", payload: err.message });
      throw err;
    }
  };

  const hasPermission = useCallback(
    (entity, action, scope = "all") => {
      return state.permissions.some(
        (perm) =>
          perm.entity === entity &&
          perm.action === action &&
          (perm.scope === scope || perm.scope === "all")
      );
    },
    [state.permissions]
  );

  const value = {
    ...state,
    dispatch,
    login,
    logout,
    hasPermission,
    switchRole,
    isAuthenticated: !!state.currentUser,
    // Explicitly expose authType to components
    authType: state.authType || "traditional",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
