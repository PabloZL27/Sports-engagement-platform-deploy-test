import type { AdminProduct } from "../types";
import { apiFetch } from "./api";

export async function getAdminProducts(): Promise<{ products: AdminProduct[] }> {
  return apiFetch("/admin-store/products");
}

export async function deleteProduct(id: string): Promise<void> {
  await apiFetch(`/admin-store/products/${id}`, { method: "DELETE" });
}

export async function createProduct(formData: FormData): Promise<{ product: AdminProduct }> {
  return apiFetch("/admin-store/products", {
    method: "POST",
    body: formData,
  });
}

export async function updateProduct(id: string, formData: FormData): Promise<{ product: AdminProduct }> {
  return apiFetch(`/admin-store/products/${id}`, {
    method: "PUT",
    body: formData,
  });
}