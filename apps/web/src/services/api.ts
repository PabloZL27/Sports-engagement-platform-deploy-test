const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function normalizeEndpoint(endpoint: string): string {
  if (endpoint === "/matches" || endpoint.startsWith("/matches?")) {
    return endpoint.replace(/^\/matches(?=\?|$)/, "/matches/");
  }

  return endpoint;
}

function resolveApiUrl(endpoint: string): string {
  const normalizedEndpoint = normalizeEndpoint(endpoint);

  if (API_BASE_URL && normalizedEndpoint.startsWith("/api/")) {
    return `${API_BASE_URL}${normalizedEndpoint.slice(4)}`;
  }

  if (API_BASE_URL) {
    return `${API_BASE_URL}${normalizedEndpoint}`;
  }

  if (normalizedEndpoint.startsWith("/api/")) {
    return normalizedEndpoint;
  }

  return `/api${normalizedEndpoint.startsWith("/") ? normalizedEndpoint : `/${normalizedEndpoint}`}`;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = resolveApiUrl(endpoint);

  const config: RequestInit = {
    ...options,
    headers: {
      ...((options.headers as Record<string, string>) || {}),
    },
  };

  const response = await fetch(url, config);
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (isJson) {
      const body = data as { error?: string; message?: string };
      throw new Error(
        body.message || body.error || `HTTP error ${response.status}`,
      );
    }

    throw new Error(
      typeof data === "string" && data.trim()
        ? data
        : `HTTP error ${response.status}`,
    );
  }

  return data as T;
}
