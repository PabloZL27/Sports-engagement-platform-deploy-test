type Status = "idle" | "listening" | "thinking" | "speaking";

interface StatusIndicatorProps {
  status: Status;
}

const statusConfig: Record<
  Status,
  { dotClass: string; label: string; pulse?: boolean }
> = {
  idle: { dotClass: "bg-gray-400", label: "Ready when you are" },
  listening: { dotClass: "bg-[#4B9CD3]", label: "I'm listening..." },
  thinking: { dotClass: "bg-[#4B9CD3]", label: "Give me a moment..." },
  speaking: { dotClass: "bg-[#4B9CD3]", label: "Talking with you...", pulse: true },
};

function StatusIndicator({ status }: StatusIndicatorProps) {
  const { dotClass, label, pulse } = statusConfig[status];

  return (
    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[13px] text-gray-500">
      <span
        className={`h-2 w-2 rounded-full ${dotClass} ${pulse ? "animate-pulse" : ""}`}
      />
      <span>{label}</span>
    </div>
  );
}

export default StatusIndicator;
