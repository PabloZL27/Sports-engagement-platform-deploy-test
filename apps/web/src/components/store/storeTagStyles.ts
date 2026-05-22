import type { StoreProduct } from '../../types';

/** Palette: Cerulean #0081AF · Sky Aqua #2DC7FF · Sunlit Clay #EABA6B · French Blue #2B4570 · Taupe #A37A74 · Teal #107E7D · Tech Blue #275DAD */

const TAG_BASE =
  'inline-flex items-center rounded-full border-2 px-3 py-1 text-xs font-bold tracking-wide shadow-sm';

export const RARITY_TAG_CLASS: Record<StoreProduct['rarity'], string> = {
  New: 'border-[#2DC7FF] bg-[#2DC7FF]/25 text-[#005F7A]',
  Popular: 'border-[#EABA6B] bg-[#EABA6B]/35 text-[#7A5200]',
  Limited: 'border-[#2B4570] bg-[#2B4570]/20 text-[#1E3150]',
};

export const TYPE_TAG_CLASS: Record<StoreProduct['type'], string> = {
  Jerseys: 'border-[#0081AF] bg-[#0081AF]/15 text-[#005A78]',
  Headwear: 'border-[#107E7D] bg-[#107E7D]/20 text-[#0A5554]',
  Performance: 'border-[#275DAD] bg-[#275DAD]/20 text-[#1A3F7A]',
  Collectibles: 'border-[#A37A74] bg-[#A37A74]/25 text-[#6B4540]',
};

export function rarityTagClassName(rarity: StoreProduct['rarity']): string {
  return `${TAG_BASE} ${RARITY_TAG_CLASS[rarity] ?? 'border-slate-400 bg-slate-100 text-slate-700'}`;
}

export function typeTagClassName(type: StoreProduct['type']): string {
  return `${TAG_BASE} ${TYPE_TAG_CLASS[type] ?? 'border-slate-400 bg-slate-100 text-slate-700'}`;
}
