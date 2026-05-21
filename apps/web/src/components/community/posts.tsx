import { useEffect, useState } from "react";
import { Auth } from "../../context/AuthContext";
import { Post } from "../../types/community";
import {
  getPosts,
  incrementPostUpvote,
  incrementPostView,
} from "../../services/communityService";
import { filteredPosts } from "../../utils/postUtils";
import { ModalComp } from "../general/modal";
import PostDetail from "./postDetail";
import NewReply from "./newReply";
import { SigninWithEmailForm } from "../auth/SignInForm";
import { SignupForm } from "../auth/SignUpForm";
import PostCard from "./PostCard";

type PostCompProps = {
  activeFilter?: "hot" | "new";
  activeCategory?: string;
  refreshKey?: number;
};

const PostComp = ({ activeFilter = "hot", activeCategory = "All Topics", refreshKey }: PostCompProps) => {

  const [posts, setPosts] = useState<Post[]>([]);
  const { session } = Auth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [upvotedPosts, setUpvotedPosts] = useState<Set<number>>(new Set());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [authView, setAuthView] = useState<"signup" | "signin">("signup");

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      try {
        setLoading(true);
        setError("");
        const data = await getPosts();
        if (isMounted) setPosts(data);
      } catch (err) {
        console.error("Error loading posts:", err);
        if (isMounted) setError("No se pudieron cargar los posts.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadPosts();

    // initialize upvoted posts from localStorage per user
    try {
      const userKey = session?.user?.id ? `upvoted_${session.user.id}` : "upvoted_guest";
      const raw = localStorage.getItem(userKey);
      if (raw) {
        const arr: number[] = JSON.parse(raw);
        if (isMounted) setUpvotedPosts(new Set(arr));
      }
    } catch (e) {
      // ignore
    }

    return () => {
      isMounted = false;
    };
  }, [refreshKey, session?.user?.id]);

  const handleTogglePostDetails = async (postId: number) => {
    const isExpanding = expandedPostId !== postId;
    setExpandedPostId(isExpanding ? postId : null);

    if (!isExpanding) return;

    try {
      const updatedViews = await incrementPostView(postId);
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.post_id === postId
            ? { ...post, views_count: updatedViews }
            : post
        )
      );
    } catch (err) {
      console.error("Error incrementing post view:", err);
    }
  };

  const handleLikeClick = async (
    postId: number
  ) => {
      // prevent double-like client-side
    if (!session?.user.id) {
      setIsOpen(true);
      return;
    }
    if (upvotedPosts.has(postId)) {
      // already liked by this user on client
      return;
    }

    try {
      const updatedUpvotes = await incrementPostUpvote(postId);

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.post_id === postId
            ? { ...post, upvotes_count: updatedUpvotes }
            : post
        )
      );

      // persist client-side that this user has upvoted this post
      setUpvotedPosts((prev) => {
        const next = new Set(prev);
        next.add(postId);
        try {
          const userKey = session?.user?.id ? `upvoted_${session.user.id}` : "upvoted_guest";
          localStorage.setItem(userKey, JSON.stringify(Array.from(next)));
        } catch (e) {
          // ignore
        }
        return next;
      });
    } catch (err) {
      console.error("Error incrementing post upvote:", err);
    }
  };

  const displayPosts = filteredPosts(posts, activeFilter);
  const categoryFilteredPosts =
    activeCategory === "All Topics"
      ? displayPosts
      : displayPosts.filter((post) => post.category_name === activeCategory);
  if (loading) return <p className="py-8 text-center">Cargando posts...</p>;
  if (error) return <p className="py-8 text-center text-red-500">{error}</p>;


  return (
    <>
      <div className="space-y-4">
        {categoryFilteredPosts.map((post) => (
          <PostCard
            key={post.post_id}
            post={post}
            expanded={expandedPostId === post.post_id}
            isLiked={upvotedPosts.has(post.post_id)}
            onClick={handleTogglePostDetails}
            onLike={handleLikeClick}
            onOpenDetail={(selectedPost) => {
              setIsDetailsOpen(true);
              setSelectedPost(selectedPost)
            }}
          />
        ))}
        <ModalComp 
          isOpen={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          dialogClassName="w-[min(45vw,72rem)] max-w-none"
          children={
          selectedPost && (
            <div className="space-y-6">
              <PostDetail post={selectedPost} />
              <NewReply 
                postId={selectedPost.post_id}
                onSuccess={(newComments) => {
                  if (newComments && selectedPost) {
                    setPosts((currentPosts) =>
                      currentPosts.map((p) =>
                        p.post_id === selectedPost.post_id
                          ? { ...p, replies_count: newComments.length }
                          : p
                      )
                    );
                  }
                  setIsDetailsOpen(false);
                }}
                onCancel={() => setIsDetailsOpen(false)}
              />
            </div>
          )
          }
        />
      </div>
      <div className="gap-12" style={{ flexShrink: 0 }}>
        <ModalComp 
          isOpen={isOpen} 
          onOpenChange={setIsOpen} 
          children={
            authView === "signup" ? (
              <SignupForm 
                onSuccess={() => setIsOpen(false)} 
                onSwitchToSignIn={() => setAuthView("signin")} // Cambia a vista signin
              />
            ) : (
              <SigninWithEmailForm 
                onSuccess={() => setIsOpen(false)}
                onSwitchToSignUp={() => setAuthView("signup")} 
              />
            )
          }
        />
      </div>
    </>
  );
};

export default PostComp;