import { useCallback, useEffect, useRef, useState } from "react";
import { Auth } from "../../context/AuthContext";
import {
  bootstrapMatchRoom,
  getMatchMessages,
  postMatchMessage,
  type ChatMessageRow,
} from "../../services/roomsChatService";

type FanChatProps = {
  matchId: number;
};

const POLL_MS = 2500;

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

function FanChat({ matchId }: FanChatProps) {
  const { session } = Auth();
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const bootstrapped = useRef(false);

  const userId = session?.user ? chatUserIdFromSession(session.user) : null;
  const senderDisplayName =
    session?.user != null ? displayNameFromSession(session.user) : null;

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

  async function sendMessage() {
    const text = input.trim();
    if (!text || userId == null || !ready) return;
    setInput("");
    try {
      await postMatchMessage(matchId, userId, text, senderDisplayName);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    }
  }

  if (!session) {
    return (
      <div className="fan-chat">
        <h3>Fan Chat</h3>
        <p>Sign in to join the chat for this match.</p>
      </div>
    );
  }

  if (userId == null) {
    return (
      <div className="fan-chat">
        <h3>Fan Chat</h3>
        <p>
          No valid user id (Supabase UUID). Sign out and sign back in. In development you can set{" "}
          <code>VITE_CHAT_DEV_USER_ID</code> to a valid UUID.
        </p>
      </div>
    );
  }

  return (
    <div className="fan-chat">
      <h3>Fan Chat</h3>
      {error && <p style={{ color: "crimson", fontSize: 14 }}>{error}</p>}
      <div className="messages">
        {messages.map((msg) => {
          const mine = msg.user_id.toLowerCase() === userId.toLowerCase();
          return (
            <div
              key={msg.id}
              className={
                mine ? "chat-msg-row chat-msg-row--mine" : "chat-msg-row chat-msg-row--other"
              }
            >
              <div className="chat-msg-block">
                <strong>{messageAuthorLabel(msg)}:</strong> {msg.content}
              </div>
            </div>
          );
        })}
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button type="button" onClick={sendMessage} disabled={!ready}>
          Send
        </button>
      </div>
    </div>
  );
}

export default FanChat;