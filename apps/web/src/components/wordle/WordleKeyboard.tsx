import type { WordleKeyboardStatus, WordleTileStatus } from "../../hooks/useWordle";

const rows = ["QWERTYUIOP", "ASDFGHJKL", "ENTERZXCVBNMDEL"];
const KEY_BASE_CLASS =
  "h-12 min-w-11 cursor-pointer rounded-lg font-bold transition-colors max-[900px]:h-11 max-[900px]:min-w-9 max-[900px]:text-xs";

const keyStatusStyles: Record<WordleTileStatus, string> = {
  correct: "border-[#2a9d8f] bg-[#2a9d8f] text-white",
  present: "border-[#f9c74f] bg-[#f9c74f] text-[#0b2a55]",
  absent: "border-[#dbe4ee] bg-[#dbe4ee] text-[#0b2a55]",
  empty: "border-[#d8dee5] bg-white text-[#0b2a55]",
};

function normalizeKey(key: string): string {
  if (key === "DEL") {
    return "DEL";
  }

  if (key === "ENTER") {
    return "ENTER";
  }

  return key;
}

function splitRow(row: string): string[] {
  if (row.includes("ENTER")) {
    return ["ENTER", ..."ZXCVBNM".split(""), "DEL"];
  }

  return row.split("");
}

interface WordleKeyboardProps {
  keyboardStatus: WordleKeyboardStatus;
  onKeyPress: (key: string) => void;
}

function WordleKeyboard({ keyboardStatus, onKeyPress }: WordleKeyboardProps) {
  return (
    <div className="grid gap-2.5">
      {rows.map((row) => (
        <div key={row} className="flex flex-wrap justify-center gap-2">
          {splitRow(row).map((key) => {
            const status = keyboardStatus[normalizeKey(key)] ?? "empty";
            const isWide = key === "ENTER" || key === "DEL";

            return (
              <button
                key={key}
                type="button"
                onClick={() => onKeyPress(key)}
                className={`border ${KEY_BASE_CLASS} ${keyStatusStyles[status]} ${
                  isWide ? "min-w-20 max-[900px]:min-w-16" : ""
                }`}
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
