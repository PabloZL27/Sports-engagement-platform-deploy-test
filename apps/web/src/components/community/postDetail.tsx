// apps/web/src/components/community/PostDetail.tsx
import { Icon } from "@iconify/react";
import type { Post } from "../../types/community";
import { getInitials, getPostTime } from "../../utils/postUtils";

type Props = { post: Post };

const PostDetail = ({ post }: Props) => {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold uppercase text-slate-700">
          {post.category_name}
        </span>
        <span>· {getPostTime(post.created_at || "")}</span>
      </div>

      <h2 className="text-2xl font-bold text-[#0B2A55]">{post.title}</h2>

      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-full bg-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center">
          {getInitials(post.user_name)}
        </div>
        <div className="text-sm font-semibold text-[#0B2A55]">{post.user_name}</div>
      </div>

      <div className="text-sm text-black bg-gray-200 border rounded-lg p-3">{post.content}</div>

      <div className="flex items-center gap-6 text-xs text-slate-500">
        <span><Icon icon="mdi:message-outline" width={14} /> {post.replies_count} replies</span>
        <span><Icon icon="mdi:eye-outline" width={14} /> {post.views_count} views</span>
        <span><Icon icon="mdi:thumb-up-outline" width={14} /> {post.upvotes_count} upvotes</span>
      </div>
    </section>
  );
};

export default PostDetail;