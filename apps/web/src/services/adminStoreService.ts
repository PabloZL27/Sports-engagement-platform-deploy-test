import type { AdminProduct } from "../types";

// Local: http://localhost:4013
// Gateway: http://localhost:8081/admin-store
const ADMIN_STORE_URL =
  import.meta.env.VITE_ADMIN_STORE_URL || "http://localhost:4013";

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${ADMIN_STORE_URL}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP error ${res.status}`);
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
