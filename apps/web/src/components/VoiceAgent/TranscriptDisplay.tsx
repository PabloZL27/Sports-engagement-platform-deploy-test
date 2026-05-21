export interface Message {
  sender: "user" | "agent";
  text: string;
}

interface TranscriptDisplayProps {
  messages: Message[];
}

function TranscriptDisplay({ messages }: TranscriptDisplayProps) {
  return (
    <div className="flex flex-col gap-3 w-full max-w-lg h-80 overflow-y-auto p-4 bg-gray-100 rounded-lg border border-gray-200">
      {messages.length === 0 ? (
        <p className="text-gray-400 text-center text-sm">
          Start a session to begin chatting with TitanBot
        </p>
      ) : (
        messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                message.sender === "user"
                  ? "bg-blue-900 text-white rounded-br-none"
                  : "bg-gray-300 text-gray-900 rounded-bl-none"
              }`}
            >
              <span className="block text-xs font-semibold mb-1 opacity-70">
                {message.sender === "user" ? "You" : "TitanBot"}
              </span>
              {message.text}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default TranscriptDisplay;
