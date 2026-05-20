type DueCountProps = {
  title1?: string;
  content?: number;
};

function GridCard({
  title1 = "Status",
  content = 28,
}: DueCountProps) {
  return (
    <article className="flex min-h-[118px] w-full min-w-0 flex-col justify-center rounded-[18px] bg-[#F7F8FC] px-5 py-4 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-2">
        <p className="m-0 text-[42px] font-black leading-none tracking-[-0.04em] text-[#13294B] md:text-[40px]">
          {content}
        </p>
      </div>
      <footer className="min-w-0 mt-2">
        <h3 className="m-0 w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[20px] font-extrabold uppercase tracking-[0.08em] text-[#98A2B3]">
          {title1}
        </h3>
      </footer>
    </article>
  );
}

export default GridCard;
