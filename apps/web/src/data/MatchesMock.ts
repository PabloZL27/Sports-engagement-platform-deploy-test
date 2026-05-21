import type { Match } from "../types";

const matchesMock: Match[] = [
  {
    id: 1,
    status: "FINISHED",
    opponent: "COLTS",
    date: "Sept 15, 2026",
    venue: "Nissan Stadium",
    resultLabel: "RESULT",
    resultValue: "W 24-17",
  },
  {
    id: 2,
    status: "LIVE",
    opponent: "CHIEFS",
    date: "Sept 22, 2026",
    venue: "EverBank Stadium",
    resultLabel: "CURRENT SCORE",
    resultValue: "24-17",
  },
  {
    id: 3,
    status: "UPCOMING",
    opponent: "TEXANS",
    date: "Sept 29, 2026",
    venue: "Nissan Stadium",
    resultLabel: "COUNTDOWN",
    resultValue: "Starts in 7 days",
  },
  {
    id: 4,
    status: "UPCOMING",
    opponent: "JAGUARS",
    date: "Oct 06, 2026",
    venue: "Arrowhead Stadium",
    resultLabel: "COUNTDOWN",
    resultValue: "Starts in 14 days",
  },
  {
    id: 5,
    status: "UPCOMING",
    opponent: "BILLS",
    date: "Oct 13, 2026",
    venue: "Nissan Stadium",
    resultLabel: "COUNTDOWN",
    resultValue: "Starts in 21 days",
  },
  {
    id: 6,
    status: "UPCOMING",
    opponent: "DOLPHINS",
    date: "Oct 20, 2026",
    venue: "Hard Rock Stadium",
    resultLabel: "COUNTDOWN",
    resultValue: "Starts in 28 days",
  },
];

export default matchesMock;
