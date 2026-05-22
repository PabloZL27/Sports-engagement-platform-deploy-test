import { useState, useCallback } from 'react';
import type { Tweet } from '../types/tweet';
import { apiFetch } from '../services/api';

type TweetsResponse = {
  tweets?: Tweet[];
};

export function useTweets() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTweets = useCallback(async (hashtag: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<TweetsResponse>(
        `/tweets?hashtag=${encodeURIComponent(hashtag)}&limit=10`
      );
      setTweets(data.tweets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
      setTweets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { tweets, loading, error, fetchTweets };
}
