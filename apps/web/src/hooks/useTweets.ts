import { useState, useCallback } from 'react';
import type { Tweet } from '../types/tweet';

const API_URL = '/api/tweets';

export function useTweets() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTweets = useCallback(async (hashtag: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}?hashtag=${encodeURIComponent(hashtag)}&limit=10`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener tweets');
      }
      const data = await res.json();
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
