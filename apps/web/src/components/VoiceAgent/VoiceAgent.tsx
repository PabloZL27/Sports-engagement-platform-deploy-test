import { useState, useCallback } from "react";
import { useConversation } from "@11labs/react";
import MicButton from "./MicButton";
import StatusIndicator from "./StatusIndicator";
import TranscriptDisplay from "./TranscriptDisplay";
import type { Message } from "./TranscriptDisplay";
import Navbar from "../layout/Navbar";

type Status = "idle" | "listening" | "thinking" | "speaking";

function VoiceAgent() {
  const [, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<Message[]>([]);

  const conversation = useConversation({
    onMessage: (response: { source: string; message: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          sender: response.source === "ai" ? "agent" : "user",
          text: response.message,
        },
      ]);
    },
    onError: (error: unknown) => {
      console.error("Conversation error:", error);
      setStatus("idle");
    },
  });

  const getStatus = useCallback((): Status => {
    if (conversation.status === "connected") {
      if (conversation.isSpeaking) return "speaking";
      return "listening";
    }
    return "idle";
  }, [conversation.status, conversation.isSpeaking]);

  const handleToggle = async () => {
    if (conversation.status === "connected") {
      await conversation.endSession();
      setStatus("idle");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      await conversation.startSession({
        agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID,
      });
    } catch (error) {
      console.error("Failed to start session:", error);
      setStatus("idle");
    }
  };

  const currentStatus =
    conversation.status === "connected" ? getStatus() : "idle";

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-gray-900">
      <main className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-6 p-6">
        <Navbar />
        <h1 className="text-3xl font-bold text-blue-900">TitanCrew</h1>
        <p className="text-sm text-gray-500">Voice AI Agent — TitanBot</p>
        <StatusIndicator status={currentStatus} />
        <TranscriptDisplay messages={messages} />
        <MicButton
          isActive={conversation.status === "connected"}
          onClick={handleToggle}
        />
      </main>
    </div>
  );
}

export default VoiceAgent;
