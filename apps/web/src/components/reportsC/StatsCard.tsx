export type StatsTrend = "green" | "red" | "gray";

type StatsCardProps = {
  title?: string;
  value?: string | number;
  changeLabel?: string;
  trend?: StatsTrend;
};

function StatsCard({
  title = "ACTIVE REPORTS",
  value = "9",
  changeLabel = "+3 unreviewed",
  trend = "red",
}: StatsCardProps) {
  const trendColor =
    trend === "red"
      ? "text-[#DC2626]"
      : trend === "gray"
        ? "text-[#64748B]"
        : "text-[#22A95A]";

  return (
    <article className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-[#f8f9fc] p-4">
      <h3 className="m-0 text-[11px] font-semibold uppercase tracking-[0.8px] text-[#9aa3b2]">
        {title}
      </h3>

      <p className="m-0 text-[28px] font-extrabold leading-none text-[#0d1f3c]">
        {value}
      </p>

      <div className={`text-xs font-semibold leading-tight ${trendColor}`}>
        <span>{changeLabel}</span>
      </div>
    </article>
  );
}

export default StatsCard;
