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
    <article className="flex min-h-[168px] w-full min-w-0 flex-col justify-between rounded-[18px] bg-[#F7F8FC] px-5 pb-0 pt-5 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
      <header className="min-w-0">
        <h3 className="m-0 w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[17px] font-extrabold uppercase tracking-[0.08em] text-[#98A2B3]">
          {title}
        </h3>
      </header>

      <div className="flex flex-1 -translate-y-2 flex-col justify-center gap-3">
        <p className="m-0 text-[42px] font-black leading-none tracking-[-0.04em] text-[#13294B] md:text-[48px]">
          {value}
        </p>

        <div className={`text-[17px] font-bold leading-tight ${trendColor}`}>
          <span>{changeLabel}</span>
        </div>
      </div>
    </article>
  );
}

export default StatsCard;
