import TokenService from "./TokenService";

const API_URL = `${process.env.REACT_APP_API_URL}/appointments`;

const getDoctorSchedules = async (doctorId) => {
  try {
    // Add cache-busting timestamp and no-cache headers
    const timestamp = new Date().getTime();
    const response = await fetch(
      `${API_URL}/doctors/${doctorId}/getSchedule?_=${timestamp}`,
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch doctor schedules");
    }
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

const deleteAvailability = async (doctorId, availabilityId) => {
  try {
    const response = await fetch(
      `${API_URL}/availability/${doctorId}/${availabilityId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      }
    );

    // Get the response data
    const data = await response.json();

    // If response is not OK, throw an error with the response data
    if (!response.ok) {
      const error = new Error(data.message || "Failed to delete availability");
      error.response = { data };
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error deleting availability:", error);
    throw error;
  }
};

const checkAvailabilityUpdatable = async (doctorId, availabilityId) => {
  try {
    const response = await fetch(
      `${API_URL}/availability/${doctorId}/${availabilityId}/check-updatable`,
      {
        headers: {
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      const error = new Error(data.message || "Failed to check availability");
      error.response = { data };
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error("Error checking availability:", error);
    throw error;
  }
};

const updateAvailability = async (doctorId, availabilityId, data) => {
  try {
    const response = await fetch(
      `${API_URL}/availability/${doctorId}/${availabilityId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const responseData = await response.json();
      const error = new Error(
        responseData.message || "Failed to update availability"
      );
      error.response = { data: responseData };
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating availability:", error);
    throw error;
  }
};

const createSchedule = async (doctorId, data) => {
  try {
    const response = await fetch(`${API_URL}/doctors/${doctorId}/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TokenService.getAccessToken()}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to create schedule");
    }
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

const getAllDoctors = async () => {
  try {
    const response = await fetch(`${API_URL}/doctors`, {
      headers: {
        Authorization: `Bearer ${TokenService.getAccessToken()}`,
      },
    });
    if (!response.ok) {
      console.error("Response status:", response.status);
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(`Failed to fetch doctors: ${response.status}`);
    }
    const data = await response.json();
    console.log("Doctors data:", data);
    return data;
  } catch (error) {
    console.error("Error in getAllDoctors:", error);
    throw error;
  }
};

const getAppointmentsByDoctor = async (doctorId) => {
  try {
    const response = await fetch(`${API_URL}/appointments/doctor/${doctorId}`, {
      headers: {
        Authorization: `Bearer ${TokenService.getAccessToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch doctor appointments");
    }
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

const getDoctorSlotsByDate = async (doctorId, date) => {
  try {
    console.log("Service: Getting slots for doctor:", doctorId);
    const formattedDate = new Date(date);
    formattedDate.setHours(0, 0, 0, 0);
    const isoDate = formattedDate.toISOString();
    console.log("Service: Formatted date:", isoDate);

    // Add cache-busting timestamp
    const timestamp = new Date().getTime();
    const response = await fetch(
      `${API_URL}/doctors/${doctorId}/slots/slots?date=${isoDate}&_=${timestamp}`,
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      }
    );
    console.log("Service: Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Service: Error response:", errorText);
      throw new Error(`Failed to fetch doctor slots: ${response.status}`);
    }

    const data = await response.json();
    console.log("Service: Received data:", data);
    return data;
  } catch (error) {
    console.error("Service: Error in getDoctorSlotsByDate:", error);
    throw error;
  }
};

export {
  getDoctorSchedules,
  deleteAvailability,
  createSchedule,
  getAllDoctors,
  getAppointmentsByDoctor,
  getDoctorSlotsByDate,
  checkAvailabilityUpdatable,
  updateAvailability,
};
