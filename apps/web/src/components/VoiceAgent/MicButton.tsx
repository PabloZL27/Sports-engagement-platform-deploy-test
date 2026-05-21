interface MicButtonProps {
  isActive: boolean;
  onClick: () => void;
}

function MicButton({ isActive, onClick }: MicButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-full text-white font-bold text-lg transition-colors duration-200 ${
        isActive
          ? "bg-red-600 hover:bg-red-700"
          : "bg-blue-900 hover:bg-blue-800"
      }`}
    >
      {isActive ? "End Session" : "Start Session"}
    </button>
  );
}

export default MicButton;
