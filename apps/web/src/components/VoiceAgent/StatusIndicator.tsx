type Status = "idle" | "listening" | "thinking" | "speaking";

interface StatusIndicatorProps {
  status: Status;
}

const statusConfig: Record<Status, { color: string; label: string }> = {
  idle: { color: "bg-gray-400", label: "Idle" },
  listening: { color: "bg-green-500", label: "Listening..." },
  thinking: { color: "bg-yellow-400", label: "Thinking..." },
  speaking: { color: "bg-blue-500", label: "Speaking..." },
};

function StatusIndicator({ status }: StatusIndicatorProps) {
  const { color, label } = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block w-3 h-3 rounded-full ${color} ${
          status !== "idle" ? "animate-pulse" : ""
        }`}
      />
      <span className="text-sm font-medium text-gray-600">{label}</span>
    </div>
  );
}

export default StatusIndicator;
