import { useState, useCallback, useEffect } from "react";
import { useConversation } from "@11labs/react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import { FiMessageCircle, FiTrash2, FiVolume2 } from "react-icons/fi";
import Navbar from "../layout/Navbar";
import MicButton from "./MicButton";
import StatusIndicator from "./StatusIndicator";
import TranscriptDisplay from "./TranscriptDisplay";
import type { Message } from "./TranscriptDisplay";

type Status = "idle" | "listening" | "thinking" | "speaking";

function VoiceAgent() {
  const [, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<Message[]>([]);

  const { rive, RiveComponent } = useRive({
    src: "/mascota-titancrew.riv",
    stateMachines: "RaccoonStateMachine",
    autoplay: true,
  });

  const isSpeakingInput = useStateMachineInput(
    rive,
    "RaccoonStateMachine",
    "isSpeaking"
  );

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

  useEffect(() => {
    if (isSpeakingInput) {
      isSpeakingInput.value = conversation.isSpeaking;
    }
  }, [conversation.isSpeaking, isSpeakingInput]);

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
    <div className="flex min-h-screen flex-col bg-[#F4F5F7] text-gray-900">
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col p-6">
        <Navbar />

        <div className="flex min-h-0 flex-1 flex-row overflow-hidden rounded-2xl border border-gray-200 bg-[#EEF0F4]">
          <div className="flex w-[42%] flex-col items-center justify-start gap-4 border-r border-gray-200 bg-[#EEF0F4] px-6 pb-8 pt-14">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-[#0C2340]">
              TitanBot
            </h1>

            <div className="relative flex h-[280px] w-[280px] items-center justify-center rounded-full border border-gray-200 bg-white">
              {currentStatus === "speaking" && (
                <>
                  <span
                    className="pointer-events-none absolute inset-[-10px] rounded-full border-2 border-[#4B9CD3] opacity-35"
                    aria-hidden
                  />
                  <span
                    className="pointer-events-none absolute inset-[-20px] rounded-full border border-[#4B9CD3] opacity-15"
                    aria-hidden
                  />
                </>
              )}
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div className="flex h-full w-full items-center justify-center">
                  <RiveComponent
                    style={{ width: 280, height: 280, transform: "scale(1.45)" }}
                  />
                </div>
              </div>
            </div>

            <StatusIndicator status={currentStatus} />

            <div className="mt-8">
              <MicButton
                isActive={conversation.status === "connected"}
                onClick={handleToggle}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col bg-white">
            <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2 text-[14px] font-medium text-gray-800">
                <FiMessageCircle className="h-4 w-4 text-gray-500" aria-hidden />
                Conversation
              </div>
              <button
                type="button"
                onClick={() => setMessages([])}
                className="flex items-center gap-1.5 text-[12px] text-gray-400 transition-colors hover:text-gray-600"
              >
                <FiTrash2 className="h-3.5 w-3.5" aria-hidden />
                Clear
              </button>
            </header>

            <TranscriptDisplay messages={messages} />

            <footer className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 text-[12px] text-gray-400">
              <FiVolume2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Speak to continue the conversation
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}

export default VoiceAgent;
