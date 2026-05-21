import { useCallback, useEffect, useMemo, useState } from "react";

const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 5;

export type WordleTileStatus = "empty" | "absent" | "present" | "correct";
export type WordleGameStatus = "playing" | "won" | "lost";

export interface WordleTile {
  letter: string;
  status: WordleTileStatus;
}

export type WordleBoard = WordleTile[][];
export type WordleKeyboardStatus = Record<string, WordleTileStatus>;

interface UseWordleOptions {
  answerWords?: string[];
  puzzleDate?: string;
  onGameFinished?: (payload: {
    attemptCount: number;
    gameStatus: Exclude<WordleGameStatus, "playing">;
    puzzleDate: string;
    targetWord: string;
  }) => void;
}

function emptyTile(): WordleTile {
  return { letter: "", status: "empty" };
}

function buildEmptyBoard(): WordleBoard {
  return Array.from({ length: MAX_ATTEMPTS }, () =>
    Array.from({ length: WORD_LENGTH }, () => emptyTile()),
  );
}

function resolvePuzzleDate(puzzleDate?: string): string {
  return puzzleDate || new Date().toISOString().slice(0, 10);
}

function pickDailyWord(puzzleDate?: string, answerWords: string[] = []): string {
  if (answerWords.length === 0) {
    return "";
  }

  const seed = resolvePuzzleDate(puzzleDate);
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) % answerWords.length;
  }

  const index = Math.abs(hash) % answerWords.length;
  return answerWords[index];
}

const statusPriority: Record<WordleTileStatus, number> = {
  empty: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

function evaluateGuess(guess: string, targetWord: string): WordleTile[] {
  const row = guess.split("").map((letter) => ({ letter, status: "absent" as const }));
  const remainingLetters: Record<string, number> = {};

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    const targetLetter = targetWord[index];
    const guessLetter = guess[index];

    if (guessLetter === targetLetter) {
      row[index].status = "correct";
    } else {
      remainingLetters[targetLetter] = (remainingLetters[targetLetter] ?? 0) + 1;
    }
  }

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (row[index].status === "correct") {
      continue;
    }

    const guessLetter = guess[index];
    const count = remainingLetters[guessLetter] ?? 0;

    if (count > 0) {
      row[index].status = "present";
      remainingLetters[guessLetter] = count - 1;
    }
  }

  return row;
}

export function useWordle(options: UseWordleOptions = {}) {
  const onGameFinished = options.onGameFinished;
  const activePuzzleDate = resolvePuzzleDate(options.puzzleDate);
  const answerWords = options.answerWords ?? [];
  const [targetWord, setTargetWord] = useState<string>(() => pickDailyWord(activePuzzleDate, answerWords));
  const [currentGuess, setCurrentGuess] = useState("");
  const [board, setBoard] = useState<WordleBoard>(() => buildEmptyBoard());
  const [attempt, setAttempt] = useState(0);
  const [gameStatus, setGameStatus] = useState<WordleGameStatus>("playing");
  const [message, setMessage] = useState("Guess the 5-letter word");

  useEffect(() => {
    setTargetWord(pickDailyWord(activePuzzleDate, answerWords));
    setCurrentGuess("");
    setBoard(buildEmptyBoard());
    setAttempt(0);
    setGameStatus("playing");
    setMessage("Guess the 5-letter word");
  }, [activePuzzleDate, answerWords]);

  const keyboardStatus = useMemo<WordleKeyboardStatus>(() => {
    const map: WordleKeyboardStatus = {};

    for (const row of board) {
      for (const tile of row) {
        if (!tile.letter || tile.status === "empty") {
          continue;
        }

        const previous = map[tile.letter];
        if (!previous || statusPriority[tile.status] > statusPriority[previous]) {
          map[tile.letter] = tile.status;
        }
      }
    }

    return map;
  }, [board]);

  const handleInput = useCallback(
    (key: string) => {
      if (gameStatus !== "playing") {
        return;
      }

      if (!targetWord) {
        setMessage("Word list unavailable.");
        return;
      }

      if (key === "BACKSPACE" || key === "DEL") {
        setCurrentGuess((previous) => previous.slice(0, -1));
        return;
      }

      if (key === "ENTER") {
        if (currentGuess.length !== WORD_LENGTH) {
          setMessage("You need 5 letters to submit");
          return;
        }

        const evaluatedRow = evaluateGuess(currentGuess, targetWord);

        setBoard((previous) => {
          const next = [...previous];
          next[attempt] = evaluatedRow;
          return next;
        });

        const completedAttemptCount = attempt + 1;

        if (currentGuess === targetWord) {
          setGameStatus("won");
          setMessage("You won. Great job.");
          onGameFinished?.({
            attemptCount: completedAttemptCount,
            gameStatus: "won",
            puzzleDate: activePuzzleDate,
            targetWord,
          });
          return;
        }

        if (attempt + 1 >= MAX_ATTEMPTS) {
          setGameStatus("lost");
          setMessage(`You lost. The word was ${targetWord}.`);
          onGameFinished?.({
            attemptCount: completedAttemptCount,
            gameStatus: "lost",
            puzzleDate: activePuzzleDate,
            targetWord,
          });
          return;
        }

        setAttempt((previous) => previous + 1);
        setCurrentGuess("");
        setMessage("Incorrect word");
        return;
      }

      if (!/^[A-Z]$/.test(key)) {
        return;
      }

      setCurrentGuess((previous) => {
        if (previous.length >= WORD_LENGTH) {
          return previous;
        }

        return `${previous}${key}`;
      });
      setMessage("");
    },
    [activePuzzleDate, attempt, currentGuess, gameStatus, onGameFinished, targetWord],
  );

  const resetGame = useCallback(() => {
    setTargetWord(pickDailyWord(activePuzzleDate, answerWords));
    setCurrentGuess("");
    setBoard(buildEmptyBoard());
    setAttempt(0);
    setGameStatus("playing");
    setMessage("New game started");
  }, [activePuzzleDate, answerWords]);

  const visibleBoard = useMemo(() => {
    return board.map((row, rowIndex) => {
      if (rowIndex !== attempt || gameStatus !== "playing") {
        return row;
      }

      return row.map((tile, tileIndex) => {
        if (tileIndex < currentGuess.length) {
          return { letter: currentGuess[tileIndex], status: "empty" as const };
        }

        return tile;
      });
    });
  }, [attempt, board, currentGuess, gameStatus]);

  return {
    attempt,
    board: visibleBoard,
    gameStatus,
    handleInput,
    keyboardStatus,
    maxAttempts: MAX_ATTEMPTS,
    message,
    puzzleDate: activePuzzleDate,
    resetGame,
    targetWord,
  };
}
