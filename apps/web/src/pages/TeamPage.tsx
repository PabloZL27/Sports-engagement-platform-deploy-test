import { useState, useEffect, useMemo, useRef } from "react";
import Navbar from "../components/layout/Navbar";
import {
  CollectionHeader,
  CollectionProgressBar,
  CardFilterTabs,
  CardSearchBar,
  CardGrid,
  CardPagination,
  PackSection,
  PlayerStatsModal,
  PackOpeningExperience,
} from "../components/cards";
import type { CardFilter } from "../components/cards";
import {
  getRoster,
  getAthleteDetail,
  getCollectionStats,
  getPackStatus,
  startPackOpening,
  claimPack,
} from "../services/cardsService";
import type {
  RosterCard,
  AthleteDetail,
  CollectionStats,
  PackOpenResult,
  PackOpeningState,
} from "../types";
import { Auth } from "../context/AuthContext";

const CARDS_PER_PAGE = 12;

function TeamPage() {
  const { session } = Auth();
  const currentUserId = session?.user?.id ?? null;
  // Data state
  const [cards, setCards] = useState<RosterCard[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /** Si falla el API, la lista queda vacía: sin esto parece “no hay cartas” en DB. */
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter state
  const [filter, setFilter] = useState<CardFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteDetail | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Pack state
  const [isOpeningPack, setIsOpeningPack] = useState(false);
  const [packResult, setPackResult] = useState<PackOpenResult | null>(null);
  const [packRevealOpen, setPackRevealOpen] = useState(false);
  const packRevealActiveRef = useRef(false);
  const [packState, setPackState] = useState<PackOpeningState | null>(null);
  const [packSecondsRemaining, setPackSecondsRemaining] = useState<number | null>(null);

  // Fetch roster and collection stats
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        setFetchError(null);
        const [rosterData, statsData] = await Promise.all([
          getRoster(currentUserId ?? undefined),
          currentUserId ? getCollectionStats(currentUserId) : Promise.resolve(null),
        ]);
        setCards(rosterData);
        setStats(statsData);
        if (currentUserId) {
          getPackStatus(currentUserId)
            .then((s) => setPackState(s))
            .catch(() => {});
        } else {
          setPackState({ status: "NONE" });
          setPackSecondsRemaining(null);
        }
      } catch (error) {
        console.error("Failed to fetch cards data:", error);
        setCards([]);
        setStats(null);
        setFetchError(
          error instanceof Error ? error.message : "Error al cargar datos de cartas"
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [currentUserId]);

  // Local countdown ticker (client-side) while pack is opening
  useEffect(() => {
    if (packState?.status !== "OPENING" || !packState.ready_at) {
      setPackSecondsRemaining(null);
      return;
    }

    function tick() {
      const readyAt = packState?.ready_at;
      if (!readyAt) return;
      const readyMs = new Date(readyAt).getTime();
      const sec = Math.max(0, Math.ceil((readyMs - Date.now()) / 1000));
      setPackSecondsRemaining(sec);
      if (sec <= 0) {
        setPackState((prev) => (prev ? { ...prev, status: "READY", seconds_remaining: 0 } : prev));
      }
    }

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [packState?.status, packState?.ready_at]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    let result = cards;

    // Apply filter tab
    switch (filter) {
      case "unlocked":
        result = result.filter((c) => c.unlocked);
        break;
      case "locked":
        result = result.filter((c) => !c.unlocked);
        break;
      case "rare":
        result = result.filter((c) => c.rarity === "rare");
        break;
      case "elite":
        result = result.filter((c) => c.rarity === "elite");
        break;
      case "titan":
        result = result.filter((c) => c.rarity === "titan");
        break;
    }

    // Apply owned only toggle
    if (ownedOnly) {
      result = result.filter((c) => c.unlocked);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.display_name.toLowerCase().includes(query) ||
          c.position.toLowerCase().includes(query)
      );
    }

    return result;
  }, [cards, filter, ownedOnly, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredCards.length / CARDS_PER_PAGE);
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    return filteredCards.slice(start, start + CARDS_PER_PAGE);
  }, [filteredCards, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, ownedOnly]);

  // View stats handler
  async function handleViewStats(athleteId: number) {
    setIsStatsModalOpen(true);
    setIsLoadingStats(true);
    try {
      const detail = await getAthleteDetail(athleteId);
      setSelectedAthlete(detail);
    } catch (error) {
      console.error("Failed to fetch athlete details:", error);
    } finally {
      setIsLoadingStats(false);
    }
  }

  async function handleStartPack() {
    if (!currentUserId) return;
    setIsOpeningPack(true);
    try {
      const s = await startPackOpening(currentUserId);
      setPackState(s);
      // refresh packs remaining after reserving one
      const statsData = await getCollectionStats(currentUserId);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to start pack opening:", error);
    } finally {
      setIsOpeningPack(false);
    }
  }

  async function handleClaimPack() {
    if (!currentUserId) return;
    setPackRevealOpen(true);
    setPackResult(null);
    packRevealActiveRef.current = true;
    setIsOpeningPack(true);
    try {
      const result = await claimPack(currentUserId);
      if (packRevealActiveRef.current) {
        setPackResult(result);
      }

      const [rosterData, statsData] = await Promise.all([
        getRoster(currentUserId),
        getCollectionStats(currentUserId),
      ]);
      setCards(rosterData);
      setStats(statsData);
      setPackState({ status: "NONE" });
      setPackSecondsRemaining(null);
    } catch (error) {
      console.error("Failed to claim pack:", error);
      packRevealActiveRef.current = false;
      setPackRevealOpen(false);
      setPackResult(null);
    } finally {
      setIsOpeningPack(false);
    }
  }

  function handlePackRevealClose() {
    packRevealActiveRef.current = false;
    setPackRevealOpen(false);
    setPackResult(null);
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <main className="mx-auto w-full max-w-[1400px] p-6">
        <Navbar />
        {/* Header + Progress */}
        <div className="mb-6">
          <CollectionHeader stats={stats} />
        </div>
        <div className="mb-8">
          <CollectionProgressBar stats={stats} />
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col gap-4 mb-8">
          <CardFilterTabs selected={filter} onFilterChange={setFilter} />
          <CardSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            ownedOnly={ownedOnly}
            onOwnedToggle={setOwnedOnly}
          />
        </div>

        {/* Card grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-500">
            <div
              className="size-10 animate-spin rounded-full border-2 border-gray-200 border-t-[#4B90CD]"
              aria-hidden
            />
            <span className="text-sm">Loading roster…</span>
          </div>
        ) : fetchError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 shadow-sm">
            <p className="font-semibold">Could not load roster</p>
            <p className="mt-2 font-mono text-sm text-amber-900/90">{fetchError}</p>
            <p className="mt-3 text-sm text-amber-900/85">
              This usually happens if <strong>cards-service</strong> is not running or is not reachable on the
              Vite proxy port (check <code className="rounded bg-amber-100/80 px-1">apps/web/vite.config.ts</code>,
              e.g. <code className="rounded bg-amber-100/80 px-1">localhost:4009</code>). Start the service or
              adjust the port and reload.
            </p>
          </div>
        ) : (
          <>
            <CardGrid cards={paginatedCards} onViewStats={handleViewStats} />
            <CardPagination
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}

        {/* Pack section */}
        <PackSection
          packsRemaining={stats?.packs_remaining ?? 0}
          isOpening={isOpeningPack}
          packState={packState}
          secondsRemaining={packSecondsRemaining ?? packState?.seconds_remaining ?? null}
          onStartOpening={handleStartPack}
          onClaim={handleClaimPack}
        />

        {/* Modals: solo montar cuando están abiertos para evitar bugs de HeroUI Modal en estado cerrado */}
        {isStatsModalOpen ? (
          <PlayerStatsModal
            isOpen
            onClose={() => {
              setIsStatsModalOpen(false);
              setSelectedAthlete(null);
            }}
            athlete={selectedAthlete}
            isLoading={isLoadingStats}
          />
        ) : null}

        {packRevealOpen ? (
          <PackOpeningExperience result={packResult} onClose={handlePackRevealClose} />
        ) : null}
      </main>
    </div>
  );
}

export default TeamPage;
