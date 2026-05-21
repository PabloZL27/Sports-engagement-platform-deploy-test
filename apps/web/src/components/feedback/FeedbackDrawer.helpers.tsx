import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createFeedback,
  uploadFeedbackImages,
} from "../../services/feedbackService";

export const NAV = "#002244";
export const ACCENT = "#4B92DB";

export const CATEGORIES = [
  "General Feedback",
  "Bug Report",
  "Feature Request",
  "Match Room",
  "Team Cards / Packs",
  "Store",
  "News",
  "Profile",
  "Community",
  "Other",
];

export const MAX_MESSAGE_LENGTH = 1500;
export const MAX_IMAGES = 5;
export const ACCEPTED_TYPES = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
const BLOCKED_WORDS = [
  "chingada",
  "chingado",
  "chingar",
  "chingas",
  "chingues",
  "cojudo",
  "cojuda",
  "cojer",
  "culero",
  "culera",
  "estupido",
  "estupida",
  "idiota",
  "imbecil",
  "mierda",
  "pene",
  "pendeja",
  "pendejo",
  "pinche",
  "puta",
  "puto",
];

export interface FormState {
  category: string;
  subject: string;
  message: string;
  images: File[];
}

export interface FormErrors {
  category?: string;
  subject?: string;
  message?: string;
}

export const EMPTY_FORM: FormState = {
  category: "",
  subject: "",
  message: "",
  images: [],
};

function normalizeForModeration(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function findBlockedWord(value: string): string | null {
  const tokens = normalizeForModeration(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  for (const token of tokens) {
    if (BLOCKED_WORDS.includes(token)) {
      return token;
    }
  }

  return null;
}

function validateForm(form: FormState): FormErrors {
  const nextErrors: FormErrors = {};
  const blockedSubjectWord = findBlockedWord(form.subject);
  const blockedMessageWord = findBlockedWord(form.message);

  if (!form.category) nextErrors.category = "Please select a category.";
  if (!form.subject.trim()) nextErrors.subject = "Subject is required.";
  if (!form.message.trim()) nextErrors.message = "Message is required.";
  if (blockedSubjectWord) {
    nextErrors.subject = "Please remove offensive language from the subject.";
  }
  if (blockedMessageWord) {
    nextErrors.message = "Please remove offensive language from your message.";
  }

  return nextErrors;
}

export function useFeedbackDrawer() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        handleClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose, open]);

  const previews = useMemo(
    () => form.images.map((image) => URL.createObjectURL(image)),
    [form.images],
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [previews]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitted(false);
    setSubmitting(false);
    setSubmitError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const handleDone = useCallback(() => {
    resetForm();
    setOpen(false);
  }, [resetForm]);

  const setField = useCallback((field: "category" | "subject" | "message", value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError(null);
  }, []);

  const addImages = useCallback((files: FileList | null) => {
    if (!files) return;

    const validImages = Array.from(files).filter((file) => ACCEPTED_TYPES.includes(file.type));

    setForm((prev) => ({
      ...prev,
      images: [...prev.images, ...validImages].slice(0, MAX_IMAGES),
    }));
    setSubmitError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
    setSubmitError(null);
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const imageUrls = await uploadFeedbackImages(form.images);

      await createFeedback({
        category: form.category.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        image_urls: imageUrls,
      });

      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not submit feedback.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  return {
    open,
    submitted,
    submitting,
    submitError,
    form,
    errors,
    previews,
    fileInputRef,
    handleOpen,
    handleClose,
    handleDone,
    setField,
    addImages,
    removeImage,
    handleSubmit,
  };
}

export function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function SuccessState({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: `${ACCENT}20` }}
      >
        <CheckIcon className="h-8 w-8" style={{ color: ACCENT }} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">
          Thanks for your feedback!
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Your suggestion has been submitted for review.
        </p>
      </div>
      <button
        onClick={onDone}
        className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none"
        style={{ backgroundColor: NAV }}
      >
        Done
      </button>
    </div>
  );
}

export function MegaphoneIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M20.25 4.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-1.133.648l-7.617-4.498H9.75v1.35a2.25 2.25 0 0 1-4.148 1.217l-1.37-2.067H3.75A2.25 2.25 0 0 1 1.5 13.65v-3.3A2.25 2.25 0 0 1 3.75 8.1h.482l1.37-2.067A2.25 2.25 0 0 1 9.75 7.25V8.6h2.5l7.617-4.498A.75.75 0 0 1 20.25 4.5ZM9.75 10.1v3.3h2.704a.75.75 0 0 1 .382.104l6.664 3.936V6.56l-6.664 3.936a.75.75 0 0 1-.382.104H9.75Zm-1.5-2.85a.75.75 0 0 0-1.376-.415L5.742 8.6H8.25V7.25Zm-4.5 2.35a.75.75 0 0 0-.75.75v3.3c0 .414.336.75.75.75h4.5V9.6h-4.5Zm2.285 5.3.817 1.232A.75.75 0 0 0 8.25 15.75V14.9H6.035Z" />
    </svg>
  );
}

export function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function XSmallIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

export function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

export function InfoIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function CheckIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
