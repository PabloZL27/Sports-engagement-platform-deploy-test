import type { WordleBoard, WordleTileStatus } from "../../hooks/useWordle";

const statusStyles: Record<WordleTileStatus, string> = {
  correct: "border-[#2a9d8f] bg-[#2a9d8f] text-white",
  present: "border-[#f9c74f] bg-[#f9c74f] text-[#0b2a55]",
  absent: "border-[#dbe4ee] bg-[#dbe4ee] text-[#0b2a55]",
  empty: "border-[#d8dee5] bg-[#f8fafc] text-[#0b2a55]",
};

interface WordleGridProps {
  board: WordleBoard;
}

function WordleGrid({ board }: WordleGridProps) {
  return (
    <div className="grid gap-2.5 rounded-xl border border-[#d8dee5] bg-[#f5f8fb] p-4">
      {board.map((row, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid grid-cols-[repeat(5,minmax(56px,72px))] justify-center gap-2.5 max-[900px]:grid-cols-[repeat(5,minmax(48px,1fr))]"
        >
          {row.map((tile, tileIndex) => (
            <div
              key={`tile-${rowIndex}-${tileIndex}`}
              className={`flex aspect-square items-center justify-center rounded-[10px] border text-[22px] font-extrabold ${statusStyles[tile.status]}`}
            >
              {tile.letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default WordleGrid;
