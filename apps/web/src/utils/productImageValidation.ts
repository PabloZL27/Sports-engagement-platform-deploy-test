export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export const PRODUCT_IMAGE_TOO_LARGE_MESSAGE =
  "The image exceeds the 5MB size limit. Please choose a different image smaller than 5MB.";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];

export function getProductImageValidationError(file: File): string | null {
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return PRODUCT_IMAGE_TOO_LARGE_MESSAGE;
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Only PNG and JPG images are allowed.";
  }
  return null;
}

export function isProductImageSizeError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("file too large") ||
    lower.includes("limit_file_size") ||
    lower.includes("5mb") ||
    lower.includes("size limit")
  );
}
