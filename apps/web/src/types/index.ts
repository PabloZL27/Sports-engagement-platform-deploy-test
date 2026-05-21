export type MatchStatus = "LIVE" | "FINISHED" | "UPCOMING";

export interface Match {
  id: number;
  status: MatchStatus;
  opponent: string;
  date: string;
  venue: string;
  resultLabel: string;
  resultValue: string;
}

export interface ApiMatch {
  match_id: number;
  name?: string;
  short_name?: string;
  status?: string;
  home_team?: string;
  away_team?: string;
  start_time?: string;
  venue_name?: string;
  venue_city?: string;
  week?: string;
  week_num?: number;
  home_score?: number | null;
  away_score?: number | null;
  demo_eligible?: boolean;
  demo_active?: boolean;
  demo_clock_label?: string;
}

export interface StoreProduct {
  id: string;
  name: string;
  description?: string;
  default_price: string | { id: string; unit_amount: number | null; currency?: string };
  images?: string[];
  
  rarity: 'New' | 'Popular' | 'Limited';
  type: 'Jerseys' | 'Headwear' | 'Performance' | 'Collectibles';
  sizes?: string[];  
  price_amount: number; 
}

export interface CartItem {
  product: StoreProduct;
  quantity: number;
  selectedSize?: string;
}

export interface Profile {
  first_name: string;
  last_name: string;
  username: string;
  country: string;
  user_id: number | string;
  account_id: number | string;
  avatar_url: string;
  role: string;
}

export type ProfileResponse = {
  status: string;
  profile: Profile;
};

export interface InsertNewUserRequest {
  user_id: string, 
  country: string,
  first_name: string, 
  last_name: string, 
  username: string,
  avatar_url: string 
}

// ─── Cards / Team ────────────────────────────────────────────

export type CardRarity = "common" | "rare" | "elite" | "titan";

export interface RosterCard {
  card_id: number;
  card_image: string | null;
  rarity: CardRarity;
  athlete_id: number;
  espn_athlete_id: number;
  display_name: string;
  position: string;
  /** Puede ser null si ESPN no envía dorsal (p. ej. práctica / sin asignar). */
  jersey_num: number | null;
  headshot_url: string | null;
  age: number;
  weight: number;
  height: number;
  unlocked: boolean;
}

export interface AthleteDetail extends RosterCard {
  debut_year: number | null;
  passes: number | null;
  p_yards: number | null;
  r_yards: number | null;
  interceptions: number | null;
  touchdowns: number | null;
  games_played: number | null;
}

export interface CollectionStats {
  total_cards: number;
  unlocked_cards: number;
  progress_percentage: number;
  packs_remaining: number;
}

export interface PackOpenResult {
  cards_unlocked: Array<{
    card_id: number;
    rarity: CardRarity;
    display_name: string;
    position: string;
    jersey_num: number | null;
  }>;
  packs_remaining: number;
}

export type PackOpeningStatus = "NONE" | "OPENING" | "READY";

// ─── Admin Store ─────────────────────────────────────────────

export interface AdminVariant {
  priceId: string;
  size: string | null;
  inventory_count: number;
  sku: string | null;
  unit_amount: number; // en centavos
}

export interface AdminProduct {
  id: string;
  name: string;
  category: string | null;
  product_type: "clothing" | "footwear" | "no_size" | null;
  rarity: string | null;
  status: "active" | "inactive";
  image: string | null;
  totalStock: number;
  variants: AdminVariant[];
}

export interface PackOpeningState {
  status: PackOpeningStatus;
  /** ISO timestamp (server) when pack becomes claimable. */
  ready_at?: string;
  /** Seconds until ready (0 when READY). */
  seconds_remaining?: number;
}
