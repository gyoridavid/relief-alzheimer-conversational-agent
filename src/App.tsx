import { useState, useRef, useEffect } from "react";
import "./App.css";
import {
  createWebcamService,
  startWebcamStream,
  type WebcamService,
  type WebcamStream,
} from "./utils/webcam";
import { useElevenLabsAgent } from "./hooks/useElevenLabsAgent";
import { useAppStore } from "./store/appStore";
import avatarImage from "./assets/avatar.png";

function App() {
  const [status, setStatus] = useState<string>("");
  const webcamServiceRef = useRef<WebcamService | null>(null);
  const webcamStreamRef = useRef<WebcamStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Global store
  const { isSleeping, isWebcamOn, setWebcamOn } = useAppStore();

  // ElevenLabs Agent
  const {
    status: agentStatus,
    isSpeaking,
    startConversation,
    endConversation,
    sendContextualUpdate,
  } = useElevenLabsAgent();

  const isConnected = agentStatus === "connected";

  // Manage webcam stream for preview
  useEffect(() => {
    if (isWebcamOn) {
      // Start the webcam stream for preview
      startWebcamStream()
        .then((webcamStream) => {
          webcamStreamRef.current = webcamStream;
          if (videoRef.current) {
            videoRef.current.srcObject = webcamStream.stream;
          }
        })
        .catch((error) => {
          console.error("Failed to start webcam preview:", error);
        });
    } else {
      // Stop the webcam stream
      if (webcamStreamRef.current) {
        webcamStreamRef.current.stop();
        webcamStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.stop();
        webcamStreamRef.current = null;
      }
    };
  }, [isWebcamOn]);

  const handleToggleApp = async () => {
    try {
      if (isConnected || isWebcamOn) {
        // Stop everything
        if (isConnected) {
          await endConversation();
        }
        if (isWebcamOn) {
          webcamServiceRef.current?.stop();
          webcamServiceRef.current = null;
          setWebcamOn(false);
        }
        setStatus("App stopped");
      } else {
        // Start everything
        // Start webcam service
        const service = createWebcamService({
          url: import.meta.env.VITE_WEBHOOK_URL,
          intervalMs: Number(import.meta.env.VITE_WEBCAM_INTERVAL_MS) || 5000,
          uploadFormat: "formdata",
          imageField: "image",
          onSuccess: async (_result, response) => {
            setStatus(
              `✓ Auto-capture sent at ${new Date().toLocaleTimeString()}`
            );

            // Parse response and send image analysis to the agent
            try {
              const responseData = await response.json();
              if (responseData.text && sendContextualUpdate) {
                sendContextualUpdate(
                  `Here's what's visible of the patient's camera: ${responseData.text}. \nUse it to get visual context during the conversation.`
                );
                console.log(
                  "Sent contextual update to agent:",
                  responseData.text
                );
              }
            } catch (error) {
              console.error(
                "Failed to parse response or send contextual update:",
                error
              );
            }
          },
          onError: (error) => {
            setStatus(`✗ Auto-capture error: ${error.message}`);
          },
        });
        webcamServiceRef.current = service;
        service.start();
        setWebcamOn(true);

        // Start conversation
        await startConversation();
        setStatus("App started - webcam and voice agent active");
      }
    } catch (error) {
      console.error("Failed to toggle app:", error);
      setStatus(
        `✗ App error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const isAppRunning = isConnected || isWebcamOn;

  // Start screen - show big purple start button
  if (!isAppRunning) {
    return (
      <div className="start-screen">
        <button className="start-button" onClick={handleToggleApp}>
          Start
        </button>
      </div>
    );
  }

  // Call screen - show avatar, name, and webcam preview
  return (
    <div className="call-screen">
      <div className="avatar-container">
        <img src={avatarImage} alt="Ruby" className="avatar-image" />
      </div>

      <h1 className="caller-name">Ruby</h1>

      <div className="call-status">
        {isSpeaking && (
          <div className="speaking-indicator">
            <div className="speaking-bar" />
            <div className="speaking-bar" />
            <div className="speaking-bar" />
            <div className="speaking-bar" />
            <div className="speaking-bar" />
          </div>
        )}
        <span>
          {isSpeaking
            ? "Speaking..."
            : isSleeping
            ? "💤 Sleeping..."
            : "Connected"}
        </span>
      </div>

      <button className="end-call-button" onClick={handleToggleApp}>
        📞
      </button>

      {isWebcamOn && (
        <div className="webcam-preview">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="webcam-video"
          />
        </div>
      )}

      {status && <p className="status-text">{status}</p>}
    </div>
  );
}

export default App;
