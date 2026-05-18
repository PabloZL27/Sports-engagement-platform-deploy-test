import { Post } from "../../types/community";
import PostCard from "../community/PostCard";

type UserPostsProps = {
  posts: Post[];
  expandedPostId: number | null;
  upvotedPosts: Set<number>;
  onTogglePostDetails: (postId: number) => void;
  onLike: (postId: number) => void | Promise<void>;
  onOpenDetail: (post: Post) => void;
};

export default function UserPosts(props: UserPostsProps) {
  const { posts, expandedPostId, upvotedPosts, onTogglePostDetails, onLike, onOpenDetail } = props;

  return (
    <div className="addresses-section">
      <div className="addresses-header">
        <div>
          <h2>POSTS HISTORY</h2>
          <p>¡See your profile posts!</p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="addresses-empty-state">
          <p>No posts yet. Go to the community page and make one!</p>
        </div>
      ) : (
        <div className="max-h-3/5 space-y-4 overflow-y-auto addresses-list">          
          {posts.map((post) => (
            <PostCard
              key={post.post_id}
              post={post}
              expanded={expandedPostId === post.post_id}
              isLiked={upvotedPosts.has(post.post_id)}
              onClick={onTogglePostDetails}
              onLike={onLike}
              onOpenDetail={onOpenDetail}
              showActions={true}
              showReplies={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}