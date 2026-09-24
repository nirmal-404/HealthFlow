import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PatientRegistration from "../components/registration/PatientRegistration";
import DoctorRegistration from "../components/registration/DoctorRegistration";
import StaffRegistration from "../components/registration/StaffRegistration";
import "./RegisterPage.css";

const RegisterPage = () => {
  const [step, setStep] = useState(1); // Step 1: Initial selection, Step 2: Registration form
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedMedicalRole, setSelectedMedicalRole] = useState(null);
  const navigate = useNavigate();

  const handleRoleSelection = (role) => {
    setSelectedRole(role);
    if (role === "patient") {
      // If patient is selected, go directly to the patient registration form
      setStep(2);
    } else {
      // If medical staff is selected, show the sub-selection
      setSelectedMedicalRole(null);
    }
  };

  const handleMedicalRoleSelection = (role) => {
    setSelectedMedicalRole(role);
    setStep(2); // Move to the registration form step after selecting medical role
  };

  const goBack = () => {
    if (step === 2) {
      // If in registration form step, go back to selection step
      setStep(1);
      // If we came from a medical role, clear just that role but keep the primary role
      if (selectedMedicalRole) {
        setSelectedMedicalRole(null);
      }
      // If we came from patient selection, clear the primary role
      else if (selectedRole === "patient") {
        setSelectedRole(null);
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left side - Image and testimonial */}
      <div className="w-1/2 relative hidden md:block">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60 z-10"></div>
        <img
          src="/register.jpg"
          alt="Doctor discussing medical scan"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute top-8 left-8 z-20">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-white rounded-full"></div>
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            <span className="text-white text-xl font-semibold">HealthFlow</span>
          </div>
        </div>
        <div className="absolute bottom-20 left-8 right-8 z-20 text-white">
          <blockquote className="text-3xl font-bold mb-6">
            "Streamlined healthcare for professionals and patients."
          </blockquote>
          <div>
            <p className="font-semibold text-lg">Dr. Michael Chen</p>
            <p className="text-sm text-white/80">Head of Radiology</p>
          </div>
        </div>
      </div>

      {/* Right side - Step-by-step Registration */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white overflow-y-auto">
        <div className="w-full max-w-[500px] px-8 py-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create an account
          </h1>
          <p className="text-gray-500 mb-8">
            Join HealthFlow to manage your healthcare needs efficiently.
          </p>

          {step === 1 ? (
            <div className="space-y-8">
              {/* Primary Role Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-700 mb-4">
                  Select your account type
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center space-x-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="primary"
                      className="w-5 h-5 text-indigo-500 border-gray-300 focus:ring-indigo-500"
                      checked={selectedRole === "patient"}
                      onChange={() => handleRoleSelection("patient")}
                    />
                    <div className="ml-2">
                      <span className="text-gray-700 font-medium text-lg block">
                        Patient
                      </span>
                      <span className="text-gray-500 text-sm">
                        Register as a patient to book appointments and access
                        medical records
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="primary"
                      className="w-5 h-5 text-indigo-500 border-gray-300 focus:ring-indigo-500"
                      checked={selectedRole === "medicalStaff"}
                      onChange={() => handleRoleSelection("medicalStaff")}
                    />
                    <div className="ml-2">
                      <span className="text-gray-700 font-medium text-lg block">
                        Medical Staff
                      </span>
                      <span className="text-gray-500 text-sm">
                        Register as a doctor or staff member
                      </span>
                    </div>
                  </label>
                </div>

                {/* Medical Staff Sub-selection */}
                {selectedRole === "medicalStaff" && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-700 mb-4">
                      Select your role
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-center space-x-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="medicalRole"
                          className="w-5 h-5 text-indigo-500 border-gray-300 focus:ring-indigo-500"
                          checked={selectedMedicalRole === "doctor"}
                          onChange={() => handleMedicalRoleSelection("doctor")}
                        />
                        <div className="ml-2">
                          <span className="text-gray-700 font-medium text-lg block">
                            Doctor
                          </span>
                          <span className="text-gray-500 text-sm">
                            Register your practice and manage patients
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="medicalRole"
                          className="w-5 h-5 text-indigo-500 border-gray-300 focus:ring-indigo-500"
                          checked={selectedMedicalRole === "staff"}
                          onChange={() => handleMedicalRoleSelection("staff")}
                        />
                        <div className="ml-2">
                          <span className="text-gray-700 font-medium text-lg block">
                            Staff
                          </span>
                          <span className="text-gray-500 text-sm">
                            Join as staff working for a doctor using this system
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                <div className="text-center mt-8">
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
              </div>
            </div>
          ) : (
            <div>
              {/* Back Button */}
              <button
                type="button"
                onClick={goBack}
                className="mb-6 flex items-center text-indigo-500 hover:text-indigo-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Back
              </button>

              {/* Step 2: Registration Forms */}
              <h3 className="text-lg font-medium text-gray-700 mb-4">
                {selectedRole === "patient" && "Patient Registration"}
                {selectedMedicalRole === "doctor" && "Doctor Registration"}
                {selectedMedicalRole === "staff" && "Staff Registration"}
              </h3>

              <div>
                {selectedRole === "patient" && <PatientRegistration />}
                {selectedMedicalRole === "doctor" && <DoctorRegistration />}
                {selectedMedicalRole === "staff" && <StaffRegistration />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
