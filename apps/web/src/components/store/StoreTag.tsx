import type { StoreProduct } from '../../types';
import { rarityTagClassName, typeTagClassName } from './storeTagStyles';

type StoreTagProps =
  | { label: StoreProduct['rarity']; kind: 'rarity' }
  | { label: StoreProduct['type']; kind: 'type' };

export default function StoreTag({ label, kind }: StoreTagProps) {
  const className =
    kind === 'rarity'
      ? rarityTagClassName(label)
      : typeTagClassName(label);

  return <span className={className}>{label}</span>;
}
