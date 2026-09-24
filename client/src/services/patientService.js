import api from './api';

// Fetch patient medical profile by NIC
export const getPatientByNIC = async (nic) => {
  try {
    const response = await api.get(`/api/patients/nic/${nic}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get appointment by ID with populated patient data
export const getAppointmentWithPatientData = async (appointmentId) => {
  try {
    // First, get the appointment details
    const appointmentResponse = await api.get(`/api/appointments/appointments/${appointmentId}`);
    const appointment = appointmentResponse.data;
    
    if (!appointment.nic) {
      throw new Error('Appointment does not have patient NIC information');
    }
    
    try {
        console.log("nic:" + appointment.nic);
      // Next, get the patient's medical profile using the NIC from the appointment
      const patientData = await getPatientByNIC(appointment.nic);
      
      console.log("patientData:" + patientData);
      // Return combined data
      return {
        appointment,
        patientData
      };
    } catch (patientError) {
      return { appointment };
    }
  } catch (error) {
    throw error;
  }
};