import { useState, useEffect } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useLinkedRecordContext } from "../context/LinkedRecordContext";
import TokenService from "../services/TokenService";
import Button from "../components/ui/button";
import Input from "../components/ui/input";
import Modal from "../components/ui/modal";
import { Calendar, User, Clock, Eye } from "lucide-react";
import jsPDF from 'jspdf';

// API URL constant
const API_URL = `${process.env.REACT_APP_API_URL}`;

export default function PatientPrescriptionPage() {
  const { currentUser } = useAuthContext();
  const { linkedRecordIds, loading: linkLoading, error: linkError } = useLinkedRecordContext();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [patientName, setPatientName] = useState("");

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  useEffect(() => {
    const fetchPrescriptionsForPatient = async (patientId) => {
      try {
        const token = TokenService.getAccessToken();
        const response = await fetch(`${API_URL}/prescriptions/patient-all/${patientId}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch prescriptions for patient ${patientId}`);
        }

        return await response.json();
      } catch (err) {
        console.error(`Error fetching prescriptions for patient ${patientId}:`, err);
        return [];
      }
    };

    const fetchData = async () => {
      try {
        if (currentUser) {
          setPatientName(currentUser.name || "");
        }

        if (linkedRecordIds && linkedRecordIds.length > 0) {
          setLoading(true);
          
          // Fetch prescriptions for all linked records in parallel
          const allPrescriptions = await Promise.all(
            linkedRecordIds.map(recordId => fetchPrescriptionsForPatient(recordId))
          );

          // Combine and sort all prescriptions by date, newest first
          const combinedPrescriptions = allPrescriptions
            .flat()
            .sort((a, b) => new Date(b.dateIssued) - new Date(a.dateIssued));
            
          setPrescriptions(combinedPrescriptions);
        } else {
          // No linked records available
          setPrescriptions([]);
        }
      } catch (err) {
        console.error("Error fetching prescriptions data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && linkedRecordIds) {
      fetchData();
    }
  }, [currentUser, linkedRecordIds]);

  const handleViewPrescription = (prescription) => {
    if (!prescription) {
      return;
    }
    setSelectedPrescription(prescription);
    setViewModalOpen(true);
  };

  const handleDownloadPrescription = (prescription) => {
    const doc = new jsPDF();
    
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
    doc.text(`Patient: ${prescription.patientId?.name || "Unknown"}`, 20, y);
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

    doc.save(`prescription-${prescription._id}.pdf`);
  };

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const doctorNameMatch = prescription.doctorId?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const medicineMatch = prescription.medicines?.some(med => 
      med.medicineName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return doctorNameMatch || medicineMatch || searchQuery === "";
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
            </div>

            <div className="space-y-4">
              <h3 className="text-md font-semibold">Prescribed Medicines</h3>
              {selectedPrescription.medicines.map((medicine, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <h4 className="font-medium mb-2">{medicine.medicineName}</h4>
                  <div className="space-y-1">
                    <p><span className="text-gray-500">Dosage:</span> {medicine.dosage}</p>
                    <p><span className="text-gray-500">Quantity:</span> {medicine.quantity}</p>
                    <p><span className="text-gray-500">Frequency:</span> {medicine.frequency}</p>
                    <p><span className="text-gray-500">Instructions:</span> {medicine.instructions}</p>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-md font-semibold mb-2">Additional Notes</h3>
              <p className="text-sm bg-gray-50 p-3 rounded-lg">
                {selectedPrescription.notes || "No additional notes"}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          {loading || linkLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : error || linkError ? (
            <div className="text-red-600 text-center py-8">
              {error || linkError}
            </div>
          ) : (
            <div className="w-full space-y-4">
              <div className="flex justify-between items-center mb-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Prescriptions for {patientName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Total Prescriptions: {prescriptions.length}
                    {linkedRecordIds && linkedRecordIds.length > 1 && ` (From ${linkedRecordIds.length} linked records)`}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <div className="w-96">
                  <Input
                    type="text"
                    placeholder="Search by doctor name or medicine..."
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
                    <div className="grid grid-cols-5 gap-4 px-6 py-3 text-sm font-medium text-gray-500">
                      <div>Date Issued</div>
                      <div>Valid Until</div>
                      <div>Doctor</div>
                      <div>Status</div>
                      <div className="text-right">Actions</div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {filteredPrescriptions.map((prescription) => (
                      <div
                        key={prescription._id}
                        className="grid grid-cols-5 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
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
                          Dr. {prescription.doctorId?.name || "Unknown"}
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