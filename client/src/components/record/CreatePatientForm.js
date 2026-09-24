import { useState, useEffect } from "react";
import Button from "../ui/button";
import Input from "../ui/input";
import Card from "../ui/card";
import { PlusCircle, MinusCircle } from "lucide-react";
import { useRecordContext } from "../../context/RecordContext";
import { useHoverPanel } from "../../context/HoverPanelContext";

const PatientForm = ({ patient, shouldReset }) => {
  const { createRecord, updateRecord } = useRecordContext();
  const { closePanel } = useHoverPanel();
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const canCreatePatient = permissions.includes("record:create:own");

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const getInitialFormData = () =>
    patient || {
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
    };

  const [formData, setFormData] = useState(getInitialFormData());

  useEffect(() => {
    if (shouldReset) {
      setFormData(getInitialFormData());
    }
  }, [shouldReset]);

  const handleChange = (e, section = null, index = null) => {
    const { name, value } = e.target;

    if (section && index !== null) {
      // Handle nested array fields
      setFormData((prev) => ({
        ...prev,
        [section]: prev[section].map((item, i) =>
          i === index ? { ...item, [name]: value } : item
        ),
      }));
    } else if (section) {
      // Handle nested object fields
      setFormData((prev) => ({
        ...prev,
        [section]: { ...prev[section], [name]: value },
      }));
    } else {
      // Handle top-level fields
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
      // Step 1: Submit the form
      if (patient) {
        await updateRecord(patient._id, formData);
      } else {
        await createRecord(formData);
      }

      // Close panel and trigger any success callback if provided
      closePanel(true);
    } catch (error) {
      console.error("Error creating patient record:", error);
      setError("Failed to create patient record. Please try again.");
      setIsSubmitting(false);
    }
  };

  // if (!canCreatePatient) {
  //   return (
  //     <div className="patient-form__auth-message patient-form__auth-message--warning">
  //       You do not have permission to create patient records.
  //     </div>
  //   );
  // }

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
    const defaultStructures = {
      allergies: { allergenName: "", manifestation: "" },
      pastMedicalHistory: { condition: "", onset: "", clinicalStatus: "" },
      regularMedications: {
        medicationName: "",
        form: "",
        dosage: "",
        route: "",
        status: "",
      },
      pastSurgicalHistory: { procedureName: "", date: "" },
      immunizations: { vaccineName: "", date: "" },
      behavioralRiskFactors: {
        riskFactorName: "",
        status: "",
        duration: "",
        statusRecordedDate: "",
      },
      healthRiskAssessment: {
        assessmentType: "",
        outcome: "",
        assessmentDate: "",
      },
    };
    return defaultStructures[fieldName];
  };

  const formatFieldLabel = (field) => {
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Card title="Create Patient Record">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Info and Contact Info */}
          {step === 1 && (
            <>
              <section>
                <h3 className="text-lg font-semibold mb-4">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    label="First Name"
                    name="firstName"
                    value={formData.name.firstName}
                    onChange={(e) => handleChange(e, "name")}
                    required
                  />
                  <Input
                    label="Last Name"
                    name="lastName"
                    value={formData.name.lastName}
                    onChange={(e) => handleChange(e, "name")}
                    required
                  />
                  <Input
                    label="Middle Names"
                    name="middleNames"
                    value={formData.name.middleNames.join(", ")}
                    onChange={(e) =>
                      handleChange(
                        {
                          target: {
                            name: "middleNames",
                            value: e.target.value
                              .split(",")
                              .map((name) => name.trim()),
                          },
                        },
                        "name"
                      )
                    }
                    placeholder="Comma-separated"
                  />
                  <Input
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <Input
                    label="National ID"
                    name="nic"
                    value={formData.nic}
                    onChange={handleChange}
                  />
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-4">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-4">Passport Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Passport Number"
                    name="number"
                    value={formData.passportDetails.number}
                    onChange={(e) => handleChange(e, "passportDetails")}
                  />
                  <Input
                    label="Issued Country"
                    name="issuedCountry"
                    value={formData.passportDetails.issuedCountry}
                    onChange={(e) => handleChange(e, "passportDetails")}
                  />
                </div>
              </section>
            </>
          )}

          {/* Allergies & Medical History */}
          {step === 2 && (
            <>
              <section>
                <h3 className="text-lg font-semibold mb-4">Allergies</h3>
                {formData.allergies.map((allergy, index) => (
                  <div key={index} className="space-y-2 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Allergen Name"
                        name="allergenName"
                        value={allergy.allergenName}
                        onChange={(e) => handleChange(e, "allergies", index)}
                      />
                      <Input
                        label="Manifestation"
                        name="manifestation"
                        value={allergy.manifestation}
                        onChange={(e) => handleChange(e, "allergies", index)}
                      />
                    </div>
                    {index > 0 && (
                      <Button
                        variant="outline"
                        type="button"
                        icon={<MinusCircle size={16} />}
                        onClick={() => removeArrayField("allergies", index)}
                      >
                        Remove Allergy
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="link"
                  icon={<PlusCircle size={16} />}
                  onClick={() => addArrayField("allergies")}
                >
                  Add Allergy
                </Button>
              </section>

              {[
                { name: "pastMedicalHistory", title: "Past Medical History" },
                { name: "regularMedications", title: "Regular Medications" },
                { name: "pastSurgicalHistory", title: "Past Surgical History" },
              ].map(({ name, title }) => (
                <section key={name}>
                  <h3 className="text-lg font-semibold mb-4">{title}</h3>
                  {formData[name].map((item, index) => (
                    <div key={index} className="space-y-2 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(item).map(([field, value]) => (
                          <Input
                            key={field}
                            label={formatFieldLabel(field)}
                            name={field}
                            value={value}
                            onChange={(e) => handleChange(e, name, index)}
                            type={field.includes("date") ? "date" : "text"}
                          />
                        ))}
                      </div>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          icon={<MinusCircle size={16} />}
                          onClick={() => removeArrayField(name, index)}
                        >
                          Remove {title.replace(/s$/, "")}
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="link"
                    icon={<PlusCircle size={16} />}
                    onClick={() => addArrayField(name)}
                  >
                    Add {title.replace(/s$/, "")}
                  </Button>
                </section>
              ))}
            </>
          )}

          {/* Immunizations & Risk Factors */}
          {step === 3 && (
            <>
              <section>
                <h3 className="text-lg font-semibold mb-4">Immunizations</h3>
                {formData.immunizations.map((item, index) => (
                  <div key={index} className="space-y-2 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(item).map(([field, value]) => (
                        <Input
                          key={field}
                          label={formatFieldLabel(field)}
                          name={field}
                          value={value}
                          onChange={(e) =>
                            handleChange(e, "immunizations", index)
                          }
                          type={field.includes("date") ? "date" : "text"}
                        />
                      ))}
                    </div>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        icon={<MinusCircle size={16} />}
                        onClick={() => removeArrayField("immunizations", index)}
                      >
                        Remove Immunization
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="link"
                  icon={<PlusCircle size={16} />}
                  onClick={() => addArrayField("immunizations")}
                >
                  Add Immunization
                </Button>
              </section>

              {[
                {
                  name: "behavioralRiskFactors",
                  title: "Behavioral Risk Factors",
                },
                {
                  name: "healthRiskAssessment",
                  title: "Health Risk Assessment",
                },
              ].map(({ name, title }) => (
                <section key={name}>
                  <h3 className="text-lg font-semibold mb-4">{title}</h3>
                  {formData[name].map((item, index) => (
                    <div key={index} className="space-y-2 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(item).map(([field, value]) => (
                          <Input
                            key={field}
                            label={formatFieldLabel(field)}
                            name={field}
                            value={value}
                            onChange={(e) => handleChange(e, name, index)}
                            type={field.includes("date") ? "date" : "text"}
                          />
                        ))}
                      </div>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          icon={<MinusCircle size={16} />}
                          onClick={() => removeArrayField(name, index)}
                        >
                          Remove {title.replace(/s$/, "")}
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="link"
                    icon={<PlusCircle size={16} />}
                    onClick={() => addArrayField(name)}
                  >
                    Add {title.replace(/s$/, "")}
                  </Button>
                </section>
              ))}
            </>
          )}

          {error && (
            <div className="text-red-600 text-sm font-medium">{error}</div>
          )}

          <div className="flex justify-end space-x-4 pt-4">
            {step > 1 && (
              <Button type="button" variant="secondary" onClick={prevStep}>
                Back
              </Button>
            )}
            {step < 3 && (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            )}
            {step === 3 && (
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Patient Record"}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default PatientForm;
