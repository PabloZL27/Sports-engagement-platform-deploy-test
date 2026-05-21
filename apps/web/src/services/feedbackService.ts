import { apiFetch } from "./api";
import { supabase } from "../supabaseClient";

const FEEDBACK_BUCKET = import.meta.env.VITE_SUPABASE_FEEDBACK_BUCKET || "feedback-images";
const MAX_FEEDBACK_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export type FeedbackPayload = {
  category: string;
  subject: string;
  message: string;
  image_urls: string[];
};

export type FeedbackRecord = {
  id: string;
  category: string;
  subject: string;
  message: string;
  image_urls: string[];
  created_at: string;
};

export async function createFeedback(payload: FeedbackPayload): Promise<FeedbackRecord> {
  return apiFetch<FeedbackRecord>("/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getFeedbackList(): Promise<FeedbackRecord[]> {
  return apiFetch<FeedbackRecord[]>("/feedback");
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function uploadFeedbackImages(files: File[]): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const ownerId = session?.user?.id || "anonymous";
  const uploadedUrls: string[] = [];

  for (const file of files) {
    if (file.size > MAX_FEEDBACK_IMAGE_SIZE_BYTES) {
      throw new Error("Each image must be smaller than 5MB.");
    }

    const safeFileName = sanitizeFileName(file.name);
    const filePath = `${ownerId}/feedback-${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(FEEDBACK_BUCKET)
      .upload(filePath, file, {
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Could not upload image: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from(FEEDBACK_BUCKET)
      .getPublicUrl(filePath);

    uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}
