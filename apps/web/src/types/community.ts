export type Post = {
  post_id: number;
  user_id: string;
  user_name: string | null;
  category_name: string;
  title: string;
  content: string;
  views_count: number;
  upvotes_count: number;
  replies_count: number | null;
  created_at?: string;
};

export type PostPayload = {
  user_id?: string | null;
  category_name: string;
  title: string;
  content: string;
};

export type EditPostPayload = {
  post_id: number;
  new_category_name?: string | null;
  new_title?: string | null;
  new_content?: string | null;
};

export type Comment = {
  reply_id: number;
  post_id: number;
  user_id?: string;
  user_name?: string | null;
  content: string;
  upvotes_count: number;
  created_at?: string;
};

export type CommentPayload = {
  post_id: number;
  user_id: string;
  content: string;
};

export type EditCommentPayload = {
  reply_id: number;
  new_content: string;
};

export type TopContributor = {
  user_id: string;
  post_count: number;
};

export type FanOfWeek = {
  user_id: string;
  post_count: number;
  upvotes_count: number;
};

export type ApiListResponse<T> = {
  success: boolean;
  result: T;
};

export type ApiItemResponse<T> = {
  success: boolean;
  result: T;
};