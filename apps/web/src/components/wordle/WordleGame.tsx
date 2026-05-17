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
        <p className="mb-2 text-[12px] font-extrabold tracking-[0.18em] text-[#d62839]">WORDLE</p>
        <h2 className="mb-2 text-[32px] font-bold text-[#0b2a55] max-[900px]:text-[26px]">
          Off-Season Word Challenge
        </h2>
        <p className="m-0 leading-[1.6] text-[#516173]">
          A five-letter mini-game in the same Off-Season section.
        </p>
        <p className={MESSAGE_CLASS}>
          {session?.user?.id
            ? "Your first attempt of the day is saved on the leaderboard with your nickname."
            : "Guest mode: you can play, but your score is not saved until you sign in."}
        </p>
        {loadingMessage ? <p className={MESSAGE_CLASS}>{loadingMessage}</p> : null}
        {saveError ? <p className={MESSAGE_CLASS}>{saveError}</p> : null}
        {isSaving ? <p className={MESSAGE_CLASS}>Saving score...</p> : null}
      </header>

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] items-start gap-5 max-[900px]:grid-cols-1">
        <div className="grid gap-4 rounded-[14px] border border-[#d8dee5] bg-[#f8fafc] p-5">
          {isWordleReady ? (
            <>
              <WordleGrid board={board} />
              <p className={MESSAGE_CLASS}>{message}</p>
              <p className={MESSAGE_CLASS}>
                Daily puzzle: {puzzleDate} · Attempt {Math.min(attempt + 1, maxAttempts)} of {maxAttempts}
              </p>

              <div className="rounded-xl border border-[#d8dee5] bg-[#f5f8fb] p-4 shadow-none">
                <WordleKeyboard keyboardStatus={keyboardStatus} onKeyPress={handleWordleInput} />
              </div>

              {gameStatus !== "playing" ? (
                <p className="m-0 text-center font-bold text-[#0b2a55]">Word: {targetWord}</p>
              ) : null}
            </>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-[#d8dee5] bg-[#f5f8fb] p-6 text-center">
              <p className={MESSAGE_CLASS}>
                {loadingData
                  ? "Loading Wordle..."
                  : "A database error occurred while loading Wordle."}
              </p>
            </div>
          )}
        </div>

        <aside className="grid gap-4">
          <WordleStats
            entries={leaderboard?.entries ?? []}
            errorMessage={loadingMessage}
            isLoading={loadingData}
            puzzleDate={leaderboard?.puzzleDate ?? config?.puzzleDate ?? null}
          />
        </aside>
      </div>
    </section>
  );
}

export default WordleGame;
