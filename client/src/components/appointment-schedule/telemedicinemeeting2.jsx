import { useState, useEffect } from "react"
import { ArrowLeft, Mic, Video, FileText, UserIcon, AlertCircle, Download, Eye } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import {
  LocalUser,
  RemoteUser,
  useJoin,
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
  useRemoteUsers,
  useClientEvent,
  useRTCClient
} from "agora-rtc-react"
import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react"
import { getAppointmentWithPatientData } from "../../services/patientService"
import DocumentService from "../../services/DocumentService"
import { useAuthContext } from "../../context/AuthContext"

const APP_ID = process.env.REACT_APP_AGORA_APP_ID;

const PatientProfileSection = ({ patientData }) => {
  if (!patientData) return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
      <p className="text-gray-400 text-center">Patient medical data not available</p>
    </div>
  );

  return (
    <div className="mt-4 overflow-y-auto">
      {/* Medical Allergies */}
      {patientData.allergies && patientData.allergies.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-red-600 mb-1">Allergies</h3>
          <div className="space-y-1">
            {patientData.allergies.map((allergy, index) => (
              <div key={index} className="py-1 px-2 bg-red-50 rounded-md">
                <p className="text-sm font-medium">{allergy.allergenName}</p>
                <p className="text-xs text-gray-500">{allergy.manifestation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medical Conditions */}
      {patientData.pastMedicalHistory && patientData.pastMedicalHistory.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-blue-600 mb-1">Medical History</h3>
          <div className="space-y-1">
            {patientData.pastMedicalHistory.map((condition, index) => (
              <div key={index} className="py-1 px-2 bg-blue-50 rounded-md flex justify-between">
                <div>
                  <p className="text-sm font-medium">{condition.condition}</p>
                  <p className="text-xs text-gray-500">Since: {condition.onset}</p>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  condition.clinicalStatus === 'Active' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {condition.clinicalStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Medications */}
      {patientData.regularMedications && patientData.regularMedications.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-green-600 mb-1">Current Medications</h3>
          <div className="space-y-1">
            {patientData.regularMedications.map((medication, index) => (
              <div key={index} className="py-1 px-2 bg-green-50 rounded-md">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{medication.medicationName}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    medication.status === 'Ongoing' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {medication.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{medication.dosage} ({medication.form}) - {medication.route}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Surgeries */}
      {patientData.pastSurgicalHistory && patientData.pastSurgicalHistory.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-purple-600 mb-1">Surgical History</h3>
          <div className="space-y-1">
            {patientData.pastSurgicalHistory.map((surgery, index) => (
              <div key={index} className="py-1 px-2 bg-purple-50 rounded-md">
                <p className="text-sm font-medium">{surgery.procedureName}</p>
                <p className="text-xs text-gray-500">
                  {new Date(surgery.date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Immunizations */}
      {patientData.immunizations && patientData.immunizations.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-teal-600 mb-1">Immunizations</h3>
          <div className="space-y-1">
            {patientData.immunizations.map((vaccine, index) => (
              <div key={index} className="py-1 px-2 bg-teal-50 rounded-md">
                <p className="text-sm font-medium">{vaccine.vaccineName}</p>
                <p className="text-xs text-gray-500">
                  {new Date(vaccine.date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {patientData.behavioralRiskFactors && patientData.behavioralRiskFactors.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-orange-600 mb-1">Risk Factors</h3>
          <div className="space-y-1">
            {patientData.behavioralRiskFactors.map((risk, index) => (
              <div key={index} className="py-1 px-2 bg-orange-50 rounded-md">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{risk.riskFactorName}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    risk.status === 'Active' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {risk.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{risk.duration}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Risk Assessment */}
      {patientData.healthRiskAssessment && patientData.healthRiskAssessment.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-amber-600 mb-1">Risk Assessment</h3>
          <div className="space-y-1">
            {patientData.healthRiskAssessment.map((assessment, index) => (
              <div key={index} className="py-1 px-2 bg-amber-50 rounded-md">
                <p className="text-sm font-medium">{assessment.assessmentType}</p>
                <div className="flex justify-between">
                  <p className="text-xs text-gray-500">
                    {new Date(assessment.assessmentDate).toLocaleDateString()}
                  </p>
                  <span className="text-xs font-medium">{assessment.outcome}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Basics = ({ appointmentId, patientName, appointmentDate, patientProfile, documents }) => {
  const navigate = useNavigate();
  const { currentUser, activeRole } = useAuthContext();
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [calling, setCalling] = useState(true);

  // Get tracks for local user
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
  const { localCameraTrack } = useLocalCameraTrack(cameraOn);
  
  // Get reference to the RTC client
  const client = useRTCClient();
  
  // Join the channel
  useJoin(
    {
      appid: APP_ID,
      channel: `appointment-${appointmentId}`,
      token: null
    },
    calling
  );

  // Publish tracks
  usePublish([localMicrophoneTrack, localCameraTrack]);

  // Get remote users
  const remoteUsers = useRemoteUsers();

  const handleEndMeeting = async () => {
    try {
      // First update UI state to prevent further interactions
      setCalling(false);
      setMicOn(false);
      setCameraOn(false);

      // Stop and close local tracks
      if (localMicrophoneTrack) {
        await localMicrophoneTrack.stop();
        await localMicrophoneTrack.close();
      }
      
      if (localCameraTrack) {
        await localCameraTrack.stop();
        await localCameraTrack.close();
      }

      // Stop and close remote user tracks first
      for (const user of remoteUsers) {
        try {
          if (user.audioTrack) {
            user.audioTrack.stop();
            user.audioTrack.close();
          }
          if (user.videoTrack) {
            user.videoTrack.stop();
            user.videoTrack.close();
          }
        } catch (trackError) {
          console.warn(`Error cleaning up tracks for remote user ${user.uid}:`, trackError);
        }
      }

      // Unpublish local tracks before leaving
      if (client) {
        try {
          if (localMicrophoneTrack || localCameraTrack) {
            const tracksToUnpublish = [localMicrophoneTrack, localCameraTrack].filter(Boolean);
            if (tracksToUnpublish.length > 0) {
              await client.unpublish(tracksToUnpublish);
              console.log("Successfully unpublished local tracks");
            }
          }
        } catch (unpublishError) {
          console.warn("Error unpublishing tracks:", unpublishError);
        }

        // Leave the channel
        try {
          await client.leave();
          console.log("Successfully left the channel");
        } catch (leaveError) {
          console.warn("Error leaving channel:", leaveError);
        }
      }

      // Navigate based on user role name
      if (activeRole?.name === 'sys_doctor') {
        navigate('/account/schedule');
      } else {
        navigate('/account/patient-appointments');
      }
    } catch (error) {
      console.error("Error in handleEndMeeting:", error);
      // Ensure navigation happens even if there's an error
      if (activeRole?.name === 'sys_doctor') {
        navigate('/account/schedule');
      } else {
        navigate('/account/patient-appointments');
      }
    }
  };

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      // This ensures resources are cleaned up if user navigates away without clicking End Meeting
      if (localMicrophoneTrack) {
        localMicrophoneTrack.stop();
        localMicrophoneTrack.close();
      }
      if (localCameraTrack) {
        localCameraTrack.stop();
        localCameraTrack.close();
      }
      
      // Also clean up remote tracks on unmount
      remoteUsers.forEach(user => {
        try {
          if (user.audioTrack) {
            user.audioTrack.stop();
            user.audioTrack.close();
          }
          if (user.videoTrack) {
            user.videoTrack.stop();
            user.videoTrack.close();
          }
        } catch (error) {
          console.warn(`Error cleaning up remote user ${user.uid} tracks on unmount:`, error);
        }
      });

      // Leave channel on unmount
      if (client) {
        client.leave().catch(error => {
          console.warn("Error leaving channel on unmount:", error);
        });
      }
    };
  }, [localMicrophoneTrack, localCameraTrack, remoteUsers, client]);

  return (
    <div className="w-full mx-auto p-0 h-full">      {/* Header */}
      <div className="border-b border-gray-200 mb-4 bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 pb-0">
          <div className="p-4 pb-0">
            <h1 className="text-blue-600 font-medium text-lg">Telemedicine Meeting</h1>
          </div>
          <div className="h-0.5 w-44 bg-blue-600 mt-2"></div>
        </div>
      </div>      {/* Main content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        {/* Meeting area */}
        <div className="w-full max-w-[1000px] mx-auto px-4 my-8">
          <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 backdrop-blur-sm bg-white/80">
            {/* Patient info */}
            <div className="flex items-center mb-4">
              <button className="mr-4" onClick={() => navigate('/account/schedule')}>
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </button>
              <div>
                <h2 className="font-medium text-gray-800">{patientName}</h2>
                <p className="text-sm text-gray-500">{appointmentDate}</p>
              </div>
            </div>            {/* Video screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 max-w-4xl mx-auto">
              {/* Local user video */}
              <div className="w-full h-[380px] rounded-3xl overflow-hidden bg-gray-50 relative shadow-lg border border-gray-100/50">
                {cameraOn ? (
                  <LocalUser
                    audioTrack={localMicrophoneTrack}
                    cameraOn={cameraOn}
                    micOn={micOn}
                    videoTrack={localCameraTrack}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-2xl">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center">
                        <UserIcon className="h-10 w-10 text-gray-500" />
                      </div>
                      <p className="mt-3 text-gray-600">Camera Off</p>
                    </div>
                    
                    {/* Audio still works when camera is off */}
                    <div className="hidden">
                      <LocalUser
                        audioTrack={localMicrophoneTrack}
                        cameraOn={false}
                        micOn={micOn}
                        videoTrack={null}
                      />
                    </div>
                  </div>
                )}
                {!micOn && (
                  <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md">
                    Muted
                  </div>
                )}
              </div>              {/* Remote user video */}
              {remoteUsers.map((user) => (
                <div key={user.uid} className="w-full h-[380px] rounded-3xl overflow-hidden bg-gray-50 relative shadow-lg border border-gray-100/50">
                  <RemoteUser user={user} className="w-full h-full object-cover rounded-2xl">
                    <span className="hidden">{user.uid}</span>
                  </RemoteUser>
                  {!user.hasAudio && (
                    <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md">
                      Muted
                    </div>
                  )}
                </div>
              ))}
            </div>            {/* Meeting controls */}
            <div className="flex justify-center items-center gap-8 mt-6">
              <button
                onClick={() => setMicOn(!micOn)}
                className={`p-4 rounded-full transition-all duration-200 hover:bg-gray-100 shadow-md ${
                  micOn 
                    ? "text-gray-700 bg-white border border-gray-200" 
                    : "bg-gray-100 text-gray-500 border border-gray-200"
                }`}
              >
                <Mic className="h-6 w-6" />
              </button>              <button 
                onClick={handleEndMeeting}
                className="bg-red-500 hover:bg-red-600 text-white px-10 py-4 rounded-full font-medium transition-colors duration-200 shadow-lg"
              >
                End Meeting
              </button>

              <button
                onClick={() => setCameraOn(!cameraOn)}
                className={`p-3 rounded-full transition-all duration-200 hover:bg-gray-100 ${
                  cameraOn 
                    ? "text-gray-700 bg-white border border-gray-200" 
                    : "bg-gray-100 text-gray-500 border border-gray-200"
                }`}
              >
                <Video className="h-6 w-6" />
              </button>
            </div>            {/* Meeting info box */}
            <div className="mt-8 bg-gray-50/80 rounded-2xl p-4 border border-gray-100/50 max-w-xs mx-auto backdrop-blur-sm">
              <p className="text-sm text-gray-600 text-center font-medium">Meeting ID: appointment-{appointmentId}</p>
            </div></div>
        </div>
      </div>
    </div>
  )
}

export default function TelemedicineMeeting() {
  const { appointmentId } = useParams();
  const [appointmentData, setAppointmentData] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const { currentUser } = useAuthContext();

  // Create Agora client
  const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

  // Fetch appointment and patient data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await getAppointmentWithPatientData(appointmentId);
        setAppointmentData(data.appointment);
        setPatientProfile(data.patientData);
        
        // Fetch documents using patient ID and doctor ID
        if (data.patientData?._id && currentUser?.id) {
          console.log("Fetching documents for patient ID:", data.patientData._id, "and doctor ID:", currentUser.id);
          const docsResponse = await DocumentService.getAllDocuments(data.patientData._id, currentUser.id);
          setDocuments(docsResponse.documents || []);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
        setLoading(false);
      }
    }
    
    if (appointmentId) {
      fetchData();
    }
  }, [appointmentId, currentUser?.id]);

  console.log('13. Rendering component with loading:', loading, 'error:', error);

  if (loading) {
    console.log('14. Rendering loading state');
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-medium text-gray-800 mb-2">Error Loading Meeting</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <AgoraRTCProvider client={client}>
      <Basics 
        appointmentId={appointmentId}
        patientName={appointmentData?.firstName ? `${appointmentData.firstName} ${appointmentData.lastName}` : 'Patient'}
        appointmentDate={appointmentData?.time ? new Date(appointmentData.time).toLocaleDateString() : ''}
        patientProfile={patientProfile}
        documents={documents}
      />
    </AgoraRTCProvider>
  );
}