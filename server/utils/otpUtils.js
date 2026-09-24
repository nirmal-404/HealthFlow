const nodemailer = require("nodemailer");

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Generate a random 6-digit OTP
const generateOTP = () => {
  console.log("[otpUtils] Generating new OTP");
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(
    "[otpUtils] OTP generated successfully (masked):",
    "*".repeat(otp.length)
  );
  return otp;
};

// Send OTP via email
const sendOTPEmail = async (email, otp) => {
  console.log(`[otpUtils] Preparing to send OTP email to: ${email}`);
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "HealthFlow Login Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">HealthFlow Verification Code</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #1f2937; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    };

    console.log(`[otpUtils] Attempting to send OTP email via nodemailer`);
    await transporter.sendMail(mailOptions);
    console.log("[otpUtils] OTP sent successfully to:", email);
    return true;
  } catch (error) {
    console.error("[otpUtils] Error sending OTP:", error.message);
    console.error("[otpUtils] Email configuration:", {
      service: "gmail",
      from: process.env.EMAIL_USER
        ? `${process.env.EMAIL_USER.substring(0, 3)}...`
        : undefined,
      to: email,
    });
    throw new Error("Failed to send verification code");
  }
};

// Verify OTP
const verifyOTP = (storedOTP, submittedOTP, expiryTime) => {
  console.log("[otpUtils] Verifying OTP:");
  console.log(`[otpUtils] - Stored OTP exists: ${!!storedOTP}`);
  console.log(`[otpUtils] - Submitted OTP exists: ${!!submittedOTP}`);
  console.log(`[otpUtils] - Expiry time exists: ${!!expiryTime}`);

  if (!storedOTP || !submittedOTP) {
    console.log("[otpUtils] OTP verification failed: Missing OTP");
    return false;
  }

  const now = new Date();
  const isExpired = now > expiryTime;
  console.log(
    `[otpUtils] Expiry check: Current time: ${now.toISOString()}, Expiry time: ${expiryTime.toISOString()}, Expired: ${isExpired}`
  );

  if (isExpired) {
    console.log("[otpUtils] OTP verification failed: OTP expired");
    return false;
  }

  const isMatch = storedOTP === submittedOTP;
  console.log(
    `[otpUtils] OTP match check: ${isMatch ? "Matched" : "Not matched"}`
  );
  return isMatch;
};

module.exports = {
  generateOTP,
  sendOTPEmail,
  verifyOTP,
};
