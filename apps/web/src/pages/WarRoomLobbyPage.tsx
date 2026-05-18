import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { Auth } from "../context/AuthContext";
import { createMatch, joinMatch } from "../services/warRoomService";

function WarRoomLobbyPage() {
  const { session } = Auth();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const token = session?.access_token ?? "";

  async function handleCreate() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const match = await createMatch(token);
      navigate(`/war-room/${match.matchId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create War Room");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    const code = inviteCode.trim().toUpperCase();
    if (!code || !token) return;
    setLoading(true);
    setError(null);
    try {
      const match = await joinMatch(code, token);
      navigate(`/war-room/${match.matchId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join War Room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <main className="mx-auto w-full max-w-[1400px] p-6">
        <Navbar />

        <section className="mb-9 flex flex-wrap items-start justify-between gap-6 rounded-[28px] bg-[linear-gradient(90deg,#0B2A55_0%,#1D4E89_50%,#60A5FA_100%)] px-10 py-[42px] text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
          <div>
            <h1 className="m-0 text-[58px] leading-[1.05] font-black">
              TITANS WAR ROOM
            </h1>
            <p className="mt-2 text-lg opacity-80">
              Draft Night — Build the best Titans roster
            </p>
          </div>
          <div className="flex items-start pt-2">
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(true)}
              className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 transition-colors"
            >
              Leave
            </button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
          <div className="rounded-2xl bg-white p-8 shadow flex flex-col gap-4 items-center text-center">
            <h2 className="text-xl font-bold text-[#0B2A55]">
              Create War Room
            </h2>
            <p className="text-sm text-gray-500">
              Start a new room and invite up to 2 GMs with your code.
            </p>
            <button
              type="button"
              disabled={loading || !token}
              onClick={handleCreate}
              className="w-full rounded-xl bg-[#0f3d78] px-6 py-3 text-white font-bold hover:bg-[#0B2A55] disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating..." : "Create Room"}
            </button>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow flex flex-col gap-4 items-center text-center">
            <h2 className="text-xl font-bold text-[#0B2A55]">Join War Room</h2>
            <p className="text-sm text-gray-500">
              Enter a 6-character invite code to join.
            </p>
            <input
              type="text"
              maxLength={6}
              placeholder="ENTER CODE"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-[#0f3d78]"
            />
            <button
              type="button"
              disabled={loading || !token || inviteCode.trim().length < 4}
              onClick={handleJoin}
              className="w-full rounded-xl bg-[#60A5FA] px-6 py-3 text-white font-bold hover:bg-[#3b82f6] disabled:opacity-50 transition-colors"
            >
              {loading ? "Joining..." : "Join Room"}
            </button>
          </div>
        </section>

        {error && (
          <p className="mt-6 text-center text-red-500 font-semibold">{error}</p>
        )}

        {!token && (
          <p className="mt-6 text-center text-gray-400">
            You must be logged in to play.
          </p>
        )}
      </main>

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-white p-8 shadow-xl max-w-sm w-full mx-4 text-center">
            <h2 className="text-xl font-black text-[#0B2A55] mb-2">
              Leave War Room?
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to go back to Off-Season?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => navigate("/offseason")}
                className="flex-1 rounded-xl bg-[#0f3d78] px-4 py-3 text-sm font-bold text-white hover:bg-[#0B2A55] transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WarRoomLobbyPage;