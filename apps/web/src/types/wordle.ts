export interface WordleConfig {
  gameId: number;
  gameName: string;
  userId: number | null;
  puzzleDate: string;
  maxAttempts: number;
  wordLength: number;
}

export interface WordleDictionaryResponse {
  answerWords: string[];
  generalWords: string[];
}

export interface WordleLeaderboardEntry {
  leaderboardId: number;
  gameId: number;
  userId: number | string;
  playerName: string;
  score: number;
  rank: number;
  attemptCount: number;
  playtimeSeconds: number;
  puzzleDate: string;
}

export interface WordleLeaderboardResponse {
  gameId: number;
  puzzleDate: string;
  entries: WordleLeaderboardEntry[];
}

export interface WordleSession {
  sessionId: number;
  gameId: number;
  userId: number | string;
  score: number;
  playtimeSeconds: number;
  playedAt: string;
  attemptCount: number;
  puzzleDate: string;
}

export interface WordleHistoryResponse {
  gameId: number;
  userId: number | string;
  sessions: WordleSession[];
}

export interface SaveWordleSessionPayload {
  user_id?: number | string;
  attempt_count: number;
  playtime_seconds: number;
  played_at?: string;
  puzzle_date?: string;
}

export interface SaveWordleSessionResponse {
  session: WordleSession;
  leaderboard: WordleLeaderboardResponse;
}
