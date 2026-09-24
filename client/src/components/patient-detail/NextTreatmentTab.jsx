import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import TokenService from "../../services/TokenService";
import Card from "../ui/card";
import Button from "../ui/button";
import Input from "../ui/input";
import Modal from "../ui/modal";
import { Plus, Trash2, FileText, Calendar, User, Clock, Eye, Edit, Save, Bot } from "lucide-react";
import jsPDF from 'jspdf';

export default function NextTreatmentTab() {
  const { id: patientId } = useParams();
  const { currentUser } = useAuthContext();
  const doctorId = currentUser?.id;
  const API_URL = process.env.REACT_APP_API_URL || '';
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [medicines, setMedicines] = useState([
    { medicineName: "", dosage: "", quantity: "", frequency: "", instructions: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [patientName, setPatientName] = useState("");
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrescription, setEditedPrescription] = useState(null);
  const [showAiNotification, setShowAiNotification] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [editButtonsVisible, setEditButtonsVisible] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputStates, setInputStates] = useState([{ value: "", cursorPosition: 0 }]);
  const [patientData, setPatientData] = useState(null);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  useEffect(() => {
    if (!patientId || !doctorId) {
      setError("Missing patient or doctor information");
      setLoading(false);
    }
  }, [patientId, doctorId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = TokenService.getAccessToken();
        
        // First fetch patient data using the correct endpoint
        const patientResponse = await fetch(`${API_URL}/records/${patientId}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!patientResponse.ok) {
          throw new Error("Failed to fetch patient data");
        }

        const patientData = await patientResponse.json();
        if (patientData && patientData.record) {
          setPatientName(patientData.record.name?.firstName + " " + patientData.record.name?.lastName);
          setPatientData(patientData.record);
        }

        // Then fetch prescriptions
        const prescriptionResponse = await fetch(`${API_URL}/prescriptions/patient/${patientId}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!prescriptionResponse.ok) {
          throw new Error("Failed to fetch prescriptions");
        }

        const prescriptionData = await prescriptionResponse.json();
        setPrescriptions(prescriptionData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchData();
    }
  }, [patientId]);

  const fetchDrugSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const token = TokenService.getAccessToken();
      const response = await fetch(`${API_URL}/drugs/search?q=${encodeURIComponent(query)}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch drug suggestions");
      }

      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Error fetching drug suggestions:", err);
    }
  };

  const handleMedicineChange = (index, field, value) => {
    const updatedMedicines = [...medicines];
    updatedMedicines[index][field] = value;
    setMedicines(updatedMedicines);
  };

  const handleMedicineInputChange = async (index, field, value) => {
    if (field === "medicineName") {
      const cursorPos = document.activeElement.selectionStart;
      setInputStates(prev => {
        const newStates = [...prev];
        newStates[index] = { 
          value,
          cursorPosition: cursorPos
        };
        return newStates;
      });

      const currentWord = value.split(' ')[0];
      
      if (currentWord) {
        fetchDrugSuggestions(currentWord);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
    handleMedicineChange(index, field, value);
  };

  const handleSuggestionSelect = (index, suggestion) => {
    const currentInput = inputStates[index]?.value || "";
    const words = currentInput.split(' ');
    
    const newValue = [suggestion.name, ...words.slice(1)].join(' ');
    handleMedicineChange(index, "medicineName", newValue);
    setShowSuggestions(false);
  };

  const addMedicine = () => {
    setMedicines([
      ...medicines,
      { medicineName: "", dosage: "", quantity: "", frequency: "", instructions: "" },
    ]);
  };

  const removeMedicine = (index) => {
    const updatedMedicines = medicines.filter((_, i) => i !== index);
    setMedicines(updatedMedicines);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);


    if (!patientId || !doctorId) {
      setError("Missing patient or doctor information. Please try refreshing the page.");
      setIsSubmitting(false);
      return;
    }


    try {
      const token = TokenService.getAccessToken();
      console.log("patiid", patientId, "docid", doctorId)
      const response = await fetch(`${API_URL}/prescriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          doctorId,
          medicines: medicines.map(med => ({
            ...med,
            quantity: Number(med.quantity) || 0
          })),
          validUntil: new Date(validUntil).toISOString(),
          notes: notes || "No additional notes",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create prescription");
      }

      const updatedResponse = await fetch(`${API_URL}/prescriptions/patient/${patientId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setPrescriptions(updatedData);
      }

      setMedicines([{ medicineName: "", dosage: "", quantity: "", frequency: "", instructions: "" }]);
      setNotes("");
      setValidUntil("");
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message);
      console.error("Prescription creation error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditable = (prescription) => {
    if (!prescription?.dateIssued) {
      return false;
    }
    
    const creationTime = new Date(prescription.dateIssued).getTime();
    const currentTime = new Date().getTime();
    const oneHourInMilliseconds = 60 * 60 * 1000;
    const timeLeft = oneHourInMilliseconds - (currentTime - creationTime);
    
    return timeLeft > 0;
  };

  const handleViewPrescription = (prescription) => {
    if (!prescription?._id) {
      console.error("Invalid prescription data");
      return;
    }
    
    const canEdit = isEditable(prescription);
    
    setSelectedPrescription(prescription);
    setEditButtonsVisible(canEdit);
    setViewModalOpen(true);
  };

  const handleDeletePrescription = async (prescriptionToDelete) => {
    if (!prescriptionToDelete || !prescriptionToDelete._id) {
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

      setPrescriptions(prescriptions.filter(p => p._id !== prescriptionToDelete._id));
      setViewModalOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteClick = (prescription) => {
    if (!prescription) {
      return;
    }
    handleDeletePrescription(prescription);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedPrescription({
      ...selectedPrescription,
      validUntil: new Date(selectedPrescription.validUntil).toISOString().split('T')[0],
    });
  };

  const handleUpdatePrescription = async () => {
    setIsSubmitting(true);
    try {
      const token = TokenService.getAccessToken();
      if (!editedPrescription?._id) {
        throw new Error("Invalid prescription data");
      }
      const response = await fetch(`${API_URL}/prescriptions/${editedPrescription._id}`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: editedPrescription.patientId?._id || patientId,
          doctorId: editedPrescription.doctorId?._id || doctorId,
          medicines: editedPrescription.medicines || [],
          validUntil: new Date(editedPrescription.validUntil).toISOString(),
          notes: editedPrescription.notes || "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update prescription");
      }

      const updatedResponse = await fetch(`${API_URL}/prescriptions/patient/${patientId}`, {
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

  const generateAiAnalysis = async () => {
    try {
      setIsLoadingAi(true);
      setError(null);
      
      const currentMedicines = medicines.map(med => ({
        name: med.medicineName,
        dosage: med.dosage,
        frequency: med.frequency,
        instructions: med.instructions
      })).filter(med => med.name && med.name.trim() !== '');

      if (currentMedicines.length === 0) {
        setError("Please add at least one medicine to get AI analysis");
        return;
      }

      if (!patientData) {
        setError("Patient data not available. Please try refreshing the page.");
        return;
      }

      // Create the prompt for AI model using patient data
      const prompt = `As a medical AI assistant, please analyze if the prescribed medicines are suitable for this patient based on their medical history:

Current Prescribed Medicines:
${currentMedicines.map(med => 
  `- Medicine: ${med.name}
   Dosage: ${med.dosage}
   Frequency: ${med.frequency}
   Instructions: ${med.instructions || 'None'}`
).join('\n\n')}

Patient's Medical Information:

1. Known Allergies:
${patientData.allergies && patientData.allergies.length > 0 
  ? patientData.allergies.map(allergy => 
    `- Allergen: ${allergy.allergenName}
     Reaction: ${allergy.manifestation}`
  ).join('\n')
  : 'No known allergies'}

2. Current Regular Medications:
${patientData.regularMedications && patientData.regularMedications.length > 0
  ? patientData.regularMedications.map(med => 
    `- ${med.medicationName}
     Form: ${med.form}
     Dosage: ${med.dosage}
     Route: ${med.route}
     Status: ${med.status}`
  ).join('\n\n')
  : 'No regular medications'}

3. Past Medical History:
${patientData.pastMedicalHistory && patientData.pastMedicalHistory.length > 0
  ? patientData.pastMedicalHistory.map(history => 
    `- Condition: ${history.condition}
     Status: ${history.clinicalStatus}
     Onset: ${history.onset}`
  ).join('\n\n')
  : 'No past medical history recorded'}

4. Risk Factors:
${patientData.behavioralRiskFactors && patientData.behavioralRiskFactors.length > 0
  ? patientData.behavioralRiskFactors.map(risk => 
    `- Risk Factor: ${risk.riskFactorName}
     Status: ${risk.status}
     Duration: ${risk.duration}`
  ).join('\n\n')
  : 'No behavioral risk factors recorded'}

Please analyze and provide:
1. Are there any potential allergic reactions to the prescribed medicines?
2. Are there any contraindications with current medications?
3. Are there any concerns based on the patient's medical history?
4. What monitoring recommendations should be considered?
5. Are any dosage adjustments needed based on patient's conditions?`;

      const token = TokenService.getAccessToken();
      const response = await fetch(`${API_URL}/ai/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.response) {
        throw new Error('AI response is empty or invalid');
      }

      setAiAnalysis({
        response: data.response,
        medications: currentMedicines
      });
      setShowAiNotification(true);
    } catch (err) {
      console.error('Error details:', err);
      setError(`AI Analysis Error: ${err.message}. Please try again.`);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleDownloadPrescription = (prescription) => {
    if (!prescription?._id) {
      console.error("Invalid prescription data");
      return;
    }

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
    doc.text(`Patient: ${patientName || "Unknown"}`, 20, y);
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

    doc.setFont('helvetica', 'bold');
    doc.text('Additional Notes:', 20, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.text(prescription.notes || 'None', 20, y);
    y += lineHeight * 2;

    doc.line(20, y, 190, y);
    y += lineHeight;
    doc.setFontSize(9);
    doc.text('HealthFlow Medical Center', 105, y, { align: 'center' });
    y += lineHeight;
    doc.text('This is a computer generated prescription.', 105, y, { align: 'center' });

    // Save the PDF
    doc.save(`prescription-${prescription._id}.pdf`);
  };

  const prescriptionForm = (
    <div className="w-full space-y-6">
      <div className="flex justify-end mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 bg-blue-50 hover:bg-blue-100"
          title="AI Assistant"
          onClick={generateAiAnalysis}
          disabled={isLoadingAi}
        >
          {isLoadingAi ? (
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          ) : (
            <Bot className="w-5 h-5 text-blue-600" />
          )}
        </Button>
      </div>
      <div className="space-y-6">
        {medicines.map((medicine, index) => (
          <Card key={index} className="shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  {index + 1}
                </span>
                Medicine Details
              </h3>
              {medicines.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={() => removeMedicine(index)}
                >Remove
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Input
                  label="Medicine Name"
                  value={medicine.medicineName}
                  onChange={(e) => handleMedicineInputChange(index, "medicineName", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && showSuggestions && suggestions.length > 0) {
                      e.preventDefault();
                      handleSuggestionSelect(index, suggestions[0]);
                    }
                  }}
                  required
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white mt-1 border border-gray-300 rounded-md shadow-lg">
                    <ul className="max-h-60 overflow-auto py-1">
                      {suggestions.map((suggestion, i) => (
                        <li
                          key={i}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => handleSuggestionSelect(index, suggestion)}
                        >
                          {suggestion.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Input
                label="Dosage"
                value={medicine.dosage}
                onChange={(e) =>
                  handleMedicineChange(index, "dosage", e.target.value)
                }
                required
              />
              <Input
                label="Quantity"
                type="number"
                value={medicine.quantity}
                onChange={(e) =>
                  handleMedicineChange(index, "quantity", e.target.value)
                }
                required
              />
              <Input
                label="Frequency"
                value={medicine.frequency}
                onChange={(e) =>
                  handleMedicineChange(index, "frequency", e.target.value)
                }
                required
              />
              <div className="md:col-span-2">
                <Input
                  label="Special Instructions"
                  value={medicine.instructions}
                  onChange={(e) =>
                    handleMedicineChange(index, "instructions", e.target.value)
                  }
                  required
                />
              </div>
            </div>
          </Card>
        ))}

        <Button
          type="button"
          variant="secondary"
          className="w-full md:w-auto flex items-center justify-center gap-2 hover:bg-blue-50 text-blue-600"
          icon={<Plus className="w-4 h-4" />}
          onClick={addMedicine}
        >
          Add Another Medicine
        </Button>
      </div>

      <Card className="shadow-sm">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Prescription Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Valid Until"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            required
          />
          <Input
            label="Additional Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
          />
        </div>
      </Card>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-4 rounded-lg border border-red-100 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* AI Analysis Notification */}
      {showAiNotification && aiAnalysis && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => setShowAiNotification(false)}
          />
          <div className="fixed inset-0 z-[70] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto relative transform transition-all">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      AI Treatment Analysis
                    </h3>
                    <button 
                      onClick={() => setShowAiNotification(false)}
                      className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full p-1"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />

                      </svg>
                    </button>
                  </div>

                  <div className="prose prose-blue max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700">
                      {aiAnalysis.response}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Medications</h4>
                    <ul className="text-sm text-gray-600 space-y-2">
                      {aiAnalysis.medications.map((med, index) => (
                        <li key={index} className="flex flex-col gap-1">
                          <span className="font-medium">{med.name}</span>
                          <span className="text-gray-500">
                            Dosage: {med.dosage}, Frequency: {med.frequency}
                          </span>
                          {med.instructions && (
                            <span className="text-gray-500">
                              Instructions: {med.instructions}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Prescription"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Prescription"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          {prescriptionForm}
        </form>
      </Modal>

      <Modal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedPrescription(null);
          setIsEditing(false);
          setEditedPrescription(null);
        }}
        title="Prescription Details"
        size="lg"
        footer={
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    icon={<FileText className="w-4 h-4" />}
                    onClick={() => handleDownloadPrescription(selectedPrescription)}
                  >
                    Download PDF
                  </Button>
                  {editButtonsVisible && (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={() => handleDeleteClick(selectedPrescription)}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Edit className="w-4 h-4" />}
                        onClick={handleEditClick}
                      >
                        Edit
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Save className="w-4 h-4" />}
                  onClick={handleUpdatePrescription}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setViewModalOpen(false);
                setSelectedPrescription(null);
                setIsEditing(false);
                setEditedPrescription(null);
              }}
            >
              Close
            </Button>
          </div>
        }
      >
        {selectedPrescription && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Issued: {formatDate(selectedPrescription.dateIssued)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedPrescription.validUntil}
                    onChange={(e) => setEditedPrescription({
                      ...editedPrescription,
                      validUntil: e.target.value
                    })}
                  />
                ) : (
                  <span className="text-sm">Valid until: {formatDate(selectedPrescription.validUntil)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm">Doctor: {selectedPrescription.doctorId?.name || "Unknown"}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-md font-semibold">Prescribed Medicines</h3>
              {(isEditing ? editedPrescription : selectedPrescription).medicines.map((medicine, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                  {isEditing ? (
                    <div className="space-y-3">
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
                        type="number"
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
                  value={editedPrescription.notes}
                  onChange={(e) => setEditedPrescription({
                    ...editedPrescription,
                    notes: e.target.value
                  })}
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
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Prescriptions</h3>
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              Create Prescription
            </Button>
          </div>

          {prescriptions.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No prescriptions found
            </div>
          ) : (
            <div className="w-full">
              <div className="bg-gray-50">
                <div className="grid grid-cols-5 gap-4 px-6 py-3 text-sm font-medium text-gray-500">
                  <div>Date Issued</div>
                  <div>Valid Until</div>
                  <div>Status</div>
                  <div>Notes</div>
                  <div></div>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {prescriptions?.map((prescription) => prescription && (
                  <div
                    key={prescription._id}
                    className="grid grid-cols-5 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 text-blue-600 mr-2" />
                      {prescription?.dateIssued ? formatDate(prescription.dateIssued) : 'N/A'}
                    </div>
                    <div className="flex items-center text-sm text-gray-900">
                      <Clock className="w-4 h-4 text-orange-600 mr-2" />
                      {prescription?.validUntil ? formatDate(prescription.validUntil) : 'N/A'}
                    </div>
                    <div>
                      {prescription?.validUntil && new Date(prescription.validUntil) > new Date() ? (
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
                      {prescription?.notes || 'No notes'}
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
    </>
  );
}
