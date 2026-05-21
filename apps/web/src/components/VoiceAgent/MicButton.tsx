import { FiMic, FiSquare } from "react-icons/fi";

interface MicButtonProps {
  isActive: boolean;
  onClick: () => void;
}

function MicButton({ isActive, onClick }: MicButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full px-8 py-3 text-[14px] font-medium text-white transition-colors"
      style={{ backgroundColor: isActive ? "#7f1d1d" : "#0C2340" }}
    >
      {isActive ? (
        <>
          <FiSquare className="h-4 w-4 shrink-0" aria-hidden />
          Stop Talking
        </>
      ) : (
        <>
          <FiMic className="h-4 w-4 shrink-0" aria-hidden />
          Start Talking
        </>
      )}
    </button>
  );
}

export default MicButton;
