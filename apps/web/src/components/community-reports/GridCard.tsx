type GridCardProps = {
  label?: string;
  value?: string | number;
  description?: string;
};

function GridCard({
  label = "Critical",
  value = "0",
  description,
}: GridCardProps) {
  return (
    <article className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-[#f8f9fc] p-4">
      <h3 className="m-0 text-[11px] font-semibold uppercase tracking-[0.8px] text-[#9aa3b2]">
        {label}
      </h3>

      <p className="m-0 text-[28px] font-extrabold leading-none text-[#0d1f3c]">
        {value}
      </p>

      {description ? (
        <div className="text-xs font-semibold leading-tight text-[#9aa3b2]">
          <span>{description}</span>
        </div>
      ) : null}
    </article>
  );
}

export default GridCard;
