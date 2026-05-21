import { ModalComp } from "../general/modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  loading?: boolean;
  errorMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  loading = false,
  errorMessage,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClass =
    confirmVariant === "danger"
      ? "px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      : "px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition";

  return (
    <ModalComp
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !loading) onCancel();
      }}
      title={title}
      dialogClassName="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={confirmClass}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        {errorMessage && (
          <p
            className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </div>
    </ModalComp>
  );
}
