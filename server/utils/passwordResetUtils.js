const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Generate a random token for password reset
const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Configure email transport
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userId) => {
  console.log(
    "[passwordResetUtils] Preparing to send password reset email to:",
    email
  );

  // Create reset URL (frontend URL where user will reset password)
  const resetUrl = `${
    process.env.CLIENT_URL || "http://localhost:3000"
  }/reset-password?token=${resetToken}&userId=${userId}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "HealthFlow: Password Reset",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb;">HealthFlow</h2>
          <h3>Password Reset</h3>
        </div>
        <p>Hello,</p>
        <p>You've requested to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, you can ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      "[passwordResetUtils] Password reset email sent successfully to:",
      email
    );
    return true;
  } catch (error) {
    console.error(
      "[passwordResetUtils] Error sending password reset email:",
      error
    );
    throw error;
  }
};

module.exports = {
  generateResetToken,
  sendPasswordResetEmail,
};
