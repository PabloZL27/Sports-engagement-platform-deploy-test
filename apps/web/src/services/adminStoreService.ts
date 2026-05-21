import type { AdminProduct } from "../types";
import { apiFetch } from "./api";

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(`/admin-store${path}`, options);
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
