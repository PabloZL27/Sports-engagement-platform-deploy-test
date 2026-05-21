import { useState } from "react";
import Navbar from "../components/layout/Navbar";
import UnityGameCard from "../components/unity/UnityGameCard";
import WordleGame from "../components/wordle/WordleGame";

const UNITY_BUILD_REVISION = "2026-03-12-bridge-fix-2";
const TAB_BUTTON_BASE_CLASS =
  "cursor-pointer rounded-full px-5 py-3 text-sm font-bold transition-colors";
const TAB_BUTTON_INACTIVE_CLASS = "border border-[#b7c4d1] bg-white text-[#28415a]";
const TAB_BUTTON_ACTIVE_CLASS = "border border-[#0f3d78] bg-[#0f3d78] text-white";

function OffSeasonPage() {
  const [activeTab, setActiveTab] = useState<"unity" | "wordle">("unity");

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
          </div>
        </section>
      </main>
    </div>
  );
}

export default OffSeasonPage;
