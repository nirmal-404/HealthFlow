import React, { useState, useEffect } from "react";
import { Mail, Phone, Calendar, User, Edit } from "lucide-react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { useRecordContext } from "../context/RecordContext";
import { useHoverPanel } from "../context/HoverPanelContext";
import HoverPanel from "../components/ui/hover-panel";

const tabs = [
  { label: "Patient Information", path: "" },
  { label: "Treatment history", path: "treatments" },
  { label: "Prescriptions", path: "prescriptions" },
  { label: "Medical Reports", path: "reports" },
  { label: "Documents", path: "documents" }

];

export default function PatientDetailPage() {
  const { id } = useParams();
  const { openPanel } = useHoverPanel();
  const { fetchRecord, updateRecord } = useRecordContext();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [formData, setFormData] = useState({
    nic: "",
    name: {
      firstName: "",
      middleNames: [],
      lastName: "",
    },
    dateOfBirth: "",
    gender: "",
    email: "",
    phone: "",
    passportDetails: {
      number: "",
      issuedCountry: "",
    },
    allergies: [
      {
        allergenName: "",
        manifestation: "",
      },
    ],
    pastMedicalHistory: [
      {
        condition: "",
        onset: "",
        clinicalStatus: "",
      },
    ],
    regularMedications: [
      {
        medicationName: "",
        form: "",
        dosage: "",
        route: "",
        status: "",
      },
    ],
    pastSurgicalHistory: [
      {
        procedureName: "",
        date: "",
      },
    ],
    immunizations: [
      {
        vaccineName: "",
        date: "",
      },
    ],
    behavioralRiskFactors: [
      {
        riskFactorName: "",
        status: "",
        duration: "",
        statusRecordedDate: "",
      },
    ],
    healthRiskAssessment: [
      {
        assessmentType: "",
        outcome: "",
        assessmentDate: "",
      },
    ],
    activeStatus: true,
  });

  useEffect(() => {
    const fetchPatientDetails = async () => {
      try {
        const data = await fetchRecord(id);
        if (data && data.record) {
          const formattedRecord = {
            ...data.record,
            name: {
              firstName: data.record.firstName || data.record.name?.firstName || '',
              middleNames: data.record.middleNames || data.record.name?.middleNames || [],
              lastName: data.record.lastName || data.record.name?.lastName || ''
            }
          };

          setPatient(formattedRecord);
          setFormData(formattedRecord);
        } else {
          setError("Patient data not found");
        }
      } catch (err) {
        setError("Failed to fetch patient details");
        console.error("Error fetching patient:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientDetails();
  }, [id, fetchRecord]);

  const handlePersonalInfoChange = (e) => {
    const { name, value } = e.target;

    if (name === "firstName" || name === "lastName") {
      setFormData((prev) => ({
        ...prev,
        name: {
          ...prev.name,
          [name]: value,
        },
      }));
    } else if (name === "middleNames") {
      const middleNamesArray = Array.isArray(value) ? value : value.split(',').map(n => n.trim());
      setFormData((prev) => ({
        ...prev,
        name: {
          ...prev.name,
          middleNames: middleNamesArray,
        },
      }));
    } else if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handlePersonalInfoSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);

      const updatedData = { ...formData };

      if (!updatedData.name) {
        updatedData.name = {
          firstName: formData.firstName || "",
          middleNames: formData.middleNames || [],
          lastName: formData.lastName || ""
        };

        delete updatedData.firstName;
        delete updatedData.middleNames;
        delete updatedData.lastName;
      }

      await updateRecord(id, updatedData);
      setIsEditingPersonal(false);
      setPatient(updatedData);
      alert("Personal information updated successfully");
    } catch (err) {
      console.error("Error updating personal information:", err);
      setError("Failed to update personal information. Please try again.");
    }
  };

  const handleSubmit = async (e, updatedData = null) => {
    e.preventDefault();

    try {
      setError(null);
      const dataToUpdate = updatedData || formData;
      await updateRecord(id, dataToUpdate);
      setIsEditingMedical(false);
      setPatient(dataToUpdate);
      setFormData(dataToUpdate);
      alert("Patient record updated successfully");
    } catch (err) {
      console.error("Error updating patient record:", err);
      setError("Failed to update patient record. Please try again.");
    }
  };

  if (loading) return <div className="p-8 text-gray-600">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!patient) return <div className="p-8 text-gray-600">Patient not found</div>;

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-8 border-b border-gray-100">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-inner">
                <User className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  <span className="text-gray-900">
                    {`${patient.name?.firstName || ''} ${patient.name?.middleNames?.join(' ') || ''} ${patient.name?.lastName || ''}`}
                  </span>
                </h2>
                <div className="text-sm text-gray-500 mt-1">Patient ID: {patient.id}</div>
              </div>
            </div>

            <button
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                isEditingPersonal
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
              onClick={() => setIsEditingPersonal(!isEditingPersonal)}
            >
              <Edit className="w-4 h-4" />
              {isEditingPersonal ? "Cancel Edit" : "Edit Profile"}
            </button>
          </div>

          {isEditingPersonal ? (
            <form onSubmit={handlePersonalInfoSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">First Name</span>
                  </div>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.name?.firstName || ""}
                    onChange={handlePersonalInfoChange}
                    className="w-full px-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">Middle Names</span>
                  </div>
                  <input
                    type="text"
                    name="middleNames"
                    value={formData.name?.middleNames?.join(', ') || ""}
                    onChange={(e) => handlePersonalInfoChange({
                      target: {
                        name: 'middleNames',
                        value: e.target.value.split(',').map(n => n.trim())
                      }
                    })}
                    className="w-full px-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">Last Name</span>
                  </div>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.name?.lastName || ""}
                    onChange={handlePersonalInfoChange}
                    className="w-full px-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">Email</span>
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handlePersonalInfoChange}
                    className="w-full px-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">Phone</span>
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handlePersonalInfoChange}
                    className="w-full px-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">Date of Birth</span>
                  </div>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handlePersonalInfoChange}
                    className="w-full px-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">Gender</span>
                  </div>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handlePersonalInfoChange}
                    className="w-full px-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">NIC</span>
                  </div>
                  <input
                    type="text"
                    name="nic"
                    value={formData.nic}
                    onChange={handlePersonalInfoChange}
                    className="w-full px-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">Active Status</span>
                  </div>
                  <select
                    name="activeStatus"
                    value={formData.activeStatus}
                    onChange={handlePersonalInfoChange}
                    className="w-full px-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value={true}>Active</option>
                    <option value={false}>Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsEditingPersonal(false)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">Email</span>
                </div>
                <div className="text-sm text-gray-900">{patient.email || 'No email provided'}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">Phone</span>
                </div>
                <div className="text-sm text-gray-900">{patient.phone || 'No phone provided'}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">Date of Birth</span>
                </div>
                <div className="text-sm text-gray-900">
                  {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'No DOB provided'}
                </div>
              </div>

              {/* Continue with same pattern for other fields */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">Gender</span>
                </div>
                <div className="text-sm text-gray-900">{patient.gender || 'No gender provided'}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">NIC</span>
                </div>
                <div className="text-sm text-gray-900">{patient.nic || 'No NIC provided'}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">Status</span>
                </div>
                <div className={`text-sm ${patient.activeStatus ? 'text-green-600' : 'text-red-600'}`}>
                  {patient.activeStatus ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">First Name</span>
                </div>
                <div className="text-sm text-gray-900">{patient.name?.firstName || 'No first name provided'}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">Middle Names</span>
                </div>
                <div className="text-sm text-gray-900">{patient.name?.middleNames?.join(' ') || 'No middle names provided'}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">Last Name</span>
                </div>
                <div className="text-sm text-gray-900">{patient.name?.lastName || 'No last name provided'}</div>
              </div>
              {patient.passportDetails && (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">Passport Number</span>
                    </div>
                    <div className="text-sm text-gray-900">{patient.passportDetails.number || 'No passport number provided'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">Issued Country</span>
                    </div>
                    <div className="text-sm text-gray-900">{patient.passportDetails.issuedCountry || 'No issued country provided'}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Original tabs style */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map(({ label, path }) => (
              <NavLink
                key={path}
                to={path}
                end={path === ""}
                className={({ isActive }) =>
                  `px-6 py-3 text-sm font-medium ${
                    isActive
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="p-8">
          <Outlet context={{ 
            patient, 
            isEditing: isEditingMedical, 
            setIsEditing: setIsEditingMedical, 
            formData, 
            setFormData, 
            handleSubmit 
          }} />
        </div>
      </div>
      <HoverPanel />
    </>
  );
}