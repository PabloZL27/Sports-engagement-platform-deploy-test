import { Post } from "../types/community";

export const getInitials = (name?: string | null) => {
    if (!name) return "U";

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  };

export const getPostTime = (createdAt: string) => {
    const now = new Date();
    const postTime = new Date(createdAt);
    const diffMs = now.getTime() - postTime.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return postTime.toLocaleDateString();
};

export const filteredPosts = (posts: Post[], filter: "hot"|"new"|"top") => {
    const sorted = [...posts];

    if (filter === "hot") {
      sorted.sort((a, b) => {
        const scoreA = a.upvotes_count + a.views_count * 0.1;
        const scoreB = b.upvotes_count + b.views_count * 0.1;
        return scoreB - scoreA;
      });
    } else if (filter === "new") {
      sorted.sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (filter === "top") {
      sorted.sort((a, b) => b.upvotes_count - a.upvotes_count);
    }

    return sorted;
};

