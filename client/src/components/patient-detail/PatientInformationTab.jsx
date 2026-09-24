import { useOutletContext } from "react-router-dom";
import { Edit, Trash2, Plus, ArrowRight, Check, Circle } from "lucide-react";
import Card from "../ui/card";
import { useState, useEffect } from "react";

export default function PatientInformationTab() {
  const { patient, isEditing, setIsEditing, formData, setFormData, handleSubmit } = useOutletContext();
  // Create a local draft state for editing that doesn't affect the parent state until saved
  const [draftData, setDraftData] = useState({...formData});

  // Update the draft data when formData changes (e.g., when entering edit mode)
  useEffect(() => {
    setDraftData({...formData});
  }, [formData]);

  // Debug log to check what formData we have on mount and when it changes
  useEffect(() => {
    console.log("formData updated:", formData);
  }, [formData]);

  const handleMedicalInfoChange = (e, section = null, index = null) => {
    const { name, value } = e.target;

    if (section && index !== null) {
      // Handle nested array fields
      setDraftData((prev) => ({
        ...prev,
        [section]: prev[section].map((item, i) =>
          i === index ? { ...item, [name]: value } : item
        ),
      }));
    } else if (section) {
      // Handle nested object fields
      setDraftData((prev) => ({
        ...prev,
        [section]: { ...prev[section], [name]: value },
      }));
    } else if (name.includes(".")) {
      // Handle dot notation for nested fields
      const [parent, child] = name.split(".");
      setDraftData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      // Handle top-level fields
      setDraftData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Function to handle removing items - this is key for our delete functionality
  const handleRemoveItem = (section, index) => {
    console.log(`Removing item ${index} from ${section}`);
    
    setDraftData((prev) => {
      // Create a new array without the item at the specified index
      const updatedSection = prev[section].filter((_, i) => i !== index);
      console.log(`Section ${section} after removal:`, updatedSection);
      
      return {
        ...prev,
        [section]: updatedSection
      };
    });
  };

  // Modified save function with client-side validation to ensure data is passed correctly to parent
  const handleSaveChanges = (e) => {
    e.preventDefault();
    
    // Create a deep clone of the draft data to ensure no references are shared
    const finalDataToSave = JSON.parse(JSON.stringify(draftData));
    
    // Client-side validation: Clean empty array items before submitting
    const cleanEmptyArrayItems = (data) => {
      const arrayFields = [
        'allergies', 
        'pastMedicalHistory', 
        'regularMedications', 
        'pastSurgicalHistory',
        'immunizations',
        'behavioralRiskFactors', 
        'healthRiskAssessment'
      ];
      
      arrayFields.forEach(field => {
        if (Array.isArray(data[field])) {
          // Filter out empty objects based on validation criteria
          data[field] = data[field].filter(item => {
            if (!item || typeof item !== 'object' || Object.keys(item).length === 0) {
              return false;
            }
            
            // Check if any field has a value worth keeping
            const hasValues = Object.values(item).some(
              value => value !== null && value !== undefined && value !== ""
            );
            return hasValues;
          });
        }
      });
      
      return data;
    };
    
    // Clean the data before saving
    const cleanedData = cleanEmptyArrayItems(finalDataToSave);
    console.log("CLEAN DATA TO SAVE:", cleanedData);
    
    // Update the parent's formData state with our cleaned changes
    setFormData(cleanedData);
    
    // Call the parent's handleSubmit with the event and the cleaned data
    handleSubmit(e, cleanedData);
  };

  // Update the form input styles
  const inputClassName = "w-full p-2.5 rounded-lg border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200";

  // Update the renderSection function with new list styling
  const renderSection = (title, items, renderItem, sectionName) => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {isEditing && (
          <button
            type="button"
            onClick={() => {
              setDraftData((prev) => ({
                ...prev,
                [sectionName]: [...(prev[sectionName] || []), {}],
              }));
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-4">
          {draftData[sectionName]?.map((item, index) => (
            <div key={`${sectionName}-${index}`} className="relative pl-6">
              <Circle className="absolute left-0 top-2 w-3 h-3 text-blue-600" />
              <button
                type="button"
                onClick={() => handleRemoveItem(sectionName, index)}
                className="absolute right-0 top-2 p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors duration-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="pr-12">
                {renderItem(item, index, true)}
              </div>
            </div>
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="pl-6 relative py-2 hover:bg-gray-50 rounded-lg transition-colors duration-200">
              <ArrowRight className="absolute left-0 top-2.5 w-4 h-4 text-blue-600" />
              {renderItem(item, index, false)}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic pl-6">No {title.toLowerCase()} recorded</p>
      )}
    </div>
  );

  // Update the main container and action buttons
  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex justify-between items-center pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Medical Information</h2>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            ${isEditing 
              ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            } transition-colors duration-200`}
        >
          <Edit className="w-4 h-4" />
          {isEditing ? "Cancel Edit" : "Edit"}
        </button>
      </div>
      
      {isEditing ? (
        <form onSubmit={handleSaveChanges} className="space-y-6 pb-24 relative">
          {/* Allergies */}
          {renderSection(
            "Allergies",
            patient.allergies,
            (allergy, index, isEditing) => (
              <div key={index}>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="allergenName"
                      value={allergy.allergenName || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "allergies", index)}
                      placeholder="Allergen Name"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="manifestation"
                      value={allergy.manifestation || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "allergies", index)}
                      placeholder="Manifestation"
                      className={inputClassName}
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{allergy.allergenName}</p>
                    <p className="text-sm text-gray-600">{allergy.manifestation}</p>
                  </>
                )}
              </div>
            ),
            "allergies"
          )}

          {/* Past Medical History */}
          {renderSection(
            "Past Medical History",
            patient.pastMedicalHistory,
            (condition, index, isEditing) => (
              <div key={index}>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="condition"
                      value={condition.condition || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "pastMedicalHistory", index)}
                      placeholder="Condition"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="onset"
                      value={condition.onset || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "pastMedicalHistory", index)}
                      placeholder="Onset"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="clinicalStatus"
                      value={condition.clinicalStatus || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "pastMedicalHistory", index)}
                      placeholder="Clinical Status"
                      className={inputClassName}
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{condition.condition}</p>
                    <div className="text-sm text-gray-600">
                      <p>Onset: {condition.onset}</p>
                      <p>Status: {condition.clinicalStatus}</p>
                    </div>
                  </>
                )}
              </div>
            ),
            "pastMedicalHistory"
          )}

          {/* Regular Medications */}
          {renderSection(
            "Regular Medications",
            patient.regularMedications,
            (medication, index, isEditing) => (
              <div key={index}>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="medicationName"
                      value={medication.medicationName || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "regularMedications", index)}
                      placeholder="Medication Name"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="form"
                      value={medication.form || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "regularMedications", index)}
                      placeholder="Form"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="dosage"
                      value={medication.dosage || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "regularMedications", index)}
                      placeholder="Dosage"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="route"
                      value={medication.route || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "regularMedications", index)}
                      placeholder="Route"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="status"
                      value={medication.status || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "regularMedications", index)}
                      placeholder="Status"
                      className={inputClassName}
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{medication.medicationName}</p>
                    <div className="text-sm text-gray-600">
                      <p>Form: {medication.form}</p>
                      <p>Dosage: {medication.dosage}</p>
                      <p>Route: {medication.route}</p>
                      <p>Status: {medication.status}</p>
                    </div>
                  </>
                )}
              </div>
            ),
            "regularMedications"
          )}

          {/* Past Surgical History */}
          {renderSection(
            "Past Surgical History",
            patient.pastSurgicalHistory,
            (surgery, index, isEditing) => (
              <div key={index}>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="procedureName"
                      value={surgery.procedureName || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "pastSurgicalHistory", index)}
                      placeholder="Procedure Name"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="date"
                      value={surgery.date || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "pastSurgicalHistory", index)}
                      placeholder="Date"
                      className={inputClassName}
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{surgery.procedureName}</p>
                    <p className="text-sm text-gray-600">Date: {surgery.date}</p>
                  </>
                )}
              </div>
            ),
            "pastSurgicalHistory"
          )}

          {/* Immunizations */}
          {renderSection(
            "Immunizations",
            patient.immunizations,
            (vaccine, index, isEditing) => (
              <div key={index}>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="vaccineName"
                      value={vaccine.vaccineName || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "immunizations", index)}
                      placeholder="Vaccine Name"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="date"
                      value={vaccine.date || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "immunizations", index)}
                      placeholder="Date"
                      className={inputClassName}
                    />
                  </div>
                ): (
                  <>
                    <p className="font-medium">{vaccine.vaccineName}</p>
                    <p className="text-sm text-gray-600">Date: {vaccine.date}</p>
                  </>
                )}
              </div>
            ),
            "immunizations"
          )}

          {/* Behavioral Risk Factors */}
          {renderSection(
            "Behavioral Risk Factors",
            patient.behavioralRiskFactors,
            (risk, index, isEditing) => (
              <div key={index}>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="riskFactorName"
                      value={risk.riskFactorName || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "behavioralRiskFactors", index)}
                      placeholder="Risk Factor Name"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="status"
                      value={risk.status || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "behavioralRiskFactors", index)}
                      placeholder="Status"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="duration"
                      value={risk.duration || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "behavioralRiskFactors", index)}
                      placeholder="Duration"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="statusRecordedDate"
                      value={risk.statusRecordedDate || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "behavioralRiskFactors", index)}
                      placeholder="Status Recorded Date"
                      className={inputClassName}
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{risk.riskFactorName}</p>
                    <div className="text-sm text-gray-600">
                      <p>Status: {risk.status}</p>
                      <p>Duration: {risk.duration}</p>
                      <p>Status Recorded: {risk.statusRecordedDate}</p>
                    </div>
                  </>
                )}
              </div>
            ),
            "behavioralRiskFactors"
          )}

          {/* Health Risk Assessment */}
          {renderSection(
            "Health Risk Assessment",
            patient.healthRiskAssessment,
            (assessment, index, isEditing) => (
              <div key={index}>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="assessmentType"
                      value={assessment.assessmentType || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "healthRiskAssessment", index)}
                      placeholder="Assessment Type"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="outcome"
                      value={assessment.outcome || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "healthRiskAssessment", index)}
                      placeholder="Outcome"
                      className={inputClassName}
                    />
                    <input
                      type="text"
                      name="assessmentDate"
                      value={assessment.assessmentDate || ""}
                      onChange={(e) => handleMedicalInfoChange(e, "healthRiskAssessment", index)}
                      placeholder="Assessment Date"
                      className={inputClassName}
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{assessment.assessmentType}</p>
                    <div className="text-sm text-gray-600">
                      <p>Outcome: {assessment.outcome}</p>
                      <p>Assessment Date: {assessment.assessmentDate}</p>
                    </div>
                  </>
                )}
              </div>
            ),
            "healthRiskAssessment"
          )}

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
            <div className="max-w-6xl mx-auto flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraftData(formData); // Reset draft data to original
                  setIsEditing(false);
                }}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      ) : (
        <>
          {/* Allergies */}
          {renderSection(
            "Allergies",
            patient.allergies,
            (allergy, index) => (
              <div>
                <p className="font-medium">{allergy.allergenName}</p>
                <p className="text-sm text-gray-600">{allergy.manifestation}</p>
              </div>
            ),
            "allergies"
          )}

          {/* Past Medical History */}
          {renderSection(
            "Past Medical History",
            patient.pastMedicalHistory,
            (condition, index) => (
              <div>
                <p className="font-medium">{condition.condition}</p>
                <div className="text-sm text-gray-600">
                  <p>Onset: {condition.onset}</p>
                  <p>Status: {condition.clinicalStatus}</p>
                </div>
              </div>
            ),
            "pastMedicalHistory"
          )}

          {/* Regular Medications */}
          {renderSection(
            "Regular Medications",
            patient.regularMedications,
            (medication, index) => (
              <div>
                <p className="font-medium">{medication.medicationName}</p>
                <div className="text-sm text-gray-600">
                  <p>Form: {medication.form}</p>
                  <p>Dosage: {medication.dosage}</p>
                  <p>Route: {medication.route}</p>
                  <p>Status: {medication.status}</p>
                </div>
              </div>
            ),
            "regularMedications"
          )}

          {/* Past Surgical History */}
          {renderSection(
            "Past Surgical History",
            patient.pastSurgicalHistory,
            (surgery, index) => (
              <div>
                <p className="font-medium">{surgery.procedureName}</p>
                <p className="text-sm text-gray-600">Date: {surgery.date}</p>
              </div>
            ),
            "pastSurgicalHistory"
          )}

          {/* Immunizations */}
          {renderSection(
            "Immunizations",
            patient.immunizations,
            (vaccine, index) => (
              <div>
                <p className="font-medium">{vaccine.vaccineName}</p>
                <p className="text-sm text-gray-600">Date: {vaccine.date}</p>
              </div>
            ),
            "immunizations"
          )}

          {/* Behavioral Risk Factors */}
          {renderSection(
            "Behavioral Risk Factors",
            patient.behavioralRiskFactors,
            (risk, index) => (
              <div>
                <p className="font-medium">{risk.riskFactorName}</p>
                <div className="text-sm text-gray-600">
                  <p>Status: {risk.status}</p>
                  <p>Duration: {risk.duration}</p>
                  <p>Status Recorded: {risk.statusRecordedDate}</p>
                </div>
              </div>
            ),
            "behavioralRiskFactors"
          )}

          {/* Health Risk Assessment */}
          {renderSection(
            "Health Risk Assessment",
            patient.healthRiskAssessment,
            (assessment, index) => (
              <div>
                <p className="font-medium">{assessment.assessmentType}</p>
                <div className="text-sm text-gray-600">
                  <p>Outcome: {assessment.outcome}</p>
                  <p>Assessment Date: {assessment.assessmentDate}</p>
                </div>
              </div>
            ),
            "healthRiskAssessment"
          )}
        </>
      )}
    </div>
  );
}