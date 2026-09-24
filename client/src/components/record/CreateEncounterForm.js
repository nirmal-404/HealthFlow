import { useState, useEffect } from "react";
import Button from "../ui/button";
import Input from "../ui/input";
import Card from "../ui/card";
import { PlusCircle, MinusCircle } from "lucide-react";
import { useEncounterContext } from "../../context/EncounterContext";
import { useParams } from "react-router-dom";

const EncounterForm = ({ encounter, onSuccess, onCancel, shouldReset }) => {
  const { id: recordId } = useParams();
  const { createEncounter, updateEncounter } = useEncounterContext();
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextStep = () => setStep(2);
  const prevStep = () => setStep(1);

  const getInitialFormData = () => {
    if (encounter) {
      return {
        ...encounter,
        dateTime: new Date(encounter.dateTime).toISOString().slice(0, 16),
      };
    }
    return {
      dateTime: new Date().toISOString().slice(0, 16), // Auto-set date & time to current time
      reasonForEncounter: "",
      diagnosis: "",
      status: "Pending", // Add default status
      prescription: [],
      testsOrdered: [
        {
          testName: "",
          testDate: "",
          testResult: "",
          provider: "",
        },
      ],
      proceduresPerformed: [
        {
          procedureName: "",
          procedureDate: "",
          procedureOutcome: "",
        },
      ],
      followUpCarePlan: {
        category: "",
        description: "",
        followUpDate: "",
      },
      additionalNotes: "",
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

  useEffect(() => {
    if (shouldReset) {
      setFormData(getInitialFormData());
    }
  }, [shouldReset]);

  useEffect(() => {
    // Reset form when encounter prop changes
    if (encounter) {
      setFormData({
        ...encounter,
        dateTime: new Date(encounter.dateTime).toISOString().slice(0, 16),
      });
    }
  }, [encounter]);

  const handleChange = (e, section = null, index = null) => {
    const { name, value } = e.target;

    if (section && index !== null) {
      setFormData((prev) => ({
        ...prev,
        [section]: prev[section].map((item, i) =>
          i === index ? { ...item, [name]: value } : item
        ),
      }));
    } else if (section) {
      setFormData((prev) => ({
        ...prev,
        [section]: { ...prev[section], [name]: value },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      // Remove unnecessary fields from submission
      const { appointmentId, provider, ...submitData } = formData;

      if (encounter) {
        await updateEncounter(encounter._id, submitData);
      } else {
        await createEncounter(recordId, submitData);
      }

      if (onSuccess) {
        // Ensure onSuccess is called after the operation completes successfully
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting encounter record:", error);
      setError("Failed to submit encounter record. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addArrayField = (fieldName) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: [...prev[fieldName], getDefaultFieldStructure(fieldName)],
    }));
  };

  const removeArrayField = (fieldName, index) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName].filter((_, i) => i !== index),
    }));
  };

  const getDefaultFieldStructure = (fieldName) => {
    const defaults = {
      testsOrdered: {
        testName: "",
        testDate: "",
        testResult: "",
        provider: "",
      },
      proceduresPerformed: {
        procedureName: "",
        procedureDate: "",
        procedureOutcome: "",
      },
    };
    return defaults[fieldName];
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Card
        title={encounter ? "Edit Encounter Record" : "Create Encounter Record"}
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Basic Encounter Info */}
          {step === 1 && (
            <section>
              <h3 className="text-lg font-semibold mb-4">
                Basic Encounter Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Date & Time"
                  name="dateTime"
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Reason for Encounter"
                  name="reasonForEncounter"
                  value={formData.reasonForEncounter}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Diagnosis"
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleChange}
                />
                <Input
                  label="Status"
                  name="status"
                  value={formData.status || "Pending"}
                  onChange={handleChange}
                  select
                  options={[
                    { value: "Pending", label: "Pending" },
                    { value: "Scheduled", label: "Scheduled" },
                    { value: "Completed", label: "Completed" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4>Follow-Up Care Plan</h4>
                  <Input
                    label="Category"
                    name="category"
                    value={formData.followUpCarePlan.category}
                    onChange={(e) => handleChange(e, "followUpCarePlan")}
                  />
                  <Input
                    label="Description"
                    name="description"
                    value={formData.followUpCarePlan.description}
                    onChange={(e) => handleChange(e, "followUpCarePlan")}
                  />
                  <Input
                    label="Follow-Up Date"
                    name="followUpDate"
                    type="date"
                    value={formData.followUpCarePlan.followUpDate}
                    onChange={(e) => handleChange(e, "followUpCarePlan")}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Step 2: Encounter Details */}
          {step === 2 && (
            <section>
              <h3 className="text-lg font-semibold mb-4">Encounter Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4>Tests Ordered</h4>
                  {formData.testsOrdered.map((test, index) => (
                    <div key={index} className="space-y-4">
                      <Input
                        label="Test Name"
                        name="testName"
                        value={test.testName}
                        onChange={(e) => handleChange(e, "testsOrdered", index)}
                      />
                      <Input
                        label="Test Date"
                        name="testDate"
                        type="date"
                        value={test.testDate}
                        onChange={(e) => handleChange(e, "testsOrdered", index)}
                      />
                      <Input
                        label="Test Result"
                        name="testResult"
                        value={test.testResult}
                        onChange={(e) => handleChange(e, "testsOrdered", index)}
                      />
                      <div className="flex justify-between items-center">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            removeArrayField("testsOrdered", index)
                          }
                        >
                          <MinusCircle size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    onClick={() => addArrayField("testsOrdered")}
                  >
                    <PlusCircle size={16} />
                    Add Test
                  </Button>
                </div>

                <div>
                  <h4>Procedures Performed</h4>
                  {formData.proceduresPerformed.map((procedure, index) => (
                    <div key={index} className="space-y-4">
                      <Input
                        label="Procedure Name"
                        name="procedureName"
                        value={procedure.procedureName}
                        onChange={(e) =>
                          handleChange(e, "proceduresPerformed", index)
                        }
                      />
                      <Input
                        label="Procedure Date"
                        name="procedureDate"
                        type="date"
                        value={procedure.procedureDate}
                        onChange={(e) =>
                          handleChange(e, "proceduresPerformed", index)
                        }
                      />
                      <Input
                        label="Procedure Outcome"
                        name="procedureOutcome"
                        value={procedure.procedureOutcome}
                        onChange={(e) =>
                          handleChange(e, "proceduresPerformed", index)
                        }
                      />
                      <div className="flex justify-between items-center">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            removeArrayField("proceduresPerformed", index)
                          }
                        >
                          <MinusCircle size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    onClick={() => addArrayField("proceduresPerformed")}
                  >
                    <PlusCircle size={16} />
                    Add Procedure
                  </Button>
                </div>
              </div>

              <Input
                label="Additional Notes"
                name="additionalNotes"
                value={formData.additionalNotes}
                onChange={handleChange}
              />
            </section>
          )}

          {error && (
            <div className="text-red-600 text-sm font-medium">{error}</div>
          )}

          <div className="flex justify-between items-center pt-6">
            <div>
              {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
            <div className="flex space-x-4">
              {step === 2 && (
                <Button type="button" variant="secondary" onClick={prevStep}>
                  Back
                </Button>
              )}
              {step === 1 && (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              )}
              {step === 2 && (
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting
                    ? encounter
                      ? "Updating..."
                      : "Creating..."
                    : encounter
                    ? "Update Encounter"
                    : "Create Encounter"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EncounterForm;
