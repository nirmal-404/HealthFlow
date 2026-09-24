import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthContext } from "./context/AuthContext";
import { RecordContextProvider } from "./context/RecordContext";
import { EncounterContextProvider } from "./context/EncounterContext";
import { HoverPanelProvider } from "./context/HoverPanelContext";
import { LinkedRecordProvider } from "./context/LinkedRecordContext";
import LoginPage from "./pages/login-page";
import Dashboard from "./pages/dashboard-page";
import DashboardWrapper from "./components/layout/dashboard-wrapper";
import ProtectedRoute from "./components/ProtectedRoute";
import DocumentList from "./pages/document-page";
import PrescriptionPage from "./pages/prescription-page";
import PrescriptionReport from "./pages/prescription-report";
import DoctorChatPage from "./pages/doctor-chat-page";
import RoleManagementPage from "./pages/role-management-page";
import PatientsPage from "./pages/patients-page";
import PatientDetailPage from "./pages/patient-detail-page";
import PatientInformationTab from "./components/patient-detail/PatientInformationTab";
import AppointmentHistoryTab from "./components/patient-detail/AppointmentHistoryTab";
import NextTreatmentTab from "./components/patient-detail/NextTreatmentTab";
import MedicalRecordTab from "./components/patient-detail/MedicalRecordTab";
import PatientDocumentList from "./components/patient-detail/DocumentList";
import DocumentViewer from './components/patient-detail/DocumentViewer';
import AppointmentsPage from "./pages/appointments-page";
import FeedbackStartPage from "./pages/feedback-start-page";
import FeedbackCreatePage from "./pages/feedback-create-page";
import FeedbackSummaryPage from "./pages/feedback-summary-page";
import FeedbackUpdatePage from "./pages/feedback-update-page";
import FeedbackDeletePage from "./pages/feedback-delete-page";
import DoctorFeedbackPage from "./pages/doctor-feedback-page";
import FeedbackReportPage from "./pages/feedback-report-page";
import PatientDocumentsPage from "./pages/patient-documents-page";
import PatientPrescriptionPage from "./pages/patient-prescription";
import FinancialReportPage from "./pages/finance-page";
import DoctorSearch from "./pages/doctor-search";
import PatientAppointmentsPage from "./pages/patient-appointments-page";
import PatientChatPage from "./pages/patient-chat-page";
import DoctorSchedule from './components/appointment-schedule/DoctorSchedule';
import TelemedicineMeeting from "./components/appointment-schedule/TelemedicineMeeting";
import RegisterPage from "./pages/register-page";
import PastEncounters from "./pages/past-encounters";
import AppointmentSuccessPage from "./pages/appointment-success";
import AppointmentCancelPage from "./pages/appointment-cancel";
import ResetPassword from "./pages/reset-password-page";
import AdminDashboard from "./pages/admin-dashboard";
import UserManagementPage from "./pages/user-management-page";
import UserDetailPage from "./pages/user-detail-page";
import DoctorDashboard from "./pages/dashboard-page";
import PatientDashboard from "./pages/patient-dashboard";
import TelemedicineMeet from "./components/appointment-schedule/telemedicinemeeting2";



function App() {

  const { currentUser, activeRole, loading } = useAuthContext();


  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <div>
      <Routes>

        {/* Redirect from root to login */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        <Route
            path="/register"
            element={
              currentUser ? <Navigate to="/account" /> : <RegisterPage />
            }
          />

        {/* Login Route */}
        <Route
          path="/login"
          element={currentUser ? <Navigate to="/account" /> : <LoginPage />}
        />

        {/* Replace forgot-password and reset-password routes */}
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Redirect old forgot-password path to login with flag */}
        <Route path="/forgot-password" element={<Navigate to="/login?showForgotPassword=true" />} />


        {/* Protected Routes */}
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <LinkedRecordProvider>
                <RecordContextProvider>
                  <EncounterContextProvider>
                    <HoverPanelProvider>
                      <DashboardWrapper />
                    </HoverPanelProvider>
                  </EncounterContextProvider>
                </RecordContextProvider>
              </LinkedRecordProvider>
            </ProtectedRoute>
          }
        >

          {/* Role-based dashboard routing */}
          <Route index element={
            activeRole?.name === 'sys_patient' ? (
              <Navigate to="patient-dashboard" replace />
            ) : activeRole?.name === 'sys_admin' ? (
              <Navigate to="admin/activity-report" replace />
            ) : (
              <Navigate to="dashboard" replace />
            )} />

          {/* Role-specific dashboards */}
          <Route path="patient-dashboard" element={<PatientDashboard />} />
          <Route path="dashboard" element={<DoctorDashboard />} />

          <Route path="search" element={<DoctorSearch />} />  
          <Route path="patient-appointments" element={<PatientAppointmentsPage />} />
          <Route path="patient-prescription" element={<PatientPrescriptionPage />} />
          <Route path="patient-chat" element={<PatientChatPage />} />
          <Route path="doctor-chat" element={<DoctorChatPage />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="finance" element={<FinancialReportPage />} />
          <Route path="documents" element={<DocumentList />} />
          <Route path="prescription" element={<PrescriptionPage />} />
          <Route path="patient-documents" element={<PatientDocumentsPage />} />
          <Route path="prescription-report" element={<PrescriptionReport />} />
          <Route path="schedule" element={<DoctorSchedule />} />   
          <Route path="meeting/:appointmentId" element={<TelemedicineMeeting />} />
          <Route path="meeting2/:appointmentId" element={<TelemedicineMeet />} />
          <Route path="staff-and-roles" element={<RoleManagementPage />} />
          <Route path="patient/appointment-history" element={<PastEncounters />}/>
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="feedback" element={<FeedbackStartPage />} />
          <Route path="feedback/create/:id" element={<FeedbackCreatePage />} />
          <Route path="feedback/summary/:id" element={<FeedbackSummaryPage />} />
          <Route path="feedback/edit/:id" element={<FeedbackUpdatePage />} />
          <Route path="feedback/delete/:id" element={<FeedbackDeletePage />} />
          <Route path="feedback/doctor" element={<DoctorFeedbackPage />} />
          <Route path="documents/:id" element={<DocumentViewer />} />
          <Route path="feedback/report" element={<FeedbackReportPage />} />
          <Route path="appointment-success" element={<AppointmentSuccessPage />} />
          <Route path="appointment-cancel" element={<AppointmentCancelPage />} />
          <Route path="feedback/create" element={<FeedbackCreatePage />} />
          <Route path="admin/activity-report" element={<AdminDashboard />} /> 
          <Route path="user-management" element={<UserManagementPage />} />
          <Route path="user-management/user/:userId" element={<UserDetailPage />} />


          <Route path="patients/:id" element={<PatientDetailPage />}>
            <Route index element={<PatientInformationTab />} />
            <Route path="treatments" element={<AppointmentHistoryTab />} />
            <Route path="prescriptions" element={<NextTreatmentTab />} />
            <Route path="reports" element={<MedicalRecordTab />} />
            <Route path="documents" element={<PatientDocumentList />} />
          </Route>
 
        </Route>
      </Routes>
    </div>
  );
}

export default App;