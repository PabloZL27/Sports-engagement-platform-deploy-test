import { useState } from "react";

interface Props {
  onClose: () => void;
}

const PAGES = [
  {
    title: "Welcome to Titans War Room",
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <p>
          Three GMs compete to build the best Tennessee Titans roster before the
          draft window closes.
        </p>
        <p>
          At the end of the game, the GM with the most points wins, combining
          hand value and Secret Agenda points (bonus if met, penalty if missed).
        </p>
      </div>
    ),
  },
  {
    title: "Your Hand",
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <p>You start with <strong>5 random player cards</strong>. Your hand holds a maximum of <strong>6 cards</strong>.</p>
        <p>Each card has a <strong>tier (1–5 pts)</strong>:</p>
        <ul className="space-y-1 pl-4">
          <li><span className="font-bold text-gray-400">Tier 1</span> — Rookie (1 pt)</li>
          <li><span className="font-bold text-blue-500">Tier 2</span> — Solid (2 pts)</li>
          <li><span className="font-bold text-green-600">Tier 3</span> — Starter (3 pts)</li>
          <li><span className="font-bold text-yellow-500">Tier 4</span> — Pro (4 pts)</li>
          <li><span className="font-bold text-orange-500">Tier 5</span> — Elite (5 pts)</li>
        </ul>
        <p>Only your final 6-card hand counts at game end.</p>
      </div>
    ),
  },
  {
    title: "Secret Agendas",
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <p>
          Before the game starts, you secretly pick <strong>2 Agendas</strong>.
          Only you can see them during the game.
        </p>
        <p>
          Each agenda has a condition. If you complete it at game end, you earn{" "}
          <strong>bonus points</strong>. If you fail, you lose the same amount,{" "}
          <strong>those points are subtracted</strong> from your score.
        </p>
        <p>
          At game end, all agendas are revealed. Pick goals you can realistically
          complete, or you will pay for missing them.
        </p>
      </div>
    ),
  },
  {
    title: "Your Turn (30 seconds)",
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <p>
          Turns rotate between all 3 GMs. When it's your turn you have{" "}
          <strong>30 seconds</strong> to pick one of three actions:
        </p>
        <div className="rounded-xl border border-gray-200 p-3 space-y-2">
          <p><strong>Breaking News</strong> — Draw an event card that gives or takes TitanCash.</p>
          <p><strong>Buy Player</strong> — Spend 5 TC to see 3 random players and pick one.</p>
          <p><strong>Negotiate</strong> — Propose a 1-for-1 trade with another GM.</p>
        </div>
        <p className="text-xs text-gray-400">
          If time runs out, your turn is skipped automatically.
        </p>
      </div>
    ),
  },
  {
    title: "Breaking News",
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <p>
          Draw a random news card, it plays a short story and adjusts your{" "}
          <strong>TitanCash</strong> up or down.
        </p>
        <p>
          TitanCash is the currency you use to buy players. You need at least{" "}
          <strong>5 TC</strong> to scout.
        </p>
        <p>
          Good news events give you cash. Bad news takes it. Use Breaking News
          when you need to build up your budget.
        </p>
      </div>
    ),
  },
  {
    title: "Buy Player",
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <p>
          Costs <strong>5 TitanCash</strong>. You get to see 3 random players
          from the draft pool and pick one to add to your hand.
        </p>
        <p>
          If your hand already has <strong>6 cards</strong>, you must discard
          one of your existing cards first to make room.
        </p>
        <p className="text-xs text-gray-400">
          You have 20 seconds to decide. If time runs out, your turn ends without
          picking anyone.
        </p>
      </div>
    ),
  },
  {
    title: "Negotiate",
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <p>
          Propose a <strong>1-for-1 card swap</strong> with another GM. You can
          optionally sweeten the deal with TitanCash.
        </p>
        <p>
          The other GM has <strong>15 seconds</strong> to accept or reject.
          Their point values are hidden, you only see their name and position.
        </p>
        <p>
          You can negotiate <strong>up to 2 times per turn</strong> (once per
          rival). If both reject you, your turn ends.
        </p>
      </div>
    ),
  },
  {
    title: "Game End & Scoring",
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <p>The game lasts <strong>12 rounds</strong>.</p>
        <p>At the end, each GM's score is calculated:</p>
        <div className="rounded-xl border border-gray-200 p-3 space-y-1 font-mono text-xs">
          <p>Hand total (sum of card tiers)</p>
          <p>+ Agenda points if completed</p>
          <p>- Agenda points if missed</p>
          <p>= Final Score</p>
        </div>
        <p>
          The GM with the <strong>highest total score</strong> wins. Good luck,
          GM!
        </p>
      </div>
    ),
  },
];

export function WarRoomTutorialModal({ onClose }: Props) {
  const [page, setPage] = useState(0);
  const current = PAGES[page];
  const isLast = page === PAGES.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_100%)] px-6 py-4">
          <p className="text-[10px] font-extrabold tracking-widest text-blue-300 uppercase mb-1">
            How to Play — {page + 1} / {PAGES.length}
          </p>
          <h2 className="text-xl font-black text-white">
            {current.title}
          </h2>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-[#0f3d78] transition-all duration-300"
            style={{ width: `${((page + 1) / PAGES.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 min-h-[200px]">{current.content}</div>

        {/* Navigation */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-[#0f3d78] px-4 py-3 text-sm font-bold text-white hover:bg-[#0B2A55] transition-colors"
            >
              Got it — Back to Lobby
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="flex-1 rounded-xl bg-[#0f3d78] px-4 py-3 text-sm font-bold text-white hover:bg-[#0B2A55] transition-colors"
            >
              Next
            </button>
          )}
        </div>

        {/* Skip */}
        {!isLast && (
          <div className="px-6 pb-4 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Skip tutorial
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
