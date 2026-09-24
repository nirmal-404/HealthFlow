# 🏥 HealthFlow Clinical Workflow Management System
> **A Clinical Workflow & Healthcare Management System for Local Doctors**

---

### 🔗 Original Repository
[![GitHub Repository](https://img.shields.io/badge/Original_Repository-chamika--11%2FHealth__Flow__Management__System-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/chamika-11/Health_Flow_Management_System)

⭐ **Original Project URL**: [https://github.com/chamika-11/Health_Flow_Management_System](https://github.com/chamika-11/Health_Flow_Management_System)

---
🩺 Full-Stack Healthcare Management Platform
A comprehensive web-based platform enabling CRUD operations for patient records, appointments, prescriptions, feedback, and medical documents.

🔑 Key Features:

💊 Prescription Management: Doctors can create, view, and manage prescriptions with real-time drug name suggestions from an integrated drug database.

🤖 AI Drug Safety System: AI checks patient medical history and provides real-time warnings to prevent risky drug interactions.

📁 Document Management: Patients can securely upload medical documents for doctor review.

📅 Online Appointment Booking: Patients book consultations with doctors, select time slots, and receive auto-generated meeting links.

📊 AI-Powered Feedback Reports: AI analyzes patient feedback and provides doctors with insightful trends.

💬 Doctor–Patient Chat System: Encrypted in-app messaging for secure post-visit communication.

🛡️ Role-Based Access Control: Ensures secure and restricted system access by user roles.

☁️ Cloud Storage: Secure, scalable storage for sensitive medical documents and records.

👨‍💻 My Contribution:

Developed the Prescription Management System

Built the AI-based drug warning module using patient history

Implemented the drug name suggestion system with an integrated drug database


## 🔒 Security Implementations & Vulnerability Fixes (4 Core Sections)

### Section 1: OAuth 2.0 Authentication & Role Management
- **Google OAuth 2.0 Passport.js Integration**: Implemented redirect flow (`/api/auth/google` to Google consent screen to `/api/auth/google/callback`) with JWT token creation and account connection UI.
- **Role & Admin Database Seeders**: Created automated seed scripts (`seedRoles.js` & `seedAdmin.js`) populating system roles (`sys_admin`, `sys_doctor`, `sys_patient`, `sys_staff`) and initial admin accounts, with on-the-fly role auto-creation fallbacks.

### Section 2: Broken Access Control & IDOR Prevention
- **Protected Patient NIC Endpoint**: Secured public `/api/patients/nic/:nic` route with `protect` middleware and strict ownership verification.
- **Appointment & Agora Video Token Security**: Fixed IDOR in `appointmentController.js` to prevent unauthorized viewing of appointment details and video call tokens (`403 Forbidden`).
- **Prescription Authorization**: Restricted prescription creation, updates, and deletions to authenticated doctors and admins.

### Section 3: Document Upload Security & Path Traversal Prevention
- **Document Route Authentication**: Applied `protect` authentication middleware across all document endpoints in `DocumentRoutes.js`.
- **Path Traversal Mitigation**: Sanitized Multer filename creation in `MulterConfig.js` using `path.basename` and character sanitization to prevent path traversal (`../../evil.pdf`).
- **Document IDOR Protection**: Implemented ownership authorization in `DocumentController.js` restricting document access, downloads, previews, and status updates exclusively to the document's assigned patient, doctor, or system staff.

### Section 4: Gemini AI Protection, Log Sanitization & System Hardening
- **AI Rate Limiting & Prompt Injection Protection**: Protected `/api/ai/prompt` with authentication, sliding-window rate limiting middleware (`aiRateLimiter.js`), prompt character caps (1000 chars), Gemini system instructions, safety thresholds, and regex filters against injection attacks.
- **Plaintext Password Removal**: Eliminated plaintext password storage in browser `localStorage` across login and authentication components.
- **Server Log Sanitization**: Redacted sensitive request body parameters (`password`, `token`, `otp`, `secret`) in Express logging middleware with `"[REDACTED]"`.
- **Helmet Headers & Package Audit**: Integrated Helmet security middleware for HTTP headers and ran package audit fixes across server and client projects.
