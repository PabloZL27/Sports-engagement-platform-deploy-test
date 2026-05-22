import { apiFetch } from "./api";
import type {
  SaveWordleSessionPayload,
  SaveWordleSessionResponse,
  WordleConfig,
  WordleDictionaryResponse,
  WordleHistoryResponse,
  WordleLeaderboardResponse,
} from "../types/wordle";

const WORDLE_LOAD_ERROR_MESSAGE =
  "A database error occurred while loading Wordle.";
const WORDLE_SAVE_ERROR_MESSAGE =
  "A database error occurred while saving your Wordle score.";

function buildAuthHeaders(accessToken?: string) {
  return accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : {};
}

function toErrorMessage(error: unknown, fallbackMessage: string): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = message.trim().toLowerCase();

  if (
    normalizedMessage.includes("<!doctype html") ||
    normalizedMessage.includes("<html") ||
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("networkerror") ||
    normalizedMessage.includes("database permission denied") ||
    normalizedMessage.includes("profile lookup failed with status 404") ||
    normalizedMessage.includes("profile not found") ||
    normalizedMessage.includes("connection failed") ||
    normalizedMessage.includes("connect econnrefused") ||
    normalizedMessage.includes("http error 500") ||
    normalizedMessage.includes("http error 502") ||
    normalizedMessage.includes("http error 503") ||
    normalizedMessage.includes("http error 504")
  ) {
    return fallbackMessage;
  }

  return message || fallbackMessage;
}

function normalizeWordleLoadError(error: unknown): never {
  throw new Error(toErrorMessage(error, WORDLE_LOAD_ERROR_MESSAGE));
}

function normalizeWordleSaveError(error: unknown): never {
  throw new Error(toErrorMessage(error, WORDLE_SAVE_ERROR_MESSAGE));
}

export async function getWordleConfig(): Promise<WordleConfig> {
  try {
    return await apiFetch<WordleConfig>("/offseason/wordle/config");
  } catch (error) {
    normalizeWordleLoadError(error);
  }
}

export async function getWordleDictionary(): Promise<WordleDictionaryResponse> {
  try {
    return await apiFetch<WordleDictionaryResponse>("/offseason/wordle/dictionary");
  } catch (error) {
    normalizeWordleLoadError(error);
  }
}

export async function getWordleLeaderboard(date?: string): Promise<WordleLeaderboardResponse> {
  try {
    if (date) {
      return await apiFetch<WordleLeaderboardResponse>(`/offseason/wordle/leaderboard/${date}`);
    }

    return await apiFetch<WordleLeaderboardResponse>("/offseason/wordle/leaderboard");
  } catch (error) {
    normalizeWordleLoadError(error);
  }
}

export async function getWordleHistory(
  userId?: number | string,
  accessToken?: string,
): Promise<WordleHistoryResponse> {
  try {
    if (userId !== undefined && userId !== null) {
      return await apiFetch<WordleHistoryResponse>(`/offseason/wordle/history/${userId}`);
    }

    return await apiFetch<WordleHistoryResponse>("/offseason/wordle/history", {
      headers: buildAuthHeaders(accessToken),
    });
  } catch (error) {
    normalizeWordleLoadError(error);
  }
}

export async function saveWordleSession(
  payload: SaveWordleSessionPayload,
  accessToken?: string,
): Promise<SaveWordleSessionResponse> {
  try {
    return await apiFetch<SaveWordleSessionResponse>("/offseason/wordle/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(accessToken),
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    normalizeWordleSaveError(error);
  }
}
