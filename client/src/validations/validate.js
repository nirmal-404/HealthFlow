export const validateDocForm = (formData, fieldName) => {
  console.log("Validating form data:", formData);
  console.log("Validating field:", fieldName);

  const {
    name,
    email,
    nic,
    mobile,
    password,
    confirmPassword,
    specialization,
    licenseNumber,
  } = formData;

  const errors = {};

  // Name validation
  if (!name?.trim()) errors.name = "Name is required.";
  if (name?.length < 2) errors.name = "Name must be at least 2 characters.";

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email?.trim()) errors.email = "Email is required.";
  if (email && !emailRegex.test(email))
    errors.email = "Please enter a valid email address.";

  // NIC validation
  if (nic && !/^\d{9}[VvXx]$|^\d{12}$/.test(nic))
    errors.nic = "Enter a valid NIC number.";

  // Mobile validation
  if (!mobile?.trim()) errors.mobile = "Mobile number is required.";
  if (mobile && !/^\d{10}$/.test(mobile))
    errors.mobile = "Mobile number must be exactly 10 digits.";

  // Password validation
  if (!password) errors.password = "Password is required.";
  if (password?.length < 8)
    errors.password = "Password must be at least 8 characters.";
  if (password && !/[A-Z]/.test(password))
    errors.password = "Password must contain at least one uppercase letter.";
  if (password && !/[a-z]/.test(password))
    errors.password = "Password must contain at least one lowercase letter.";
  if (password && !/[0-9]/.test(password))
    errors.password = "Password must contain at least one number.";
  if (password && !/[^A-Za-z0-9]/.test(password))
    errors.password = "Password must contain at least one special character.";

  // Confirm password validation
  if (!confirmPassword)
    errors.confirmPassword = "Please confirm your password.";
  if (password !== confirmPassword)
    errors.confirmPassword = "Passwords do not match.";

  // Specialization validation
  if (!specialization?.trim())
    errors.specialization = "Specialization is required.";

  // License number validation
  if (!licenseNumber?.trim())
    errors.licenseNumber = "License number is required.";

  // Return error for a specific field if fieldName is provided
  if (fieldName) {
    console.log(`Error for ${fieldName}:`, errors[fieldName] || null);
    return errors[fieldName] || null;
  }

  return errors;
};

export const validatePatientForm = (formData, fieldName) => {
  console.log("Validating form data:", formData);
  console.log("Validating field:", fieldName);

  const { name, email, nic, mobile, password, confirmPassword } = formData;

  const errors = {};

  // Name validation
  if (!name?.trim()) errors.name = "Name is required.";
  if (name?.length < 2) errors.name = "Name must be at least 2 characters.";

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email?.trim() && !nic?.trim())
    errors.email = "Either Email or NIC is required.";
  if (email && !emailRegex.test(email))
    errors.email = "Please enter a valid email address.";

  // NIC validation
  if (nic && !/^\d{9}[VvXx]$|^\d{12}$/.test(nic))
    errors.nic = "Enter a valid NIC number.";

  // Mobile validation
  if (!mobile?.trim()) errors.mobile = "Mobile number is required.";
  if (mobile && !/^\d{10}$/.test(mobile))
    errors.mobile = "Mobile number must be exactly 10 digits.";

  // Password validation
  if (!password) errors.password = "Password is required.";
  if (password?.length < 8)
    errors.password = "Password must be at least 8 characters.";
  if (password && !/[A-Z]/.test(password))
    errors.password = "Password must contain at least one uppercase letter.";
  if (password && !/[a-z]/.test(password))
    errors.password = "Password must contain at least one lowercase letter.";
  if (password && !/[0-9]/.test(password))
    errors.password = "Password must contain at least one number.";
  if (password && !/[^A-Za-z0-9]/.test(password))
    errors.password = "Password must contain at least one special character.";

  // Confirm password validation
  if (!confirmPassword)
    errors.confirmPassword = "Please confirm your password.";
  if (password !== confirmPassword)
    errors.confirmPassword = "Passwords do not match.";

  // Return error for a specific field if fieldName is provided
  if (fieldName) {
    console.log(`Error for ${fieldName}:`, errors[fieldName] || null);
    return errors[fieldName] || null;
  }

  return errors;
};

export const validateCreatePatientForm = (formData, fieldName) => {
  console.log("Validating form data:", formData);
  console.log("Validating field:", fieldName);

  const { email, nic, mobile } = formData;

  const errors = {};

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email?.trim() && !nic?.trim())
    errors.email = "Either Email or NIC is required.";
  if (email && !emailRegex.test(email))
    errors.email = "Please enter a valid email address.";

  // NIC validation
  if (nic && !/^\d{9}[VvXx]$|^\d{12}$/.test(nic))
    errors.nic = "Enter a valid NIC number.";

  // Mobile validation
  if (!mobile?.trim()) errors.mobile = "Mobile number is required.";
  if (mobile && !/^\d{10}$/.test(mobile))
    errors.mobile = "Mobile number must be exactly 10 digits.";

  return errors;
};
