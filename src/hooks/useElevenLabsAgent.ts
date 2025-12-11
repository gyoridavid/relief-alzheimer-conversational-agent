import { useConversation } from "@elevenlabs/react";
import { useCallback, useRef, useEffect } from "react";
import { useAppStore } from "../store/appStore";

const AGENT_ID = "agent_2401kc5n6szxf4cr9dfz1j7mfydt";
const SILENCE_TIMEOUT_MS = 5000; // 10 seconds

const safeConversationsStarters = [
  "What did your father do when you were little?",
  "What was your favorite job back then?",
  "What do you want to cook for dinner today?",
  "What kind of clothing did you used to make as a tailor?",
];

function getRandomConversationStarter(): string {
  const randomIndex = Math.floor(
    Math.random() * safeConversationsStarters.length
  );
  return safeConversationsStarters[randomIndex];
}

export function useElevenLabsAgent() {
  const { setSleeping, isSleeping } = useAppStore();
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSleepingRef = useRef(false);
  const justEnteredSleepRef = useRef(false); // Flag to ignore the message that triggered sleep
  const conversationRef = useRef<ReturnType<typeof useConversation> | null>(
    null
  );

  // Keep the ref in sync with the state
  useEffect(() => {
    isSleepingRef.current = isSleeping;
  }, [isSleeping]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      console.log("Clearing silence timer");
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startSilenceTimer = useCallback(() => {
    // Don't start timer if sleeping
    if (isSleepingRef.current) {
      console.log("Not starting silence timer - in sleep mode");
      return;
    }
    clearSilenceTimer();
    console.log("Starting silence timer");
    silenceTimerRef.current = setTimeout(() => {
      // Double-check we're not sleeping when the timer fires
      if (isSleepingRef.current) {
        console.log("Timer fired but in sleep mode - ignoring");
        return;
      }
      if (conversationRef.current?.sendUserMessage) {
        const randomQuestion = getRandomConversationStarter();
        const prompt = `[System: The patient has been silent for a while. Please ask them this question to keep the conversation going: "${randomQuestion}"]`;
        console.log("Sending prompt due to silence:", prompt);
        conversationRef.current.sendUserMessage(prompt);
      }
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimer]);

  const conversation = useConversation({
    clientTools: {
      sleep: async () => {
        console.log(`Sleep tool called`);
        // Pause the silence timer during sleep mode
        justEnteredSleepRef.current = true; // Mark that we just entered sleep to ignore triggering message
        isSleepingRef.current = true;
        setSleeping(true);
        clearSilenceTimer();
        await new Promise((resolve) => setTimeout(resolve, 60000));
        setSleeping(false);
        isSleepingRef.current = false;
        console.log("Sleep tool completed successfully");
        return "Sleep completed";
      },
    },
    onConnect: () => {
      console.log("Connected to ElevenLabs agent");
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs agent");
      clearSilenceTimer();
    },
    onError: (error) => {
      console.error("ElevenLabs agent error:", error);
    },
    onMessage: (message) => {
      console.log("Message received:", message);
      // Handle user speech
      if (message.source === "user") {
        // If we just entered sleep mode, this is the message that triggered it - ignore it
        if (justEnteredSleepRef.current) {
          console.log("Ignoring user message that triggered sleep mode");
          justEnteredSleepRef.current = false;
          return;
        }
        // Exit sleep mode if user speaks
        if (isSleepingRef.current) {
          console.log("User speaking detected, exiting sleep mode");
          isSleepingRef.current = false;
          setSleeping(false);
        }
        clearSilenceTimer();
        // Restart the silence timer after user has spoken
        startSilenceTimer();
      }
    },
    onModeChange: (mode) => {
      console.log("Mode changed:", mode);

      // Start silence timer when agent stops speaking (mode changes to "listening")
      // but only if not in sleep mode
      if (mode.mode === "listening" && !isSleepingRef.current) {
        clearSilenceTimer();
        startSilenceTimer();
      } else if (mode.mode === "speaking") {
        // Clear timer when agent is speaking
        clearSilenceTimer();
      }
    },
  });

  // Store conversation ref for use in timer callback
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
    };
  }, [clearSilenceTimer]);

  const startConversation = useCallback(async () => {
    try {
      // Request microphone access first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start the conversation session
      const conversationId = await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "websocket" as const,
      });

      console.log("Conversation started:", conversationId);
      return conversationId;
    } catch (error) {
      console.error("Failed to start conversation:", error);
      throw error;
    }
  }, [conversation]);

  const endConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return {
    // State
    status: conversation.status,
    isSpeaking: conversation.isSpeaking,

    // Methods
    startConversation,
    endConversation,
    setVolume: conversation.setVolume,
    sendUserMessage: conversation.sendUserMessage,
    sendContextualUpdate: conversation.sendContextualUpdate,

    // Audio visualization
    getInputVolume: conversation.getInputVolume,
    getOutputVolume: conversation.getOutputVolume,
    getInputByteFrequencyData: conversation.getInputByteFrequencyData,
    getOutputByteFrequencyData: conversation.getOutputByteFrequencyData,
  };
}
