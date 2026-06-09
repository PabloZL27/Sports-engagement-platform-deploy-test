import type { WordleKeyboardStatus, WordleTileStatus } from "../../hooks/useWordle";

const KEY_ROWS: string[][] = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  ["ENTER", ..."ZXCVBNM".split(""), "DEL"],
];

const keyStatusStyles: Record<WordleTileStatus, string> = {
  correct: "border-[#2a9d8f] bg-[#2a9d8f] text-white",
  present: "border-[#f9c74f] bg-[#f9c74f] text-[#0b2a55]",
  absent: "border-[#dbe4ee] bg-[#dbe4ee] text-[#0b2a55]",
  empty: "border-[#d8dee5] bg-white text-[#0b2a55]",
};

function normalizeKey(key: string): string {
  return key;
}

interface WordleKeyboardProps {
  keyboardStatus: WordleKeyboardStatus;
  onKeyPress: (key: string) => void;
}

function WordleKeyboard({ keyboardStatus, onKeyPress }: WordleKeyboardProps) {
  return (
    <div className="mx-auto w-full max-w-[min(100%,520px)] select-none">
      {KEY_ROWS.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="mb-1.5 flex w-full flex-nowrap items-stretch justify-center gap-[3px] last:mb-0 sm:mb-2 sm:gap-1.5"
        >
          {row.map((key) => {
            const status = keyboardStatus[normalizeKey(key)] ?? "empty";
            const isWide = key === "ENTER" || key === "DEL";

            return (
              <button
                key={key}
                type="button"
                onClick={() => onKeyPress(key)}
                className={[
                  "flex items-center justify-center rounded-md border font-bold transition-colors",
                  "h-11 min-w-0 text-[11px] sm:h-12 sm:rounded-lg sm:text-sm",
                  isWide
                    ? "flex-[1.35] px-1 sm:flex-[1.4] sm:px-2"
                    : "flex-1 max-w-[2.75rem] sm:max-w-[3.25rem]",
                  keyStatusStyles[status],
                ].join(" ")}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default WordleKeyboard;
