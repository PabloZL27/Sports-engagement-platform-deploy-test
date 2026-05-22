import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { Auth } from "../../context/AuthContext";
import TeamLogo from "./TeamLogo";
import {
  bootstrapMatchRoom,
  getMatchMessages,
  getMatchParticipants,
  postMatchMessage,
  type ChatMessageRow,
  type ChatParticipantRow,
} from "../../services/roomsChatService";
import { createUserReport } from "../../services/userReportsService";
import { getProfilesBatch } from "../../services/profileService";
import type { ApiMatch } from "../../types/match";
import {
  isLiveMatch,
  titansFirstTeams,
} from "../../utils/matchHelpers";
import { parseAbbrsFromShortName } from "../../utils/teamLogo";

type FanChatProps = {
  matchId: number;
  match: ApiMatch | null;
};

const POLL_MS = 2500;

const reportReasons = [
  "Spam / Misleading advertising",
  "Offensive language / Harassment",
  "Violence or harmful content",
  "False information",
  "Hate speech",
  "Sexual content",
  "Other",
] as const;

type ReportReason = (typeof reportReasons)[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function chatUserIdFromSession(user: { id: string }): string | null {
  const id = typeof user.id === "string" ? user.id.trim() : "";
  if (id && UUID_RE.test(id)) return id.toLowerCase();
  const dev = String(import.meta.env.VITE_CHAT_DEV_USER_ID || "").trim();
  if (dev && UUID_RE.test(dev)) return dev.toLowerCase();
  return null;
}

function shortUserLabel(userId: string): string {
  const s = String(userId);
  if (s.length <= 8) return s;
  return `${s.slice(0, 8)}…`;
}

function displayNameFromSession(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): string | null {
  const m = user.user_metadata || {};
  const pick = (k: string) => {
    const v = m[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    return null;
  };
  return (
    pick("full_name") ||
    pick("name") ||
    pick("username") ||
    pick("user_name") ||
    pick("preferred_username") ||
    (typeof user.email === "string" && user.email.includes("@")
      ? user.email.split("@")[0]
      : null)
  );
}

function messageAuthorLabel(msg: ChatMessageRow): string {
  const fromRow = msg.display_name?.trim();
  if (fromRow) return fromRow;
  return `User ${shortUserLabel(msg.user_id)}`;
}

function participantLabel(participant: ChatParticipantRow): string {
  const fromRow = participant.display_name?.trim();
  if (fromRow) return fromRow;
  return `User ${shortUserLabel(participant.user_id)}`;
}

function avatarFromSession(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  const m = user.user_metadata || {};
  const raw = m.avatar_url;
  if (typeof raw === "string" && raw.trim().startsWith("http")) {
    return raw.trim();
  }
  return null;
}

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return label.slice(0, 2).toUpperCase() || "?";
}

function ChatMessageAvatar({
  avatarUrl,
  label,
  mine,
}: {
  avatarUrl: string | null;
  label: string;
  mine: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const initials = initialsFromLabel(label);

  if (avatarUrl && !broken) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`chat-msg-avatar ${mine ? "chat-msg-avatar--mine" : ""}`}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className={`chat-msg-avatar chat-msg-avatar--fallback ${mine ? "chat-msg-avatar--mine" : ""}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function FanChatMatchStrip({ match }: { match: ApiMatch }) {
  const live = isLiveMatch(match);
  const { home: homeAbbr, away: awayAbbr } = parseAbbrsFromShortName(match.short_name);
  const home = {
    abbr: homeAbbr ?? match.home_team_abbreviation ?? null,
    name: match.home_team ?? "Home",
    logo: match.home_team_logo,
  };
  const away = {
    abbr: awayAbbr ?? match.away_team_abbreviation ?? null,
    name: match.away_team ?? "Away",
    logo: match.away_team_logo,
  };

  return (
    <div className={`fan-chat-match-strip ${live ? "fan-chat-match-strip--live" : ""}`}>
      <div className="fan-chat-match-teams">
        <div className="fan-chat-match-team">
          <TeamLogo
            abbr={home.abbr}
            teamName={home.name}
            side="home"
            logoUrl={home.logo}
            size="sm"
          />
          <span className="fan-chat-match-abbr">{home.abbr || "HOME"}</span>
        </div>

        <div className="fan-chat-match-vs">VS</div>

        <div className="fan-chat-match-team fan-chat-match-team--away">
          <span className="fan-chat-match-abbr">{away.abbr || "AWAY"}</span>
          <TeamLogo
            abbr={away.abbr}
            teamName={away.name}
            side="away"
            logoUrl={away.logo}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

function FanChatEmptyState({ match }: { match: ApiMatch | null }) {
  const titans = match ? titansFirstTeams(match).left : null;

  return (
    <div className="fan-chat-empty">
      {titans?.abbr ? (
        <TeamLogo
          abbr={titans.abbr}
          teamName={titans.name ?? "Titans"}
          side="home"
          logoUrl={titans.logo}
          size="md"
        />
      ) : (
        <div className="fan-chat-empty-icon" aria-hidden>
          <Icon icon="mdi:chat-processing-outline" width={28} />
        </div>
      )}
      <p className="fan-chat-empty-title">The room is heating up</p>
      <p className="fan-chat-empty-text">
        Be the first to cheer for the Titans in this match room.
      </p>
    </div>
  );
}

function FanChat({ matchId, match }: FanChatProps) {
  const { session } = Auth();
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const bootstrapped = useRef(false);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [participants, setParticipants] = useState<ChatParticipantRow[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [avatarByUserId, setAvatarByUserId] = useState<Record<string, string>>({});
  const fetchedAvatarIdsRef = useRef(new Set<string>());

  const userId = session?.user ? chatUserIdFromSession(session.user) : null;
  const senderDisplayName =
    session?.user != null ? displayNameFromSession(session.user) : null;
  const senderAvatarUrl =
    session?.user != null ? avatarFromSession(session.user) : null;
  const live = match != null && isLiveMatch(match);

  const refresh = useCallback(async () => {
    if (!Number.isFinite(matchId)) return;
    try {
      const { messages: rows } = await getMatchMessages(matchId);
      setMessages(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load messages");
    }
  }, [matchId]);

  const loadParticipants = useCallback(async () => {
    if (!Number.isFinite(matchId) || userId == null) return;

    setParticipantsLoading(true);
    try {
      const { participants: rows } = await getMatchParticipants(matchId);
      setParticipants(
        rows.filter(
          (participant) =>
            participant.user_id.toLowerCase() !== userId.toLowerCase(),
        ),
      );
      setReportError(null);
    } catch (e) {
      setReportError(
        e instanceof Error ? e.message : "Could not load chat participants",
      );
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  }, [matchId, userId]);

  useEffect(() => {
    if (!session?.user || userId == null) {
      setReady(false);
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;

    (async () => {
      try {
        if (!bootstrapped.current) {
          await bootstrapMatchRoom(matchId, userId);
          bootstrapped.current = true;
        }
        setReady(true);
        await refresh();
        interval = setInterval(refresh, POLL_MS);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start chat");
        setReady(false);
      }
    })();

    return () => {
      if (interval) clearInterval(interval);
      bootstrapped.current = false;
    };
  }, [session?.user, userId, matchId, refresh]);

  useEffect(() => {
    const missingIds = [
      ...new Set(
        messages
          .filter((msg) => {
            if (msg.avatar_url?.trim()) return false;
            const key = msg.user_id.toLowerCase();
            if (fetchedAvatarIdsRef.current.has(key)) return false;
            fetchedAvatarIdsRef.current.add(key);
            return true;
          })
          .map((msg) => msg.user_id),
      ),
    ];

    if (missingIds.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const profiles = await getProfilesBatch(missingIds);
        if (cancelled) return;

        const next: Record<string, string> = {};
        for (const profile of profiles) {
          const url = profile.avatar_url?.trim();
          if (url && profile.user_id) {
            next[profile.user_id.toLowerCase()] = url;
          }
        }

        if (Object.keys(next).length > 0) {
          setAvatarByUserId((prev) => ({ ...prev, ...next }));
        }
      } catch {
        /* avatars are optional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messages]);

  function resolveMessageAvatar(msg: ChatMessageRow, mine: boolean): string | null {
    const fromMsg = msg.avatar_url?.trim();
    if (fromMsg) return fromMsg;

    const fromCache = avatarByUserId[msg.user_id.toLowerCase()];
    if (fromCache) return fromCache;

    if (mine && senderAvatarUrl) return senderAvatarUrl;

    return null;
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || userId == null || !ready) return;
    setInput("");
    try {
      await postMatchMessage(
        matchId,
        userId,
        text,
        senderDisplayName,
        senderAvatarUrl,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    }
  }

  async function openReportModal() {
    setIsReportModalOpen(true);
    setSelectedUserId(null);
    setSelectedReason(null);
    setReportDetails("");
    setReportError(null);
    setReportMessage(null);
    await loadParticipants();
  }

  function closeReportModal() {
    if (isSubmittingReport) return;
    setIsReportModalOpen(false);
    setSelectedUserId(null);
    setSelectedReason(null);
    setReportDetails("");
    setReportError(null);
    setReportMessage(null);
  }

  async function handleSubmitReport() {
    if (!session?.user?.id || userId == null) return;

    if (!selectedUserId) {
      setReportError("Select a user from this chat first.");
      return;
    }

    if (!selectedReason) {
      setReportError("Choose a report category first.");
      return;
    }

    const details = reportDetails.trim();
    if (!details) {
      setReportError("Add a short description of what happened.");
      return;
    }

    const selectedParticipant = participants.find(
      (participant) => participant.user_id === selectedUserId,
    );
    const reportedLabel = selectedParticipant
      ? participantLabel(selectedParticipant)
      : shortUserLabel(selectedUserId);

    try {
      setIsSubmittingReport(true);
      setReportError(null);
      setReportMessage(null);

      await createUserReport({
        user_id: selectedUserId,
        reported_by_user_id: session.user.id,
        reason: selectedReason,
        content: `Fan chat report (match ${matchId}, user: ${reportedLabel}): ${details}`,
      });

      setReportMessage("Report submitted. Thank you for helping keep the chat safe.");
      window.setTimeout(() => {
        closeReportModal();
      }, 1200);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Unable to submit report.");
    } finally {
      setIsSubmittingReport(false);
    }
  }

  if (!session) {
    return (
      <div className="fan-chat fan-chat--placeholder">
        <h3>Fan Chat</h3>
        <p>Sign in to join the chat for this match.</p>
      </div>
    );
  }

  if (userId == null) {
    return (
      <div className="fan-chat fan-chat--placeholder">
        <h3>Fan Chat</h3>
        <p>
          No valid user id (Supabase UUID). Sign out and sign back in. In development you can set{" "}
          <code>VITE_CHAT_DEV_USER_ID</code> to a valid UUID.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`fan-chat ${live ? "fan-chat--live" : ""}`}>
        <div className="fan-chat-header">
          <div className="fan-chat-title-block">
            <h3 className="fan-chat-title">Fan Chat</h3>
            {live && (
              <span className="fan-chat-live-dot" aria-label="Live match">
                LIVE
              </span>
            )}
          </div>
          <button
            type="button"
            className="fan-chat-report-btn"
            onClick={() => void openReportModal()}
            disabled={!ready}
          >
            <Icon icon="mdi:flag-outline" width={16} />
            Report user
          </button>
        </div>

        {match && <FanChatMatchStrip match={match} />}

        {error && <p className="fan-chat-error">{error}</p>}

        <div className="messages">
          {messages.length === 0 ? (
            <FanChatEmptyState match={match} />
          ) : (
            messages.map((msg) => {
              const mine = msg.user_id.toLowerCase() === userId.toLowerCase();
              const authorLabel = messageAuthorLabel(msg);
              const avatarUrl = resolveMessageAvatar(msg, mine);

              return (
                <div
                  key={msg.id}
                  className={
                    mine ? "chat-msg-row chat-msg-row--mine" : "chat-msg-row chat-msg-row--other"
                  }
                >
                  {!mine && (
                    <ChatMessageAvatar
                      avatarUrl={avatarUrl}
                      label={authorLabel}
                      mine={false}
                    />
                  )}
                  <div className="chat-msg-block">
                    <strong>{authorLabel}</strong>
                    <span>{msg.content}</span>
                  </div>
                  {mine && (
                    <ChatMessageAvatar
                      avatarUrl={avatarUrl}
                      label={authorLabel}
                      mine
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={live ? "Cheer for the Titans..." : "Say something..."}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button type="button" onClick={sendMessage} disabled={!ready}>
            Send
          </button>
        </div>
      </div>

      {isReportModalOpen && (
        <div className="fan-chat-report-overlay" onClick={closeReportModal}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="fan-chat-report-title"
            className="fan-chat-report-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fan-chat-report-modal-header">
              <div>
                <h2 id="fan-chat-report-title">Report user</h2>
                <p>Select someone from this match chat and describe the issue.</p>
              </div>
              <button
                type="button"
                aria-label="Close report modal"
                disabled={isSubmittingReport}
                className="fan-chat-report-close"
                onClick={closeReportModal}
              >
                <Icon icon="mdi:close" width={22} />
              </button>
            </div>

            <div className="fan-chat-report-section">
              <span className="fan-chat-report-label">Users in this chat</span>
              {participantsLoading ? (
                <p className="fan-chat-report-hint">Loading participants...</p>
              ) : participants.length === 0 ? (
                <p className="fan-chat-report-hint">
                  No other users have sent messages in this chat yet.
                </p>
              ) : (
                <div className="fan-chat-report-users">
                  {participants.map((participant) => {
                    const isSelected = selectedUserId === participant.user_id;
                    return (
                      <button
                        key={participant.user_id}
                        type="button"
                        disabled={isSubmittingReport}
                        className={
                          isSelected
                            ? "fan-chat-report-user fan-chat-report-user--selected"
                            : "fan-chat-report-user"
                        }
                        onClick={() => {
                          setSelectedUserId(participant.user_id);
                          setReportError(null);
                        }}
                      >
                        {participantLabel(participant)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="fan-chat-report-section">
              <span className="fan-chat-report-label">Category</span>
              <div className="fan-chat-report-reasons">
                {reportReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    disabled={isSubmittingReport}
                    className={
                      selectedReason === reason
                        ? "fan-chat-report-reason fan-chat-report-reason--selected"
                        : "fan-chat-report-reason"
                    }
                    onClick={() => {
                      setSelectedReason(reason);
                      setReportError(null);
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="fan-chat-report-section">
              <label className="fan-chat-report-label" htmlFor="fan-chat-report-details">
                Details
              </label>
              <textarea
                id="fan-chat-report-details"
                className="fan-chat-report-textarea"
                rows={3}
                maxLength={500}
                placeholder="Describe what happened in the chat..."
                value={reportDetails}
                disabled={isSubmittingReport}
                onChange={(e) => {
                  setReportDetails(e.target.value);
                  setReportError(null);
                }}
              />
            </div>

            {reportError && (
              <p className="fan-chat-report-feedback fan-chat-report-feedback--error">
                {reportError}
              </p>
            )}

            {reportMessage && (
              <p className="fan-chat-report-feedback fan-chat-report-feedback--success">
                {reportMessage}
              </p>
            )}

            <button
              type="button"
              disabled={
                isSubmittingReport ||
                !selectedUserId ||
                !selectedReason ||
                !reportDetails.trim()
              }
              className="fan-chat-report-submit"
              onClick={() => void handleSubmitReport()}
            >
              {isSubmittingReport ? "Submitting report..." : "Submit report"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}

export default FanChat;
