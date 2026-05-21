import { apiFetch } from "./api";

export type NewsArticle = {
  url: string;
  title: string;
  urlToImage: string;
  description: string;
  publishedAt: string;
};

type NewsServiceResponse = {
  articles: NewsArticle[];
};

type NewsSyncResponse = {
  service: string;
  status: string;
  query: string;
  receivedCount: number;
  insertedSources: number;
  insertedArticles: number;
};

export async function getNewsArticles(): Promise<NewsArticle[]> {
  const data = await apiFetch<NewsServiceResponse>("/news/");

  return data.articles;
}

export async function getPopularNewsArticle(): Promise<NewsArticle | null> {
  const data = await apiFetch<NewsServiceResponse>("/news/popular-one");

  return data.articles[0] || null;
}

export async function syncNewsArticles(): Promise<NewsSyncResponse> {
  return apiFetch<NewsSyncResponse>("/news/articles/sync", {
    method: "POST",
  });
}
