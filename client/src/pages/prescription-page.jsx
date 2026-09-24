import { useState, useEffect } from "react";
import { useAuthContext } from "../context/AuthContext";
import TokenService from "../services/TokenService";
import Button from "../components/ui/button";
import Input from "../components/ui/input";
import Modal from "../components/ui/modal";
import { Plus, Calendar, User, Clock, Eye } from "lucide-react";
import jsPDF from 'jspdf';
import { useNavigate } from "react-router-dom";

// API URL constant
const API_URL = `${process.env.REACT_APP_API_URL}`;

// Utility function to format patient name
const formatPatientName = (patientData) => {
  if (!patientData) return "Unknown";
  
  if (typeof patientData === 'string') return patientData;
  
  if (patientData.firstName || patientData.lastName) {
    return [
      patientData.firstName,
      ...(patientData.middleNames || []),
      patientData.lastName
    ].filter(Boolean).join(' ');
  }
  
  return "Unknown";
};

export default function PrescriptionPage() {
  const { currentUser } = useAuthContext();
  const doctorId = currentUser?.id;
  console.log("Doctor ID:", doctorId);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrescription, setEditedPrescription] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editButtonsVisible, setEditButtonsVisible] = useState(false);
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isEditable = (prescription) => {
    console.log("========= Checking Prescription Editability =========");
    console.log("Full prescription object:", prescription);
    
    if (!prescription?.dateIssued) {
      console.log("No dateIssued found in prescription!");
      return false;
    }
    
    const creationTime = new Date(prescription.dateIssued).getTime();
    const currentTime = new Date().getTime();
    const oneHourInMilliseconds = 60 * 60 * 1000;
    const timeLeft = oneHourInMilliseconds - (currentTime - creationTime);
    
    console.log("Creation time:", new Date(creationTime).toLocaleString());
    console.log("Current time:", new Date(currentTime).toLocaleString());
    console.log("Time left for editing:", Math.floor(timeLeft / 1000 / 60), "minutes");
    console.log("Is editable:", timeLeft > 0);
    
    return timeLeft > 0;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = TokenService.getAccessToken();

        // Removed the unnecessary API call to fetch doctor details
        // Using currentUser from AuthContext instead

        const response = await fetch(`${API_URL}/prescriptions/doctor/${doctorId}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch prescriptions");
        }

        const data = await response.json();
        console.log("Fetched prescriptions:", data); // Added debug log
        setPrescriptions(data);
      } catch (err) {
        console.error("Error fetching prescriptions:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (doctorId) {
      fetchData();
    }
  }, [doctorId]);

  const handleViewPrescription = (prescription) => {
    console.log("View button clicked for prescription:", prescription);
    if (!prescription) {
      console.log("No prescription data received");
      return;
    }
    
    const canEdit = isEditable(prescription);
    console.log("Can edit prescription?", canEdit);
    
    setSelectedPrescription(prescription);
    setEditButtonsVisible(canEdit);
    setViewModalOpen(true);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedPrescription({
      ...selectedPrescription,
      validUntil: new Date(selectedPrescription.validUntil).toISOString().split('T')[0],
    });
  };

  const handleDeletePrescription = async (prescriptionToDelete) => {
    if (!prescriptionToDelete || !prescriptionToDelete._id) {
      console.error("Invalid prescription object");
      setError("Cannot delete prescription: Invalid prescription data");
      return;
    }

    const confirmDelete = window.confirm("Are you sure you want to delete this prescription? This action cannot be undone.");
    
    if (!confirmDelete) {
      return;
    }

    try {
      const token = TokenService.getAccessToken();
      const response = await fetch(`${API_URL}/prescriptions/${prescriptionToDelete._id}`, {
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete prescription");
      }

      // Remove the deleted prescription from the state
      setPrescriptions(prescriptions.filter(p => p._id !== prescriptionToDelete._id));
      setViewModalOpen(false);
    } catch (err) {
      console.error("Error deleting prescription:", err);
      setError(err.message);
    }
  };

  const handleDeleteClick = (prescription) => {
    if (!prescription) {
      console.error("No prescription provided to delete");
      return;
    }
    handleDeletePrescription(prescription);
  };

  const handleUpdatePrescription = async () => {
    setIsSubmitting(true);
    try {
      const token = TokenService.getAccessToken();
      const response = await fetch(`${API_URL}/prescriptions/${editedPrescription._id}`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: editedPrescription.patientId._id,
          doctorId: editedPrescription.doctorId._id,
          medicines: editedPrescription.medicines,
          validUntil: new Date(editedPrescription.validUntil).toISOString(),
          notes: editedPrescription.notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update prescription");
      }

      // Refresh prescriptions list
      const updatedResponse = await fetch(`${API_URL}/prescriptions/doctor/${doctorId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setPrescriptions(updatedData);
      }

      setIsEditing(false);
      setViewModalOpen(false);
      setSelectedPrescription(null);
      setEditedPrescription(null);
    } catch (err) {
      console.error("Error updating prescription:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMedicineChange = (index, field, value) => {
    const updatedMedicines = [...editedPrescription.medicines];
    updatedMedicines[index][field] = value;
    setEditedPrescription({
      ...editedPrescription,
      medicines: updatedMedicines,
    });
  };

  const handleDownloadPrescription = (prescription) => {
    const doc = new jsPDF();
    
    // Set initial y position
    let y = 20;
    const lineHeight = 7;
    
    // Add title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESCRIPTION', 105, y, { align: 'center' });
    y += lineHeight * 2;

    // Add header info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.line(20, y, 190, y);
    y += lineHeight;

    doc.text(`Doctor: Dr. ${prescription.doctorId?.name || "Unknown"}`, 20, y);
    y += lineHeight;
    doc.text(`Date Issued: ${formatDate(prescription.dateIssued)}`, 20, y);
    y += lineHeight;
    doc.text(`Valid Until: ${formatDate(prescription.validUntil)}`, 20, y);
    y += lineHeight;
    doc.text(`Patient: ${formatPatientName(prescription.patientId?.name) || "Unknown"}`, 20, y);
    y += lineHeight * 2;

    // Add medicines section
    doc.setFont('helvetica', 'bold');
    doc.text('MEDICINES:', 20, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');

    prescription.medicines.forEach(medicine => {
      doc.text(`• ${medicine.medicineName}`, 20, y);
      y += lineHeight;
      doc.text(`  Dosage: ${medicine.dosage}`, 25, y);
      y += lineHeight;
      doc.text(`  Quantity: ${medicine.quantity}`, 25, y);
      y += lineHeight;
      doc.text(`  Frequency: ${medicine.frequency}`, 25, y);
      y += lineHeight;
      doc.text(`  Instructions: ${medicine.instructions}`, 25, y);
      y += lineHeight * 1.5;

      // Add a new page if we're running out of space
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
    });

    // Add notes section
    doc.setFont('helvetica', 'bold');
    doc.text('Additional Notes:', 20, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.text(prescription.notes || 'None', 20, y);
    y += lineHeight * 2;

    // Add footer
    doc.line(20, y, 190, y);
    y += lineHeight;
    doc.setFontSize(9);
    doc.text('HealthFlow Medical Center', 105, y, { align: 'center' });
    y += lineHeight;
    doc.text('This is a computer generated prescription.', 105, y, { align: 'center' });

    // Save the PDF
    doc.save(`prescription-${prescription._id}.pdf`);
  };

  const handleViewAnalytics = () => {
    navigate('/account/prescription-report');
  };

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    // If there's no search query, include all prescriptions
    if (!searchQuery.trim()) return true;
    
    // Use the formatPatientName function to get a consistently formatted name
    const patientName = formatPatientName(prescription.patientId?.name).toLowerCase();
    return patientName.includes(searchQuery.toLowerCase());
  });

  return (
    <>
      <Modal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedPrescription(null);
        }}
        title="Prescription Details"
        size="lg"
        footer={
          <div className="flex justify-end w-full gap-4">
            {isEditing ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedPrescription(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleUpdatePrescription}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setViewModalOpen(false);
                    setSelectedPrescription(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  variant="secondary"
                  className="bg-green-700 hover:bg-green-800 text-white inline-flex items-center justify-center"
                  onClick={() => handleDownloadPrescription(selectedPrescription)}
                >
                  Download PDF
                </Button>
                {editButtonsVisible && (
                  <>
                    <Button
                      variant="primary"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleEditClick}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => handleDeleteClick(selectedPrescription)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        }
      >
        {selectedPrescription && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Doctor: Dr. {selectedPrescription.doctorId?.name || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Issued: {formatDate(selectedPrescription.dateIssued)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-sm">Valid until: {formatDate(selectedPrescription.validUntil)}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm">Patient: {formatPatientName(selectedPrescription.patientId?.name) || "Unknown"}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-md font-semibold">Prescribed Medicines</h3>
              {selectedPrescription.medicines.map((medicine, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        label="Medicine Name"
                        value={medicine.medicineName}
                        onChange={(e) => handleEditMedicineChange(index, "medicineName", e.target.value)}
                      />
                      <Input
                        label="Dosage"
                        value={medicine.dosage}
                        onChange={(e) => handleEditMedicineChange(index, "dosage", e.target.value)}
                      />
                      <Input
                        label="Quantity"
                        value={medicine.quantity}
                        onChange={(e) => handleEditMedicineChange(index, "quantity", e.target.value)}
                      />
                      <Input
                        label="Frequency"
                        value={medicine.frequency}
                        onChange={(e) => handleEditMedicineChange(index, "frequency", e.target.value)}
                      />
                      <Input
                        label="Instructions"
                        value={medicine.instructions}
                        onChange={(e) => handleEditMedicineChange(index, "instructions", e.target.value)}
                      />
                    </div>
                  ) : (
                    <>
                      <h4 className="font-medium mb-2">{medicine.medicineName}</h4>
                      <div className="space-y-1">
                        <p><span className="text-gray-500">Dosage:</span> {medicine.dosage}</p>
                        <p><span className="text-gray-500">Quantity:</span> {medicine.quantity}</p>
                        <p><span className="text-gray-500">Frequency:</span> {medicine.frequency}</p>
                        <p><span className="text-gray-500">Instructions:</span> {medicine.instructions}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-md font-semibold mb-2">Additional Notes</h3>
              {isEditing ? (
                <Input
                  label="Notes"
                  value={editedPrescription.notes}
                  onChange={(e) => setEditedPrescription({ ...editedPrescription, notes: e.target.value })}
                />
              ) : (
                <p className="text-sm bg-gray-50 p-3 rounded-lg">
                  {selectedPrescription.notes}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-8">
              {error}
            </div>
          ) : (
            <div className="w-full space-y-4">
              <div className="flex justify-between items-center mb-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Dr. {currentUser?.name || "Unknown"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Total Prescriptions: {prescriptions.length}
                  </p>
                </div>
                <Button
                  variant="primary"
                  className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                  onClick={handleViewAnalytics}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18"></path>
                    <path d="M18 17V9"></path>
                    <path d="M13 17V5"></path>
                    <path d="M8 17v-3"></path>
                  </svg>
                  View Analytics
                </Button>
              </div>

              <div className="mb-6">
                <div className="w-96">
                  <Input
                    type="text"
                    placeholder="Search by patient name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {filteredPrescriptions.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  {prescriptions.length === 0 ? "No prescriptions found" : "No prescriptions match your search"}
                </div>
              ) : (
                <div className="w-full">
                  <div className="bg-gray-50">
                    <div className="grid grid-cols-6 gap-4 px-6 py-3 text-sm font-medium text-gray-500">
                      <div>Date Issued</div>
                      <div>Valid Until</div>
                      <div>Patient Name</div>
                      <div>Status</div>
                      <div>Notes</div>
                      <div className="text-right"></div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {filteredPrescriptions.map((prescription) => (
                      <div
                        key={prescription._id}
                        className="grid grid-cols-6 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 text-blue-600 mr-2" />
                          {formatDate(prescription.dateIssued)}
                        </div>
                        <div className="flex items-center text-sm text-gray-900">
                          <Clock className="w-4 h-4 text-orange-600 mr-2" />
                          {formatDate(prescription.validUntil)}
                        </div>
                        <div className="flex items-center text-sm text-gray-900">
                          <User className="w-4 h-4 text-blue-600 mr-2" />
                          {formatPatientName(prescription.patientId?.name) || "Unknown Patient"}
                        </div>
                        <div>
                          {new Date(prescription.validUntil) > new Date() ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Expired
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {prescription.notes}
                        </div>
                        <div className="text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Eye className="w-4 h-4" />}
                            onClick={() => handleViewPrescription(prescription)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}