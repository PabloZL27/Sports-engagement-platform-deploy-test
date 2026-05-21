interface ProductCounterProps {
  count: number;
  totalCount: number;
}

export default function ProductCounter({ count, totalCount }: ProductCounterProps) {
  return (
    <div className="text-sm text-gray-600">
      <span className="font-semibold text-[#0f3d78]">{count}</span>
      {count !== totalCount && ` de ${totalCount}`} Items Found 
    </div>
  );
}