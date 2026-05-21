import { apiFetch } from './api';
import type { StoreProduct } from '../types';

export async function getProducts() {
    return await apiFetch<{ products: StoreProduct[] }>("/get_products");
}

interface CheckoutLineItem {
    price: string;
    quantity: number;
}

export async function createCheckout(lineItems: CheckoutLineItem[]) {
    console.log("createCheckout args:", { lineItems });

    return await apiFetch<{ url: string }>("/create_checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            line_items: lineItems,
            origin: window.location.origin,
        }),
    });
}