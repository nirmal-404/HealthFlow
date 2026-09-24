const Patient = require('../models/Patient');
const User = require('../models/User');

exports.getPatientByNIC = async (req, res) => {
  try {
    const requestedNic = req.params.nic;
    const requestingUser = req.user;

    const patient = await Patient.findOne({ nic: requestedNic });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const roleName = requestingUser?.activeRole?.name;
    const userId = requestingUser?.id?.toString();

    // If requesting user is a patient, enforce strict ownership
    if (roleName === 'sys_patient') {
      const user = await User.findById(requestingUser.id);
      const isOwner =
        (user?.nic && user.nic === requestedNic) ||
        (user?.email && patient.email && user.email.toLowerCase() === patient.email.toLowerCase());

      if (!isOwner) {
        return res.status(403).json({
          message: 'Access Denied: You are not authorized to view another patient\'s details.',
        });
      }
    }

    res.json(patient);
  } catch (error) {
    console.error('[patientController] Error in getPatientByNIC:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAgeGenderDistribution = async (req, res) => {
  try {
    const patients = await Patient.find({ doctor: req.user.id }).select('dateOfBirth gender');
    
    const ageGenderData = {
      male: { '0-18': 0, '19-30': 0, '31-50': 0, '51+': 0 },
      female: { '0-18': 0, '19-30': 0, '31-50': 0, '51+': 0 },
    };

    if (!patients || patients.length === 0) {
      return res.json(ageGenderData);
    }

    const currentYear = new Date().getFullYear();

    patients.forEach((patient) => {
      const birthDate = new Date(patient.dateOfBirth);
      if (isNaN(birthDate)) {
        return; // Skip invalid dates
      }
      const birthYear = birthDate.getFullYear();
      const age = currentYear - birthYear;
      const gender = patient.gender ? patient.gender.toLowerCase() : null;

      let ageGroup;
      if (age <= 18) ageGroup = '0-18';
      else if (age <= 30) ageGroup = '19-30';
      else if (age <= 50) ageGroup = '31-50';
      else ageGroup = '51+';

      if (gender === 'male' || gender === 'female') {
        ageGenderData[gender][ageGroup]++;
      }
    });

    res.json(ageGenderData);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server error',
      error: error.message,
      data: { male: { '0-18': 0, '19-30': 0, '31-50': 0, '51+': 0 }, female: { '0-18': 0, '19-30': 0, '31-50': 0, '51+': 0 } },
    });
  }
};