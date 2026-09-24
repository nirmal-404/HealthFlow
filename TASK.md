Doctor Appointment Booking System – Task Specification
1. Objective
To build a practical appointment booking and telemedicine system where:

Patients can book appointments with doctors based on real-time availability.

Doctors can manage their weekly schedule.

Virtual consultations are conducted through Agora video calls with meeting controls.

2. Functional Modules
2.1 Doctor Functionality
2.1.1 Add Weekly Availability
Doctors can upload weekly schedules by:

Selecting a future date.

Providing start time, end time, and appointment duration (e.g., 15 min).

The system will:

Automatically generate time slots between start and end time.

Store slots uniquely tied to the doctor and date.

2.1.2 Update Availability
Doctors may update availability for a specific date only if no slots are booked.

Upon allowed updates:

Regenerate the day’s time slots with new timing/duration.

2.1.3 Delete Availability
Doctors may delete their availability only if no slots on that date are booked.

On deletion:

All associated unbooked slots for the date will be removed.

2.1.4 Constraints for Doctors
Only future dates are selectable for availability management.

Start time must be before end time.

Appointment duration must fit within the time range.

Slot conflicts or overlaps must be avoided.

Doctors cannot modify slots once booked by a patient.

2.2 Patient Functionality
2.2.1 Search for Doctors
Patients can search doctors by:

Name

Specialization

Only doctors with upcoming available slots are shown.

2.2.2 Book Appointment Workflow
Patient selects a doctor.

Calendar highlights available dates only.

Patient selects a date.

Available slots are shown.

Patient selects a slot.

A popup form appears to collect:

First Name

Last Name

Phone Number

NIC (National ID)

Email

Reason for appointment

Patient completes payment.

Upon successful payment:

Appointment is confirmed.

Agora channel and token are generated and attached to the appointment.

2.2.3 Constraints for Patients
Patients cannot:

Book past dates.

Book already taken slots.

Proceed without selecting valid doctor and slot.

Slot is temporarily locked during payment to avoid race conditions.

If payment fails, the slot is released.

2.3 Telemedicine – Agora Video Integration
2.3.1 Video Setup
Use Agora.io to enable real-time video consultations.

When an appointment is confirmed:

Generate:

channelName: Unique for the appointment (e.g., appt_{appointmentId})

agoraToken: Temporary token using Agora RESTful API

Save both in the Appointment object.

2.3.2 Video Call Access
Doctor and patient can access the video call room via dashboard links when the appointment time arrives.

Only authorized users (linked patient or doctor) can access the call.

2.3.3 Meeting UI Components
Implement a video call UI using the Agora Web SDK with these buttons:

Mute/Unmute Microphone

Turn Video On/Off

End Call (Leave/Close Meeting)

Toggle Fullscreen

Connection Quality Indicator (optional)

Timer (optional)

Use a React component (or vanilla JavaScript) to implement this window, styled responsively.

2.3.4 Constraints and Logic
Token expiry must be handled.

Doctor/patient should only be able to join 5–10 minutes before the appointment time.

Appointment status should update to "completed" once the call ends or manually marked.

3. Appointment Data Model
ts
Copy
Edit
{
  doctorId: ObjectId,
  patientId: ObjectId,
  slotId: ObjectId,
  reason: String,
  firstName: String,
  lastName: String,
  phone: String,
  nic: String,
  email: String,
  status: String, // "pending", "confirmed", "cancelled", "completed"
  createdAt: Date,
  channelName: String,
  agoraToken: String
}
4. Practical Considerations
4.1 Slot Management
Ensure slots:

Are generated without overlaps.

Are not modified once booked.

Are unique by doctor, date, and time.

4.2 Calendar Behavior
Disable past dates globally.

Patient calendar should highlight only available days.

4.3 Timezone Handling
Store all timestamps in UTC.

Convert to user’s local time on the frontend.

4.4 Notifications (Optional)
Email or SMS confirmations.

Reminders for upcoming appointments.