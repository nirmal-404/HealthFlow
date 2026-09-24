const nodemailer = require('nodemailer');

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const sendAppointmentConfirmation = async (appointmentData) => {
    const { email, firstName, lastName, time, doctorName, reason } = appointmentData;
    
    const appointmentDate = new Date(time);
    const formattedDate = appointmentDate.toLocaleDateString();
    const formattedTime = appointmentDate.toLocaleTimeString();

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Appointment Confirmation - HealthFlow',
        html: `
            <h2>Appointment Confirmation</h2>
            <p>Dear ${firstName} ${lastName},</p>
            <p>Your appointment has been successfully scheduled.</p>
            <h3>Appointment Details:</h3>
            <ul>
                <li><strong>Date:</strong> ${formattedDate}</li>
                <li><strong>Time:</strong> ${formattedTime}</li>
                <li><strong>Doctor:</strong> ${doctorName}</li>
                <li><strong>Reason for Visit:</strong> ${reason}</li>
            </ul>
            <p>Please arrive 10 minutes before your scheduled appointment time.</p>
            <p>If you need to reschedule or cancel your appointment, please contact us as soon as possible.</p>
            <br>
            <p>Best regards,</p>
            <p>HealthFlow Team</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        throw error;
    }
};

module.exports = {
    sendAppointmentConfirmation
};