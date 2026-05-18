import { apiFetch } from "./api";

export interface CreateMatchResponse {
  matchId: string;
  inviteCode: string;
  status: string;
  seat: number;
  rejoined?: boolean;
}

export interface WarRoomPlayer {
  seat: number;
  titansCash: number;
  agendaReady: boolean;
}

export interface WarRoomMatch {
  matchId: string;
  inviteCode: string;
  status: string;
  currentRound: number;
  currentGlobalTurn: number;
  activeSeat: number | null;
  you: {
    seat: number;
    titansCash: number;
    agendaSelected: boolean;
  };
  players: WarRoomPlayer[];
}

export interface WarRoomAgenda {
  agendaId: number;
  name: string;
  description: string;
  bonusPoints: number;
}

export interface HandCard {
  id: number;
  cardId: number;
  displayName: string;
  position: string;
  headshotUrl: string | null;
  tier: number;
  acquiredAt: string;
}

export async function createMatch(
  token: string,
): Promise<CreateMatchResponse> {
  return apiFetch<CreateMatchResponse>("/api/war-room/matches", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function joinMatch(
  inviteCode: string,
  token: string,
): Promise<CreateMatchResponse> {
  return apiFetch<CreateMatchResponse>(
    `/api/war-room/matches/join/${inviteCode}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export async function getMatch(
  matchId: string,
  token: string,
): Promise<WarRoomMatch> {
  return apiFetch<WarRoomMatch>(`/api/war-room/matches/${matchId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getAgendas(token: string): Promise<WarRoomAgenda[]> {
  const data = await apiFetch<{ agendas: WarRoomAgenda[] }>(
    "/api/war-room/agendas",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data.agendas;
}

export async function pickAgendas(
  matchId: string,
  agendaId1: number,
  agendaId2: number,
  token: string,
): Promise<void> {
  await apiFetch(`/api/war-room/matches/${matchId}/agendas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ agendaId1, agendaId2 }),
  });
}

export async function getHand(
  matchId: string,
  token: string,
): Promise<HandCard[]> {
  const data = await apiFetch<{ hand: HandCard[] }>(
    `/api/war-room/matches/${matchId}/hand`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data.hand;
}