import TokenService from "./TokenService";

const API_URL = `${process.env.REACT_APP_API_URL}/preregistration`;

export const getPreRegisteredStaff = async () => {
  const res = await fetch(`${API_URL}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TokenService.getAccessToken()}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to fetch pre-registered staff");
  }

  return res.json();
};

export const preRegisterStaff = async (email, roleId) => {
  const res = await fetch(`${API_URL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TokenService.getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, roleId }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to pre-register staff");
  }

  return res.json();
};

export const deletePreRegisteredStaff = async (id) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TokenService.getAccessToken()}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(
      errorData.message || "Failed to delete pre-registered staff"
    );
  }

  return res.json();
};

// Updated to use GET request with query parameter
export const checkEmailPreRegistration = async (email) => {
  const res = await fetch(
    `${API_URL}/check?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to verify email");
  }

  return res.json();
};

// Export as a default object for easier imports
const PreRegistrationService = {
  getPreRegisteredStaff,
  preRegisterStaff,
  deletePreRegisteredStaff,
  checkEmailPreRegistration,
};

export default PreRegistrationService;
