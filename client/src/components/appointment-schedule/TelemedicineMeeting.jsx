import { useState, useEffect } from "react"
import { ArrowLeft, Mic, Video } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import {
  LocalUser,
  RemoteUser,
  useJoin,
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
  useRemoteUsers,
  useRTCClient
} from "agora-rtc-react"
import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react"

const APP_ID = process.env.REACT_APP_AGORA_APP_ID;

const Basics = ({ appointmentId }) => {
  const navigate = useNavigate();
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

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
    true
  );

  // Publish tracks
  usePublish([localMicrophoneTrack, localCameraTrack]);

  // Get remote users
  const remoteUsers = useRemoteUsers();

  const handleEndMeeting = () => {
    navigate('/account/schedule');
  };

  return (
    <div className="w-full h-screen p-4 bg-gray-100">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-medium">Video Meeting</h1>
          <p className="text-sm text-gray-500">Meeting ID: {appointmentId}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Local User Video */}
          <div className="w-full h-[300px] rounded-lg overflow-hidden bg-gray-100 relative">
            {cameraOn ? (
              <LocalUser
                audioTrack={localMicrophoneTrack}
                cameraOn={cameraOn}
                micOn={micOn}
                videoTrack={localCameraTrack}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <p>Camera Off</p>
              </div>
            )}
            {!micOn && (
              <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                Muted
              </div>
            )}
          </div>

          {/* Remote User Video */}
          {remoteUsers.map((user) => (
            <div key={user.uid} className="w-full h-[300px] rounded-lg overflow-hidden bg-gray-100 relative">
              <RemoteUser user={user} className="w-full h-full object-cover" />
              {!user.hasAudio && (
                <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  Muted
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => setMicOn(!micOn)}
            className={`p-3 rounded-full ${micOn ? "bg-blue-100" : "bg-red-100"}`}
          >
            {micOn ? "Mute" : "Unmute"}
          </button>

          <button 
            onClick={handleEndMeeting}
            className="bg-red-500 text-white px-6 py-3 rounded-full"
          >
            End Meeting
          </button>

          <button
            onClick={() => setCameraOn(!cameraOn)}
            className={`p-3 rounded-full ${cameraOn ? "bg-blue-100" : "bg-red-100"}`}
          >
            {cameraOn ? "Turn Off Camera" : "Turn On Camera"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TelemedicineMeeting() {
  const { appointmentId } = useParams();
  const [loading, setLoading] = useState(true);

  // Create Agora client
  const client = AgoraRTC.createClient({ 
    mode: "rtc", 
    codec: "vp8"
  });

  useEffect(() => {
    // Simple loading simulation
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <AgoraRTCProvider client={client}>
      <Basics appointmentId={appointmentId} />
    </AgoraRTCProvider>
  );
}