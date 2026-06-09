import { useState } from "react";
import { Link } from "react-router-dom";
import TitansTossPanel from "../components/titansToss/TitansTossPanel";
import WordleGame from "../components/wordle/WordleGame";
import Tetris from "../components/tetris/coreTetris";
import type { TetrisLeaderboardResponse } from "../services/tetrisService";

const UNITY_BUILD_REVISION = "2026-05-26-testwebgl-1";
const TAB_BUTTON_BASE_CLASS =
  "cursor-pointer rounded-full px-5 py-3 text-sm font-bold transition-colors";
const TAB_BUTTON_INACTIVE_CLASS = "border border-[#b7c4d1] bg-white text-[#28415a]";
const TAB_BUTTON_ACTIVE_CLASS = "border border-[#0f3d78] bg-[#0f3d78] text-white";

function OffSeasonPage() {
  const [activeTab, setActiveTab] = useState<"unity" | "wordle" | "warroom" | "tetris">("unity");
  const [tetrisLeaderboard, setTetrisLeaderboard] = useState<TetrisLeaderboardResponse | null>(null);
  const [isTetrisLeaderboardLoading, setIsTetrisLeaderboardLoading] = useState(false);
  const [tetrisStatusMessage, setTetrisStatusMessage] = useState<string | null>(null);
  const [isTetrisInstructionsOpen, setIsTetrisInstructionsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <main className="page-main">
        <section className="hero-section">
          <h1 className="hero-title">OFF-SEASON</h1>
        </section>

        <section className="grid gap-5">
          <div className="flex flex-wrap gap-3" role="tablist" aria-label="Offseason games">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "unity"}
              className={`${TAB_BUTTON_BASE_CLASS} ${
                activeTab === "unity" ? TAB_BUTTON_ACTIVE_CLASS : TAB_BUTTON_INACTIVE_CLASS
              }`}
              onClick={() => setActiveTab("unity")}
            >
              Titans Toss
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "wordle"}
              className={`${TAB_BUTTON_BASE_CLASS} ${
                activeTab === "wordle" ? TAB_BUTTON_ACTIVE_CLASS : TAB_BUTTON_INACTIVE_CLASS
              }`}
              onClick={() => setActiveTab("wordle")}
            >
              Titans Words
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "warroom"}
              className={`${TAB_BUTTON_BASE_CLASS} ${
                activeTab === "warroom" ? TAB_BUTTON_ACTIVE_CLASS : TAB_BUTTON_INACTIVE_CLASS
              }`}
              onClick={() => setActiveTab("warroom")}
            >
              War Room
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "tetris"}
              className={`${TAB_BUTTON_BASE_CLASS} ${
                activeTab === "tetris" ? TAB_BUTTON_ACTIVE_CLASS : TAB_BUTTON_INACTIVE_CLASS
              }`}
              onClick={() => setActiveTab("tetris")}
            >
              Titans Cubic
            </button>

          </div>

          <div role="tabpanel">
            {activeTab === "unity" ? (
              <TitansTossPanel
                unityConfig={{
                  loaderUrl: `/Build/TestWebGL.loader.js?v=${UNITY_BUILD_REVISION}`,
                  dataUrl: `/Build/TestWebGL.data?v=${UNITY_BUILD_REVISION}`,
                  frameworkUrl: `/Build/TestWebGL.framework.js?v=${UNITY_BUILD_REVISION}`,
                  codeUrl: `/Build/TestWebGL.wasm?v=${UNITY_BUILD_REVISION}`,
                }}
              />
            ) : null}

            {activeTab === "wordle" ? <WordleGame /> : null}

            {activeTab === "warroom" ? (
              <section className="rounded-2xl border border-[#d8dee5] bg-white p-6 shadow-[0_24px_50px_rgba(15,39,70,0.08)]">
                <header className="mb-5">
                  <p className="mb-2 text-[12px] font-extrabold tracking-[0.18em] text-[#d62839]">
                    WAR ROOM
                  </p>
                  <h2 className="mb-2 text-[32px] font-bold text-[#0b2a55] max-[900px]:text-[26px]">
                    Titans War Room
                  </h2>
                  <p className="m-0 max-w-3xl leading-[1.6] text-[#516173]">
                    Real-time board game for up to 3 GMs: agendas, trades, Breaking
                    News, and player cards from your Titans roster.
                  </p>
                </header>

                <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(280px,0.85fr)] items-stretch gap-5 max-[900px]:grid-cols-1">
                  <div className="flex flex-col items-center justify-center gap-5 rounded-[14px] border border-[#d8dee5] bg-[#f8fafc] px-8 py-12 text-center">
                    <p className="m-0 text-center text-sm font-semibold text-[#4f6173]">
                      Create a room or join with an invite code. You need to be signed
                      in to play.
                    </p>
                    <Link
                      to="/war-room"
                      className="rounded-xl bg-[#0f3d78] px-10 py-4 text-lg font-bold text-white transition-colors hover:bg-[#0B2A55]"
                    >
                      Enter War Room
                    </Link>
                  </div>

                  <aside className="flex flex-col gap-4 rounded-[14px] border border-[#d8dee5] bg-[#f8fafc] p-5">
                    <p className="m-0 text-[12px] font-extrabold tracking-[0.18em] text-[#d62839]">
                      QUICK START
                    </p>
                    <h3 className="m-0 text-lg font-bold text-[#0b2a55]">How it works</h3>
                    <ul className="m-0 list-none space-y-3 p-0 text-sm leading-snug text-[#516173]">
                      <li className="border-l-2 border-[#0f3d78]/35 pl-4">
                        One host creates a War Room and shares the 6-letter code with
                        two friends.
                      </li>
                      <li className="border-l-2 border-[#0f3d78]/35 pl-4">
                        Each GM picks secret agendas before the draft board opens.
                      </li>
                      <li className="border-l-2 border-[#0f3d78]/35 pl-4">
                        Play uses the same Titans player cards as the rest of Titans
                        Crew.
                      </li>
                    </ul>
                  </aside>
                </div>
              </section>
            ) : null}

            {activeTab === "tetris" ? (
              <section className="rounded-2xl border border-[#d8dee5] bg-white p-6 shadow-[0_24px_50px_rgba(15,39,70,0.08)]">
                <header className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-2 text-[12px] font-extrabold tracking-[0.18em] text-[#d62839]">TITANS CUBIC</p>
                    <h2 className="mb-2 text-[32px] font-bold text-[#0b2a55] max-[900px]:text-[26px]">Titans Cubic Journey</h2>
                    <p className="m-0 max-w-3xl leading-[1.6] text-[#516173]">Stack, rotate, and clear lines as long as you can. Test your reflexes, strategy, and speed in this Titans Cubic challenge only true Titans can survive!</p>
                  </div>
                  <button
                    type="button"
                    aria-label="How to play Titans Cubic"
                    className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#4B92DB] text-[22px] font-black leading-none text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition hover:bg-[#3d7fc2]"
                    onClick={() => setIsTetrisInstructionsOpen(true)}
                  >
                    ?
                  </button>
                </header>

                <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(280px,0.85fr)] items-start gap-5 max-[900px]:grid-cols-1">
                  <div className="flex flex-col items-center justify-center gap-5 rounded-[14px] border border-[#d8dee5] bg-[#f8fafc] overflow-hidden">
                    <Tetris
                      onLeaderboardChange={setTetrisLeaderboard}
                      onLeaderboardLoadingChange={setIsTetrisLeaderboardLoading}
                      onStatusMessageChange={setTetrisStatusMessage}
                    />
                  </div>

                  <aside className="grid gap-4">
                    <section className="flex flex-col justify-start gap-5 rounded-[14px] border border-[#d8dee5] bg-[#f5f8fb] p-6 text-[#0b2a55]">
                      <div className="flex flex-col gap-1.5">
                        <h3 className="m-0 text-[32px] font-extrabold">Leaderboard</h3>
                        <p className="m-0 text-[20px] leading-[1.5] text-[#49617f]">
                          Top 5 scores overall.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {isTetrisLeaderboardLoading ? (
                          <p className="m-0 text-[18px] leading-[1.5] text-[#49617f]">Loading leaderboard...</p>
                        ) : null}
                        {tetrisStatusMessage ? (
                          <p className="m-0 text-[18px] leading-[1.5] text-[#49617f]">{tetrisStatusMessage}</p>
                        ) : null}
                        {!isTetrisLeaderboardLoading && !tetrisLeaderboard?.entries.length ? (
                          <p className="m-0 text-[18px] leading-[1.5] text-[#A5ACAF]">No saved scores yet.</p>
                        ) : null}
                        {!isTetrisLeaderboardLoading && tetrisLeaderboard?.entries.length ? (
                          <>
                            {tetrisLeaderboard.entries.slice(0, 5).map((entry) => (
                              <article
                                key={entry.leaderboardId}
                                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-[14px] border border-[#d6deea] bg-white px-4 py-3.5 shadow-[0_10px_24px_rgba(15,61,120,0.08)]"
                              >
                                <div className="inline-flex h-12 min-w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f3d78,#2b6cb0)] text-base font-extrabold text-white">
                                  #{entry.rank}
                                </div>

                                <div className="flex min-w-0 flex-col gap-1">
                                  <p className="m-0 truncate text-base font-extrabold">{entry.playerName}</p>
                                  <p className="m-0 text-[13px] font-semibold text-[#58718d]">
                                    {entry.levelReached} level &bull; {entry.linesCleared} lines
                                  </p>
                                </div>

                                <p className="m-0 text-base font-extrabold text-[#0b2a55]">{entry.score}</p>
                              </article>
                            ))}
                          </>
                        ) : null}
                      </div>
                    </section>
                  </aside>
                </div>

                {isTetrisInstructionsOpen && (
                  <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0b1220]/55 p-4 backdrop-blur-[6px]"
                    onClick={() => setIsTetrisInstructionsOpen(false)}
                  >
                    <section
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="tetris-instructions-title"
                      className="w-full max-w-[520px] rounded-[22px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.30)]"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2
                            id="tetris-instructions-title"
                            className="m-0 text-[36px] font-extrabold leading-tight text-[#0b2a55]"
                          >
                            How to play
                          </h2>
                          <p className="m-0 mt-2 text-[22px] font-medium leading-[1.45] text-[#516173]">
                            Stack the falling blocks and clear lines before the board fills up.
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Close instructions"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#516173] transition hover:bg-[#f1f5f9]"
                          onClick={() => setIsTetrisInstructionsOpen(false)}
                        >
                          ×
                        </button>
                      </div>

                      <div className="mt-5 grid gap-3 rounded-[14px] bg-[#f7f8fc] p-4 text-[20px] font-semibold leading-[1.45] text-[#334155]">
                        <p className="m-0">1. Use arrow keys to move pieces left, right, and down.</p>
                        <p className="m-0">2. Press ArrowUp to rotate the falling piece.</p>
                        <p className="m-0">3. Press Space to drop the piece instantly.</p>
                        <p className="m-0">4. Clear lines to score points and level up.</p>
                      </div>

                      <button
                        type="button"
                        className="mt-5 w-full rounded-[14px] bg-[#4B92DB] px-5 py-3 text-[22px] font-extrabold text-white transition hover:bg-[#3d7fc2]"
                        onClick={() => setIsTetrisInstructionsOpen(false)}
                      >
                        Got it
                      </button>
                    </section>
                  </div>
                )}
              </section>
            ) : null}

          </div>
        </section>
      </main>
    </div>
  );
}

export default OffSeasonPage;
