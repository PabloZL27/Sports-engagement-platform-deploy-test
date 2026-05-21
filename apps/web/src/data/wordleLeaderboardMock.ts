export interface WordleLeaderboardEntry {
  id: string;
  username: string;
  wins: number;
  streak: number;
  averageGuesses: number;
}

export const wordleLeaderboardMock: WordleLeaderboardEntry[] = [
  {
    id: "1",
    username: "TitanRush",
    wins: 42,
    streak: 11,
    averageGuesses: 3.2,
  },
  {
    id: "2",
    username: "BlueBlitz",
    wins: 39,
    streak: 9,
    averageGuesses: 3.4,
  },
  {
    id: "3",
    username: "FieldGeneral",
    wins: 37,
    streak: 8,
    averageGuesses: 3.6,
  },
  {
    id: "4",
    username: "GridironAce",
    wins: 34,
    streak: 6,
    averageGuesses: 3.8,
  },
  {
    id: "5",
    username: "HuddleHero",
    wins: 31,
    streak: 5,
    averageGuesses: 4.0,
  },
];
