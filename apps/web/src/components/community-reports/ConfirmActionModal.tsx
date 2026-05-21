type ConfirmActionModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "danger" | "neutral";
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmActionModal({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = "neutral",
  isLoading = false,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  if (!isOpen) return null;

  const confirmClass =
    confirmVariant === "danger"
      ? "border-[#c61d1d] bg-[#c61d1d] text-white hover:bg-[#a91818]"
      : "border-[#0d1f3c] bg-[#0d1f3c] text-white hover:bg-[#172f59]";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0b1220]/45 p-4 backdrop-blur-[6px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        className="w-full max-w-[420px] rounded-[20px] bg-white px-6 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
      >
        <h2
          id="confirm-action-title"
          className="m-0 text-[24px] font-extrabold leading-tight text-[#15233d]"
        >
          {title}
        </h2>
        <p className="m-0 mt-3 text-[16px] font-medium leading-[1.45] text-[#596175]">
          {message}
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="rounded-[12px] border-2 border-[#d7dce6] bg-white px-5 py-2.5 text-[16px] font-extrabold leading-none text-[#344363] transition hover:border-[#c6ccd9] hover:bg-[#fbfcff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`rounded-[12px] border-2 px-5 py-2.5 text-[16px] font-extrabold leading-none transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
          >
            {isLoading ? "Working..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ConfirmActionModal;
