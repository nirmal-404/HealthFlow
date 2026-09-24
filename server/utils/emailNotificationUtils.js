const nodemailer = require("nodemailer");

// Configure email transport
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE2 || "gmail",
  auth: {
    user: process.env.EMAIL_USER2,
    pass: process.env.EMAIL_PASSWORD2,
  },
});

/**
 * Send notification email for doctor registration approval
 * @param {string} email - Doctor's email address
 * @param {string} name - Doctor's name
 */
const sendDoctorApprovalEmail = async (email, name) => {
  console.log(
    "[emailNotificationUtils] Preparing to send approval notification to:",
    email
  );

  const loginUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/login`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "HealthFlow: Your Doctor Registration Has Been Approved",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb;">HealthFlow</h2>
          <h3>Registration Approved</h3>
        </div>
        <p>Hello ${name},</p>
        <p>We are pleased to inform you that your application to register as a doctor with HealthFlow has been <strong style="color: #16a34a;">approved</strong>.</p>
        <p>You can now log in to your account and start using our platform.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Your Account</a>
        </div>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      "[emailNotificationUtils] Doctor approval email sent successfully to:",
      email
    );
    return true;
  } catch (error) {
    console.error(
      "[emailNotificationUtils] Error sending doctor approval email:",
      error
    );
    throw error;
  }
};

/**
 * Send notification email for doctor registration rejection
 * @param {string} email - Doctor's email address
 * @param {string} name - Doctor's name
 */
const sendDoctorRejectionEmail = async (email, name) => {
  console.log(
    "[emailNotificationUtils] Preparing to send rejection notification to:",
    email
  );

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "HealthFlow: Important Information About Your Doctor Registration",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb;">HealthFlow</h2>
          <h3>Registration Update</h3>
        </div>
        <p>Hello ${name},</p>
        <p>Thank you for your application to register as a doctor with HealthFlow.</p>
        <p>After careful review, we regret to inform you that your application could not be approved at this time.</p>
        <div style="background-color: #fff8f8; border-left: 4px solid #ef4444; padding: 12px 20px; margin: 20px 0; border-radius: 0 5px 5px 0;">
          <p style="margin: 0; color: #7f1d1d;">
            If you believe this decision was made in error or you would like to provide additional information, please contact our administrative team at <a href="mailto:${process.env.EMAIL_USER}" style="color: #2563eb;">${process.env.EMAIL_USER}</a> with your registration details.
          </p>
        </div>
        <p>We're available to discuss any questions or concerns you might have regarding this decision.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply directly to this email; instead, use the contact information provided above.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      "[emailNotificationUtils] Doctor rejection email sent successfully to:",
      email
    );
    return true;
  } catch (error) {
    console.error(
      "[emailNotificationUtils] Error sending doctor rejection email:",
      error
    );
    throw error;
  }
};

module.exports = {
  sendDoctorApprovalEmail,
  sendDoctorRejectionEmail,
};
