import type { AdminProduct } from "../types";
import {
  isProductImageSizeError,
  PRODUCT_IMAGE_TOO_LARGE_MESSAGE,
} from "../utils/productImageValidation";

// Local: http://localhost:4013
// Gateway: http://localhost:8081/admin-store
const ADMIN_STORE_URL =
  import.meta.env.VITE_ADMIN_STORE_URL || "http://localhost:4013";

function resolveAdminFetchError(
  status: number,
  body: { error?: string; message?: string } | null,
  fallbackText: string,
): string {
  if (status === 413) {
    return PRODUCT_IMAGE_TOO_LARGE_MESSAGE;
  }

  const raw = body?.error || body?.message || fallbackText;
  if (isProductImageSizeError(raw)) {
    return PRODUCT_IMAGE_TOO_LARGE_MESSAGE;
  }

  return raw;
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${ADMIN_STORE_URL}${path}`, options);
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let data: { error?: string; message?: string } | null = null;
  let fallbackText = "";

  if (isJson) {
    data = (await res.json()) as { error?: string; message?: string };
  } else {
    fallbackText = await res.text();
  }

  if (!res.ok) {
    throw new Error(resolveAdminFetchError(res.status, data, fallbackText));
  }

  return data as T;
}

export async function getAdminProducts(): Promise<{ products: AdminProduct[] }> {
  return adminFetch("/products");
}

export async function deleteProduct(id: string): Promise<void> {
  await adminFetch(`/products/${id}`, { method: "DELETE" });
}

export async function createProduct(formData: FormData): Promise<{ product: AdminProduct }> {
  return adminFetch("/products", { method: "POST", body: formData });
}

export async function updateProduct(id: string, formData: FormData): Promise<{ product: AdminProduct }> {
  return adminFetch(`/products/${id}`, { method: "PUT", body: formData });
}
