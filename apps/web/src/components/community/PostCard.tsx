// apps/web/src/components/community/PostCard.tsx
import { Card } from "@heroui/react";
import { Icon } from "@iconify/react";
import type { Post } from "../../types/community";
import { getInitials, getPostTime } from "../../utils/postUtils";

type PostCardProps = {
  post: Post;
  expanded?: boolean;
  onClick?: (postId: number) => void;
  onLike?: (postId: number) => void;
  onOpenDetail?: (post: Post) => void;
  showActions?: boolean;
  showReplies?: boolean;
  isLiked?: boolean;
};

export default function PostCard({
  post,
  expanded = false,
  onClick,
  onLike,
  onOpenDetail,
  showActions = true,
  showReplies = true,
  isLiked = false,
}: PostCardProps) {
  return (
    <Card
      className="border-l-4 border-blue-500 transition-shadow hover:shadow-md cursor-pointer"
      onClick={() => onClick?.(post.post_id)}
    >
      <div className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-sky-700">
              {post.category_name}
            </span>
            <span className="text-xs text-gray-500">
              {getPostTime(post.created_at || "")}
            </span>
          </div>
        </div>

        <h3 className="mb-3 text-lg font-bold text-gray-900">{post.title}</h3>

        <div className="mb-4 flex items-start gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
              {getInitials(post.user_name)}
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {post.user_name}
            </span>
          </div>
        </div>

        {expanded && (
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-sm text-black">{post.content}</p>
            {showReplies && onOpenDetail && (
              <button
                type="button"
                className="text-sm font-medium text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetail(post);
                }}
              >
                Ver respuestas
              </button>
            )}
          </div>
        )}

        {showActions && (
          <div className="flex items-center gap-6 border-t border-gray-100 pt-3 text-sm text-gray-500">
            <button
              type="button"
              className="flex items-center gap-2 rounded-md p-1 hover:cursor-pointer hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail?.(post);
              }}
            >
              <Icon icon="mdi:message-outline" width={18} />
              <span className="font-semibold text-gray-900">
                {post.replies_count ?? 0}
              </span>
              <span>Replies</span>
            </button>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Icon icon="mdi:eye-outline" width={18} />
              <span className="font-semibold text-gray-900">{post.views_count}</span>
              <span>Views</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLike?.(post.post_id);
              }}
              className={`flex items-center gap-2 rounded-full px-2 py-1 transition-colors ${
                isLiked ? "bg-gray-100 text-gray-500 cursor-default" : "hover:bg-gray-100"
              }`}
              disabled={isLiked}
            >
              <Icon icon="mdi:thumb-up-outline" width={18} />
              <span className="font-semibold text-gray-900">{post.upvotes_count}</span>
              <span>Upvotes</span>
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}