import { useCallback, useEffect, useRef, useState } from "react";
import { Auth } from "../../context/AuthContext";
import { useWordle } from "../../hooks/useWordle";
import {
  getWordleConfig,
  getWordleDictionary,
  getWordleLeaderboard,
  saveWordleSession,
} from "../../services/wordleService";
import type {
  WordleConfig,
  WordleDictionaryResponse,
  WordleLeaderboardResponse,
} from "../../types/wordle";
import WordleGrid from "./WordleGrid";
import WordleKeyboard from "./WordleKeyboard";
import WordleStats from "./WordleStats";

const MESSAGE_CLASS = "m-0 min-h-6 text-center font-semibold text-[#4f6173]";

function WordleGame() {
  const { session } = Auth();
  const [config, setConfig] = useState<WordleConfig | null>(null);
  const [dictionary, setDictionary] = useState<WordleDictionaryResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<WordleLeaderboardResponse | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const sessionStartedAtRef = useRef<number | null>(null);

  const loadWordleData = useCallback(async () => {
    setLoadingData(true);
    setLoadingMessage(null);

    try {
      const [wordleConfig, wordleDictionary] = await Promise.all([
        getWordleConfig(),
        getWordleDictionary(),
      ]);

      if (!wordleDictionary.answerWords.length) {
        throw new Error("A database error occurred while loading Wordle.");
      }

      const wordleLeaderboard = await getWordleLeaderboard(wordleConfig.puzzleDate);

      setConfig(wordleConfig);
      setDictionary(wordleDictionary);
      setLeaderboard(wordleLeaderboard);
    } catch (error) {
      console.error("Error loading Wordle data:", error);
      setLoadingMessage(
        error instanceof Error
          ? error.message
          : "A database error occurred while loading Wordle.",
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  const handleGameFinished = useCallback(async ({
    attemptCount,
    puzzleDate,
  }: {
    attemptCount: number;
    gameStatus: "won" | "lost";
    puzzleDate: string;
    targetWord: string;
  }) => {
    if (!config) {
      return;
    }

    if (!session?.user?.id) {
      setIsSaving(false);
      setSaveError(
        "Play as a guest or sign in to save your score on the leaderboard.",
      );
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const playtimeSeconds = Math.max(
        1,
        Math.ceil((Date.now() - (sessionStartedAtRef.current ?? Date.now())) / 1000),
      );
      const response = await saveWordleSession({
        attempt_count: attemptCount,
        playtime_seconds: playtimeSeconds,
        puzzle_date: puzzleDate,
      }, session.access_token);

      setLeaderboard(response.leaderboard);
    } catch (error) {
      console.error("Error saving Wordle session:", error);
      setSaveError(error instanceof Error ? error.message : "Could not save your session.");
    } finally {
      setIsSaving(false);
    }
  }, [config, session]);

  const {
    attempt,
    board,
    gameStatus,
    handleInput,
    keyboardStatus,
    maxAttempts,
    message,
    puzzleDate,
    targetWord,
  } = useWordle({
    answerWords: dictionary?.answerWords ?? [],
    onGameFinished: handleGameFinished,
    puzzleDate: config?.puzzleDate,
  });

  const isWordleReady = Boolean(config && dictionary?.answerWords.length);

  const handleWordleInput = useCallback((key: string) => {
    if (/^[A-Z]$/.test(key) && sessionStartedAtRef.current === null) {
      sessionStartedAtRef.current = Date.now();
    }

    handleInput(key);
  }, [handleInput]);

  useEffect(() => {
    loadWordleData();
  }, [loadWordleData]);

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      try {
        const latestConfig = await getWordleConfig();

        setConfig((currentConfig) => {
          if (currentConfig?.puzzleDate === latestConfig.puzzleDate) {
            return currentConfig;
          }

          sessionStartedAtRef.current = null;
          setLeaderboard(null);
          setSaveError(null);
          setLoadingMessage(null);
          getWordleLeaderboard(latestConfig.puzzleDate)
            .then((nextLeaderboard) => {
              setLeaderboard(nextLeaderboard);
            })
            .catch((error) => {
              console.error("Error refreshing daily Wordle leaderboard:", error);
              setLoadingMessage(
                error instanceof Error
                  ? error.message
                  : "A database error occurred while loading Wordle.",
              );
            });

          return latestConfig;
        });
      } catch (error) {
        console.error("Error checking daily Wordle config:", error);
      }
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Backspace") {
        handleWordleInput("BACKSPACE");
        return;
      }

      if (event.key === "Enter") {
        handleWordleInput("ENTER");
        return;
      }

      if (/^[a-zA-Z]$/.test(event.key)) {
        handleWordleInput(event.key.toUpperCase());
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleWordleInput]);

  return (
    <section className="rounded-2xl border border-[#d8dee5] bg-white p-6">
      <header className="mb-5">
        <p className="mb-2 text-[12px] font-extrabold tracking-[0.18em] text-[#d62839]">TITAN WORDS</p>
        <h2 className="mb-2 text-[32px] font-bold text-[#0b2a55] max-[900px]:text-[26px]">
          Off-Season Titan Words
        </h2>
        <p className="m-0 leading-[1.6] text-[#516173] text-[20px]">
          Test your football knowledge by uncovering hidden words inspired by the world of the Titans and American football.
        </p>
        <p className="m-0 leading-[1.6] text-[#516173] text-[20px]">
           Do you have what it takes to dominate the field and solve the Wordle before you run out of attempts?
        </p>
        {loadingMessage ? <p className={MESSAGE_CLASS}>{loadingMessage}</p> : null}
        {saveError ? <p className={MESSAGE_CLASS}>{saveError}</p> : null}
        {isSaving ? <p className={MESSAGE_CLASS}>Saving score...</p> : null}
      </header>

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] items-start gap-5 max-[900px]:grid-cols-1">
        <div className="grid gap-4 rounded-[14px] border border-[#d8dee5] bg-[#f8fafc]">
          {isWordleReady ? (
            <>
              <div className="flex items-center justify-between gap-4 rounded-t-[14px] bg-[#103d78] p-5 text-white">
                <p className="m-0 min-h-6 text-left text-[25px]">
                  {message} · Attempt {Math.min(attempt + 1, maxAttempts)} of {maxAttempts}
                </p>
                <button
                  type="button"
                  aria-label="How to play"
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#4B92DB] text-[22px] font-black leading-none text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition hover:bg-[#3d7fc2]"
                  onClick={() => setIsInstructionsOpen(true)}
                >
                  ?
                </button>
              </div>

              <div className="p-5 pt-0 pb-0" >
              <WordleGrid  board={board} />
              </div>
              <div className="p-5 pt-0" >
              <div className="rounded-xl border border-[#d8dee5] bg-[#f5f8fb] p-4 shadow-none">
                <WordleKeyboard keyboardStatus={keyboardStatus} onKeyPress={handleWordleInput} />
              </div>

              {gameStatus !== "playing" ? (
                <p className="m-0 pt-4 text-center text-[20px] font-bold text-[#0b2a55]">Word: {targetWord}</p>
              ) : null}
              </div>
            </>
          ) : (
            <div className="p-5">
              <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-[#d8dee5] bg-[#f5f8fb] p-6 text-center">
                <p className={MESSAGE_CLASS}>
                  {loadingData
                    ? "Loading Wordle..."
                    : "A database error occurred while loading Wordle."}
                </p>
              </div>
            </div>
            
          )}
        </div>

        <aside className="grid gap-4">
          <div className="grid gap-1">
            <p className="m-0 min-h-6 text-center text-[20px] font-semibold text-[#4f6173]">
              Daily puzzle: {puzzleDate}
            </p>

            <p className="m-0 min-h-6 text-center text-[20px] font-semibold text-[#4f6173]">
              {session?.user?.id
                ? "Your first attempt of the day is saved on the leaderboard with your nickname."
                : "Guest mode: you can play, but your score is not saved until you sign in."}
            </p>
          </div>
          <WordleStats
            entries={leaderboard?.entries ?? []}
            errorMessage={loadingMessage}
            isLoading={loadingData}
            puzzleDate={leaderboard?.puzzleDate ?? config?.puzzleDate ?? null}
          />
        </aside>
      </div>

      {isInstructionsOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0b1220]/55 p-4 backdrop-blur-[6px]"
          onClick={() => setIsInstructionsOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="wordle-instructions-title"
            className="w-full max-w-[520px] rounded-[22px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.30)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="wordle-instructions-title"
                  className="m-0 text-[36px] font-extrabold leading-tight text-[#0b2a55]"
                >
                  How to play
                </h2>
                <p className="m-0 mt-2 text-[22px] font-medium leading-[1.45] text-[#516173]">
                  Guess the hidden Titans word before you run out of attempts.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close instructions"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#516173] transition hover:bg-[#f1f5f9]"
                onClick={() => setIsInstructionsOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-3 text-[20px] font-semibold leading-[1.45] text-[#334155] m-0 p-4 rounded-[14px] bg-[#f7f8fc]">
              <p>
                1. Type a valid word and press Enter to submit your guess.
              </p>
              <p>
                2. <span className="text-[#2e9c8e]">Green letters</span> are correct and in the right spot.
              </p>
              <p>
                3. <span className="text-[#f9c74f]">Yellow letters</span> are in the word, but in a different spot.
              </p>
              <p>
                4. <span className="text-[#70809a]">Gray letters</span> are not in the hidden word.
              </p>
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-[14px] bg-[#4B92DB] px-5 py-3 text-[22px] font-extrabold text-white transition hover:bg-[#3d7fc2]"
              onClick={() => setIsInstructionsOpen(false)}
            >
              Got it
            </button>
          </section>
        </div>
      )}
    </section>
  );
}

export default WordleGame;
