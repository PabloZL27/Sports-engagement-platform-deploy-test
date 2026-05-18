import { Icon } from "@iconify/react";
import type { Comment } from "../../types/community";
import { getPostTime, getInitials } from "../../utils/postUtils";
import { useEffect, useState } from "react";
import { getPostComments, incrementReplyUpvote } from "../../services/communityService";
import { Auth } from "../../context/AuthContext";
import { ModalComp } from "../general/modal";
import { SignupForm } from "../auth/SignUpForm";
import { SigninWithEmailForm } from "../auth/SignInForm";

interface RepliesListProps {
  post_id: number;
}

const RepliesList = ({ post_id }: RepliesListProps) => {
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const { session } = Auth();
  const [upvotedReplies, setUpvotedReplies] = useState<Set<number>>(new Set());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authView, setAuthView] = useState<"signup" | "signin">("signup");

  if (post_id == null) {
    return (
      <p className="text-sm text-slate-500">No replies yet. Be the first to reply.</p>
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function loadPostReplies() {
      try {
        setLoading(true);
        const data = await getPostComments(post_id);

        if (isMounted) {
          setReplies(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadPostReplies();

    // init upvoted replies from localStorage per user
    try {
      const userKey = session?.user?.id ? `upvoted_replies_${session.user.id}` : "upvoted_replies_guest";
      const raw = localStorage.getItem(userKey);
      if (raw) {
        const arr: number[] = JSON.parse(raw);
        if (isMounted) setUpvotedReplies(new Set(arr));
      }
    } catch (e) {
      // ignore
    }

    return () => {
      isMounted = false;
    };
  }, [post_id]);

  const visibleReplies = replies;

  const handleReplyLikeClick = async (replyId: number) => {
    // Si no hay sesión, mostrar modal de auth
    if (!session?.user?.id) {
      setIsAuthModalOpen(true);
      return;
    }

    // prevent duplicate like client-side
    if (upvotedReplies.has(replyId)) return;

    try {
      const updatedUpvotes = await incrementReplyUpvote(replyId);
      setReplies((currentReplies) =>
        currentReplies.map((reply) =>
          reply.reply_id === replyId
            ? { ...reply, upvotes_count: updatedUpvotes }
            : reply
        )
      );

      setUpvotedReplies((prev) => {
        const next = new Set(prev);
        next.add(replyId);
        try {
          const userKey = session?.user?.id ? `upvoted_replies_${session.user.id}` : "upvoted_replies_guest";
          localStorage.setItem(userKey, JSON.stringify(Array.from(next)));
        } catch (e) {
          // ignore
        }
        return next;
      });
    } catch (error) {
      console.error("Error incrementing reply upvote:", error);
    }
  };

  return (
    <div className="space-y-4">
      <ModalComp 
        isOpen={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        children={
          authView === "signup" ? (
            <SignupForm 
              onSuccess={() => setIsAuthModalOpen(false)} 
              onSwitchToSignIn={() => setAuthView("signin")}
            />
          ) : (
            <SigninWithEmailForm 
              onSuccess={() => setIsAuthModalOpen(false)}
              onSwitchToSignUp={() => setAuthView("signup")}
            />
          )
        }
      />
      <div className="max-h-85 space-y-4 overflow-y-auto pr-1">
        {visibleReplies.map((reply) => {
          const name = reply.user_name || (reply.user_id ? `User ${reply.user_id}` : "Anonymous");
          return (
            <div key={reply.reply_id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center">
                  {getInitials(name)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0B2A55]">{name}</p>
                  <p className="text-xs text-slate-400">
                    {getPostTime(reply.created_at || "")}
                  </p>
                </div>
                <button
                  type="button"
                  className={`flex items-center gap-1 text-xs ${upvotedReplies.has(reply.reply_id) ? 'text-gray-400 cursor-default' : 'text-slate-400 hover:cursor-pointer'}`}
                  onClick={() => void handleReplyLikeClick(reply.reply_id)}
                  disabled={upvotedReplies.has(reply.reply_id)}
                >
                  <Icon icon="mdi:thumb-up-outline" width={14} />
                  {reply.upvotes_count ?? 0}
                </button>
              </div>

              <p className="mt-2 text-sm text-slate-600">{reply.content}</p>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default RepliesList;