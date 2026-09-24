const PreRegisteredUser = require("../models/PreRegisteredUser");
const User = require("../models/User");

exports.preRegisterUser = async (req, res) => {
  const { email, roleId } = req.body;
  const doctorId = req.user.id;

  try {
    // Check if user already exists in the main system
    const existingUser = await User.findOne({ email });

    // Check if this doctor already pre-registered this email with this role
    const alreadyPreRegistered = await PreRegisteredUser.findOne({
      email,
      role: roleId,
      assignedBy: doctorId,
      isRegistered: false,
    });

    if (alreadyPreRegistered) {
      return res.status(400).json({
        message: "This email is already pre-registered with the selected role.",
      });
    }

    // Create a new pre-registration record
    const record = new PreRegisteredUser({
      email,
      role: roleId,
      assignedBy: doctorId,
      isRegistered: false,
      registeredUserId: existingUser ? existingUser._id : null,
    });
    await record.save();

    // Customize message based on whether the user already exists
    const message = existingUser
      ? "Role assignment created for existing user."
      : "User pre-registered successfully.";

    res.status(201).json({ message });
  } catch (error) {
    console.error("Pre-registration error:", error);
    res.status(500).json({
      message: "Server error during pre-registration.",
      error: error.message,
    });
  }
};

exports.getPreRegistrationsByDoctor = async (req, res) => {
  try {
    const doctorId = req.user.id;

    // Get all pre-registrations by this doctor
    const registrations = await PreRegisteredUser.find({
      assignedBy: doctorId,
    })
      .populate("role", "name")
      .populate("assignedBy", "name email")
      .populate("registeredUserId", "name email");

    // Format the response to match frontend expectations
    const formattedRegistrations = registrations.map((reg) => ({
      _id: reg._id,
      email: reg.email,
      role: {
        id: reg.role._id,
        name: reg.role.name,
      },
      assignedBy: reg.assignedBy,
      createdAt: reg.createdAt,
      isRegistered: reg.isRegistered,
      registeredUser: reg.registeredUserId,
    }));

    res.status(200).json(formattedRegistrations);
  } catch (error) {
    console.error("Error fetching pre-registrations:", error);
    res.status(500).json({
      message: "Server error fetching pre-registrations.",
      error: error.message,
    });
  }
};

exports.deletePreRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.id;

    const preReg = await PreRegisteredUser.findOne({
      _id: id,
      assignedBy: doctorId,
    });

    if (!preReg) {
      return res.status(404).json({ message: "Pre-registration not found" });
    }

    if (preReg.isRegistered) {
      // If user is registered, remove the role from their User document
      await User.updateOne(
        { _id: preReg.registeredUserId },
        { $pull: { roles: { role: preReg.role } } }
      );
    }

    // Delete the pre-registration record
    await PreRegisteredUser.deleteOne({ _id: id });

    res.status(200).json({ message: "Role assignment removed successfully" });
  } catch (error) {
    console.error("Error removing pre-registration:", error);
    res.status(500).json({
      message: "Server error removing pre-registration.",
      error: error.message,
    });
  }
};

exports.checkEmailPreRegistration = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Check if this email has any pre-registrations
    const preRegistrations = await PreRegisteredUser.find({
      email,
      isRegistered: false,
    });

    // Return whether the email has pre-registrations or not
    res.status(200).json({
      hasPreRegistration: preRegistrations.length > 0,
      count: preRegistrations.length,
    });
  } catch (error) {
    console.error("Check pre-registration error:", error);
    res.status(500).json({
      message: "Server error checking pre-registration status.",
      error: error.message,
    });
  }
};
