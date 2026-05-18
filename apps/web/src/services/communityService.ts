import { apiFetch } from "./profile";
import {  
  ApiItemResponse, 
  ApiListResponse,
  Post, 
  PostPayload, 
  EditPostPayload, 
  Comment, 
  CommentPayload, 
  EditCommentPayload, 
  TopContributor, 
  FanOfWeek 
} from "../types/community";

export async function getPosts(): Promise<Post[]> {
  const data = await apiFetch<ApiListResponse<Post[]>>("/community/get_posts");
  return data.result;
}

export async function incrementPostView(postId: number): Promise<number> {
  const data = await apiFetch<ApiItemResponse<{ post_id: number; views_count: number }>>("/community/increment_post_view", {
    method: "PATCH",
    body: JSON.stringify({ post_id: postId }),
  });

  return data.result.views_count;
}

export async function incrementPostUpvote(postId: number): Promise<number> {
  const data = await apiFetch<ApiItemResponse<{ post_id: number; upvotes_count: number }>>("/community/increment_post_upvote", {
    method: "PATCH",
    body: JSON.stringify({ post_id: postId }),
  });

  return data.result.upvotes_count;
}

export async function createPost(payload: PostPayload): Promise<Post> {
  const data = await apiFetch<ApiItemResponse<Post>>("/community/new_post", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data.result;
}

export async function deletePost(postId: number): Promise<Post[]> {
  const data = await apiFetch<ApiListResponse<Post[]>>("/community/delete_post", {
    method: "DELETE",
    body: JSON.stringify({ post_id: postId }),
  });

  return data.result;
}

export async function editPost(payload: EditPostPayload): Promise<Post[]> {
  const data = await apiFetch<ApiListResponse<Post[]>>("/community/edit_post", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return data.result;
}

export async function getPostComments(postId: number): Promise<Comment[]> {
  const data = await apiFetch<ApiListResponse<Comment[]>>(
    `/community/get_post_comments?post_id=${postId}`
  );

  return data.result;
}

export async function createComment(payload: CommentPayload): Promise<Comment[]> {
  const data = await apiFetch<ApiListResponse<Comment[]>>("/community/create_comment", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data.result;
}

export async function deleteComment(replyId: number): Promise<Comment[]> {
  const data = await apiFetch<ApiListResponse<Comment[]>>("/community/delete_reply", {
    method: "DELETE",
    body: JSON.stringify({ reply_id: replyId }),
  });

  return data.result;
}

export async function editComment(payload: EditCommentPayload): Promise<Comment[]> {
  const data = await apiFetch<ApiListResponse<Comment[]>>("/community/edit_comment", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return data.result;
}

export async function incrementReplyUpvote(replyId: number): Promise<number> {
  const data = await apiFetch<ApiItemResponse<{ reply_id: number; upvotes_count: number }>>(
    "/community/increment_reply_upvote",
    {
      method: "PATCH",
      body: JSON.stringify({ reply_id: replyId })
    }
  );

  return data.result.upvotes_count;
}

export async function getUserPosts(): Promise<Post[]> {
  const data = await apiFetch<ApiListResponse<Post[]>>(
    `/community/user_posts`
  );

  return data.result;
}

export async function getTopContributors(): Promise<TopContributor[]> {
  const data = await apiFetch<ApiListResponse<TopContributor[]>>("/community/top_contributors");
  return data.result;
}

export async function getFanOfWeek(): Promise<FanOfWeek | null> {
  const data = await apiFetch<ApiListResponse<FanOfWeek[]>>("/community/fan_of_week");
  return data.result[0] ?? null;
}