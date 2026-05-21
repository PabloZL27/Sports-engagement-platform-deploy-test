import { apiFetch } from "./api";
import type { ApiListResponse, TopContributor } from "../types/community";

export interface NewAccountStat {
  username: string;
  joined_ago: string;
}

export interface TotalMembersStat {
  total_members: number;
  new_this_week: number;
  trend: "green" | "red" | "gray";
}

export interface TotalPostsStat {
  total_posts: number;
  new_today: number;
  trend: "green" | "red" | "gray";
}

export interface StoreProductsResponse {
  status: string;
  products: unknown[];
}

export interface TotalProductsStat {
  total_products: number;
  trend: "green" | "red" | "gray";
}

export const dashboardService = {
  async getMembersPerMonth() {
    return apiFetch('/api/dashboard/stats/members-per-month');
  },

  async getNewAccounts() {
    return apiFetch<NewAccountStat[]>('/api/dashboard/stats/new-accounts');
  },

  async getTotalMembers() {
    return apiFetch<TotalMembersStat>('/api/dashboard/stats/total-members');
  },

  async getTotalPosts() {
    return apiFetch<TotalPostsStat>('/api/dashboard/stats/total-posts');
  },

  async getTotalProducts() {
    return apiFetch<TotalProductsStat>('/api/dashboard/stats/total-products');
  },

  async getPostsPerDay() {
    return apiFetch('/api/dashboard/stats/posts-per-day');
  },

  async getPostsByCategory() {
    return apiFetch('/api/dashboard/stats/posts-by-category');
  },

  async getTopContributors() {
    return apiFetch<ApiListResponse<TopContributor[]>>('/api/dashboard/top_contributors');
  }

};
