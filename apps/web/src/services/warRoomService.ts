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
  isReady: boolean;
}

export interface MyAgenda {
  agendaId: number;
  name: string;
  description: string;
  bonusPoints: number;
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
    isReady: boolean;
    agendaSelected: boolean;
    agendas: MyAgenda[];
  };
  players: WarRoomPlayer[];
  pendingTradeForYou: TradeProposal | null;
  negotiateAttemptsLeft: number;
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

export interface NewsCard {
  cardId: number;
  headline: string;
  story: string;
  cashEffect: number;
}

export interface NewsActionResult {
  card: NewsCard;
  newTitansCash: number;
  cashDelta: number;
  activeSeat: number | null;
  currentRound: number;
  gameEnded: boolean;
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

export async function drawNews(
  matchId: string,
  token: string,
): Promise<NewsActionResult> {
  return apiFetch<NewsActionResult>(
    `/api/war-room/matches/${matchId}/action/news`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export async function startMatch(
    matchId: string,
    token: string,
  ): Promise<void> {
    await apiFetch(`/api/war-room/matches/${matchId}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  }

  export interface ScoutCard {
    poolId: number;
    cardId: number;
    displayName: string;
    position: string;
    headshotUrl: string | null;
    tier: number;
  }
  
  export interface BuyResult {
    ok: boolean;
    newTitansCash: number;
    activeSeat: number | null;
    currentRound: number;
    gameEnded: boolean;
  }
  
  export async function scoutPlayers(
    matchId: string,
    token: string,
  ): Promise<ScoutCard[]> {
    const data = await apiFetch<{ cards: ScoutCard[] }>(
      `/api/war-room/matches/${matchId}/action/buy/scout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return data.cards;
  }
  
  export async function pickPlayer(
    matchId: string,
    poolId: number,
    discardHandId: number | null,
    token: string,
  ): Promise<BuyResult> {
    return apiFetch<BuyResult>(
      `/api/war-room/matches/${matchId}/action/buy/pick`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          poolId,
          ...(discardHandId !== null ? { discardHandId } : {}),
        }),
      },
    );
  }
  
  export async function forfeitBuy(
    matchId: string,
    token: string,
  ): Promise<BuyResult> {
    return apiFetch<BuyResult>(
      `/api/war-room/matches/${matchId}/action/buy/forfeit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
  }

  export interface RivalCard {
    handId: number;
    cardId: number;
    displayName: string;
    position: string;
    headshotUrl: string | null;
    tier: number;
  }
  
  export interface TradeCard {
    handId: number;
    name: string;
    position: string;
    headshotUrl: string | null;
    tier: number;
  }

  export interface TradeProposal {
    proposalId: string;
    fromSeat: number;
    cashOffer: number;
    expiresAt: string;
    offerCard: TradeCard;
    requestCard: TradeCard;
  }
  
  export interface AgendaResult {
    name: string;
    description: string;
    bonusPoints: number;
    conditionType: string;
    achieved: boolean;
  }
  
  export interface PlayerResult {
    seat: number;
    handTotal: number;
    agendaBonus: number;
    totalScore: number;
    tiers: number[];
    titansCash: number;
    agendas: AgendaResult[];
  }
  
  export interface MatchResults {
    results: PlayerResult[];
    winnerSeat: number;
  }
  
  export async function passAction(
    matchId: string,
    token: string,
  ): Promise<BuyResult> {
    return apiFetch<BuyResult>(`/api/war-room/matches/${matchId}/action/pass`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  }
  
  export async function getRivalHand(
    matchId: string,
    targetSeat: number,
    token: string,
  ): Promise<RivalCard[]> {
    const data = await apiFetch<{ hand: RivalCard[] }>(
      `/api/war-room/matches/${matchId}/rival-hand/${targetSeat}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data.hand;
  }
  
  export async function proposeTrade(
    matchId: string,
    toSeat: number,
    offerHandId: number,
    requestHandId: number,
    cashOffer: number,
    token: string,
  ): Promise<{ ok: boolean; proposalId: string; attemptsLeft: number }> {
    return apiFetch(
      `/api/war-room/matches/${matchId}/action/trade/propose`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toSeat, offerHandId, requestHandId, cashOffer }),
      },
    );
  }
  
  export async function respondTrade(
    matchId: string,
    proposalId: string,
    accept: boolean,
    token: string,
  ): Promise<{ ok: boolean; accepted: boolean; activeSeat?: number; currentRound?: number; gameEnded?: boolean }> {
    return apiFetch(
      `/api/war-room/matches/${matchId}/action/trade/respond`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ proposalId, accept }),
      },
    );
  }
  
  export async function getResults(
    matchId: string,
    token: string,
  ): Promise<MatchResults> {
    return apiFetch<MatchResults>(`/api/war-room/matches/${matchId}/results`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  export async function markReady(
    matchId: string,
    ready: boolean,
    token: string,
  ): Promise<{ ok: boolean }> {
    return apiFetch(`/api/war-room/matches/${matchId}/ready`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ready }),
    });
  }