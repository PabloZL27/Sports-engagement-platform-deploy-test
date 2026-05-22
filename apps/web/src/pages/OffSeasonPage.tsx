import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import UnityGameCard from "../components/unity/UnityGameCard";
import WordleGame from "../components/wordle/WordleGame";

const UNITY_BUILD_REVISION = "2026-03-12-bridge-fix-2";
const TAB_BUTTON_BASE_CLASS =
  "cursor-pointer rounded-full px-5 py-3 text-sm font-bold transition-colors";
const TAB_BUTTON_INACTIVE_CLASS = "border border-[#b7c4d1] bg-white text-[#28415a]";
const TAB_BUTTON_ACTIVE_CLASS = "border border-[#0f3d78] bg-[#0f3d78] text-white";

function OffSeasonPage() {
  const [activeTab, setActiveTab] = useState<"unity" | "wordle" | "warroom">("unity");

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <main className="mx-auto w-full max-w-[1400px] p-6">
        <Navbar />

        <section className="mb-9 flex flex-wrap items-start justify-between gap-6 rounded-[28px] bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_50%,#60A5FA_100%)] px-10 py-[42px] text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
          <h1 className="m-0 text-[58px] leading-[1.05] font-black">OFF-SEASON</h1>
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
              Unity
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
              Wordle
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

          </div>

          <div role="tabpanel">
            {activeTab === "unity" ? (
              <UnityGameCard
                unityConfig={{
                  loaderUrl: `/Build/BuildPrototipo3.loader.js?v=${UNITY_BUILD_REVISION}`,
                  dataUrl: `/Build/BuildPrototipo3.data?v=${UNITY_BUILD_REVISION}`,
                  frameworkUrl: `/Build/BuildPrototipo3.framework.js?v=${UNITY_BUILD_REVISION}`,
                  codeUrl: `/Build/BuildPrototipo3.wasm?v=${UNITY_BUILD_REVISION}`,
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
                    Titans Draft Night
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

          </div>
        </section>
      </main>
    </div>
  );
}

export default OffSeasonPage;
