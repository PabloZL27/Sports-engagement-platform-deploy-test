import type { ReactNode } from "react";

interface PostsScrollPanelProps {
  children: ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}

const PostsScrollPanel = ({
  children,
  emptyMessage = "No posts yet.",
  isEmpty = false,
}: PostsScrollPanelProps) => {
  return (
    <section
      aria-label="Community posts"
      className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none"
    >
      <div className="max-h-[min(68vh,580px)] overflow-x-hidden overflow-y-auto p-3 sm:max-h-[min(74vh,680px)] sm:p-4 lg:max-h-[80vh] lg:p-0 lg:pr-1">
        {isEmpty ? (
          <p className="py-10 text-center text-sm text-gray-500">{emptyMessage}</p>
        ) : (
          <div className="space-y-3 sm:space-y-4 lg:space-y-4">{children}</div>
        )}
      </div>
    </section>
  );
};

export default PostsScrollPanel;
