export interface HistoryHero {
  title: string;
  subtitle: string;
}

export interface HistoryStat {
  id: string;
  value: string;
  label: string;
  sublabel?: string;
}

export interface TimelineEvent {
  id: string;
  year: string;
  title: string;
  description: string;
  fullStory: string;
  significance: string;
  image: string;
  imageReferenceUrl?: string;
  alt: string;
  linkLabel: string;
  externalUrl: string;
  sourceLabel?: string;
  facts?: string[];
  quote?: string;
  sourceNote?: string;
}

export interface LegendaryPlayerStat {
  label: string;
  value: string;
}

export interface LegendaryPlayer {
  id: string;
  name: string;
  position: string;
  era: string;
  subtitle: string;
  shortDescription: string;
  bio: string;
  stats: LegendaryPlayerStat[];
  achievements: string[];
  imageUrl?: string;
  cardImagePositionClass?: string;
}

export interface ClassicMatch {
  id: string;
  title: string;
  season: string;
  opponent: string;
  score: string;
  description: string;
  youtubeUrl: string;
  imageUrl?: string;
  buttonLabel: string;
}

export interface HistoryPageData {
  hero: HistoryHero;
  historyStats: HistoryStat[];
  timelineEvents: TimelineEvent[];
  legendaryPlayers: LegendaryPlayer[];
  classicMatches: ClassicMatch[];
}
