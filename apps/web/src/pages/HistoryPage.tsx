import { useEffect, useState } from "react";
import ClassicMatchCard from "../components/history/ClassicMatchCard";
import LegendaryPlayerCard from "../components/history/LegendaryPlayerCard";
import LegendaryPlayerModal from "../components/history/LegendaryPlayerModal";
import TimelineItem from "../components/history/TimelineItem";
import TimelineStoryModal from "../components/history/TimelineStoryModal";
import Navbar from "../components/layout/Navbar";
import { getHistoryPageData } from "../services/historyService";
import type { HistoryPageData, LegendaryPlayer, TimelineEvent } from "../types/history";

function HistoryPage() {
  const [historyData, setHistoryData] = useState<HistoryPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [selectedTimelineEvent, setSelectedTimelineEvent] =
    useState<TimelineEvent | null>(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] =
    useState<LegendaryPlayer | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);

  useEffect(() => {
    async function loadHistoryData() {
      try {
        setLoading(true);
        setError("");
        const response = await getHistoryPageData();
        setHistoryData(response);
      } catch (loadError) {
        console.error("Error loading history page:", loadError);
        setError("Could not load team history.");
      } finally {
        setLoading(false);
      }
    }

    loadHistoryData();
  }, []);

  const historyStats = historyData?.historyStats ?? [];
  const hero = historyData?.hero;
  const timelineEvents = historyData?.timelineEvents ?? [];
  const legendaryPlayers = historyData?.legendaryPlayers ?? [];
  const classicMatches = historyData?.classicMatches ?? [];

  const visiblePlayers = legendaryPlayers.slice(0, 6);
  const visibleMatches = showAllMatches
    ? classicMatches
    : classicMatches.slice(0, 4);

  function handleOpenTimelineStory(event: TimelineEvent) {
    setSelectedTimelineEvent(event);
    setIsTimelineModalOpen(true);
  }

  function handleCloseTimelineStory() {
    setIsTimelineModalOpen(false);
    setSelectedTimelineEvent(null);
  }

  function handleOpenPlayerProfile(player: LegendaryPlayer) {
    setSelectedPlayer(player);
    setIsPlayerModalOpen(true);
  }

  function handleClosePlayerProfile() {
    setIsPlayerModalOpen(false);
    setSelectedPlayer(null);
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <main className="mx-auto w-full max-w-[1400px] p-6">
        <Navbar />

        <section className="mb-6 rounded-3xl border border-[#e6e9ef] bg-white px-8 py-[30px] shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
          <div className="max-w-[760px]">
            <h1 className="mb-2.5 text-[42px] font-bold leading-[1.08] text-[#0c2340]">
              {hero?.title || "History of the Tennessee Titans"}
            </h1>
            <p className="text-base leading-[1.6] text-slate-500">
              {hero?.subtitle || "From the Houston Oilers to Tennessee Titans -- A legacy of excellence"}
            </p>
          </div>
        </section>

        {error ? (
          <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {error}
          </section>
        ) : null}

        <section className="mb-6">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[14px]">
            {loading && historyStats.length === 0 ? (
              <article className="col-span-full rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                Loading team history...
              </article>
            ) : historyStats.map((stat) => (
              <article
                key={stat.id}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-[14px] py-5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <span className="text-[34px] font-extrabold leading-none text-[#0c2340]">
                  {stat.value}
                </span>
                <span className="max-w-[120px] text-[13px] leading-[1.45] text-slate-500">
                  {stat.label}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-2 mb-6 overflow-hidden rounded-[32px] border border-[#e6e9ef] bg-white px-5 py-8 shadow-[0_12px_30px_rgba(15,23,42,0.10)] md:px-8 md:py-10 lg:px-10 lg:py-12">
          <div className="mb-8 max-w-[820px]">
            <h2 className="mb-3 text-[30px] font-extrabold leading-[1.05] text-[#002244] md:text-[38px]">
              Historical Timeline
            </h2>
            <p className="text-[15px] leading-[1.75] text-slate-500 md:text-[16px]">
              Explore the defining eras, moments, and turning points that shaped the
              Tennessee Titans legacy.
            </p>
          </div>
          <div className="relative">
            <div className="absolute bottom-0 top-0 left-[22px] w-[2px] bg-[#d7e0ea] md:left-1/2 md:-translate-x-1/2 md:w-[3px]" />

            {!loading && timelineEvents.length === 0 && !error ? (
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                No timeline events available.
              </article>
            ) : (
              <div className="space-y-8 md:space-y-10 lg:space-y-12">
                {timelineEvents.map((event, index) => (
                  <TimelineItem
                    key={event.id}
                    event={event}
                    index={index}
                    onOpenStory={handleOpenTimelineStory}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 mb-6 rounded-3xl border border-[#e6e9ef] bg-white px-6 py-8 shadow-[0_8px_20px_rgba(15,23,42,0.08)] md:px-8 md:py-9">
          <h2 className="mb-[18px] text-2xl font-extrabold text-[#0c2340]">
            Legendary Players
          </h2>
          <div className="mt-8 grid gap-6 lg:gap-7 md:grid-cols-2 lg:grid-cols-3">
            {!loading && visiblePlayers.length === 0 && !error ? (
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:col-span-2 lg:col-span-3">
                No legendary players available.
              </article>
            ) : visiblePlayers.map((player) => (
              <LegendaryPlayerCard
                key={player.id}
                player={player}
                onOpenProfile={handleOpenPlayerProfile}
              />
            ))}
          </div>
        </section>

        <section className="mb-6 mt-4 rounded-[28px] border border-[#e6e9ef] bg-white px-6 py-6 shadow-[0_8px_20px_rgba(15,23,42,0.08)] md:px-8 md:py-7">
          <h2 className="mb-3 text-2xl font-extrabold text-[#0c2340]">
            Classic Matches Archive
          </h2>
          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            {!loading && visibleMatches.length === 0 && !error ? (
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
                No classic matches available.
              </article>
            ) : visibleMatches.map((match) => (
              <ClassicMatchCard key={match.id} match={match} />
            ))}
          </div>
          {classicMatches.length > 4 ? (
            <div className="mt-7 flex justify-center">
              <button
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#d8e1ed] bg-[#f8fbff] px-6 text-[14px] font-bold text-[#0C2340] shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-[#0C2340] hover:bg-white hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
                type="button"
                onClick={() => setShowAllMatches((current) => !current)}
              >
                {showAllMatches ? "Show Less Replays" : "View More Replays"}
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl bg-[linear-gradient(180deg,#12305b_0%,#0c2340_100%)] px-6 py-[42px] text-center text-white">
          <h2 className="mb-2.5 text-4xl font-bold">Building a Legacy</h2>
          <p className="mb-[18px] text-[14px] leading-[1.6] text-[#dbe5f2]">
            From the Oilers to the Titans, our history is filled with unforgettable
            moments and legends.
          </p>
        </section>

        <TimelineStoryModal
          event={selectedTimelineEvent}
          isOpen={isTimelineModalOpen}
          onClose={handleCloseTimelineStory}
        />
        <LegendaryPlayerModal
          isOpen={isPlayerModalOpen}
          onClose={handleClosePlayerProfile}
          player={selectedPlayer}
        />
      </main>
    </div>
  );
}

export default HistoryPage;
