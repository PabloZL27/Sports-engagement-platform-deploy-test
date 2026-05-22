export interface Message {
  sender: "user" | "agent";
  text: string;
}

interface TranscriptDisplayProps {
  messages: Message[];
}

function TranscriptDisplay({ messages }: TranscriptDisplayProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
      {messages.length === 0 ? (
        <p className="text-center text-[13px] text-gray-400">
          Start a session to begin chatting with TitanBot
        </p>
      ) : (
        messages.map((message, index) => (
          <div
            key={index}
            className={`flex max-w-[85%] flex-col gap-1 ${
              message.sender === "user" ? "self-end" : "self-start"
            }`}
          >
            <span
              className={`px-1 text-[11px] text-gray-400 ${
                message.sender === "user" ? "text-right" : ""
              }`}
            >
              {message.sender === "user" ? "You" : "TitanBot"}
            </span>
            <div
              className={`rounded-lg px-4 py-2.5 text-[13px] leading-relaxed ${
                message.sender === "user"
                  ? "bg-[#0C2340] text-white"
                  : "bg-[#EEF0F4] text-gray-800"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default TranscriptDisplay;
