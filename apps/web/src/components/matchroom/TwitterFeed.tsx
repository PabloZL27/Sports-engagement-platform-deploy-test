import { useState } from 'react';
import { useTweets } from '../../hooks/useTweets';
import { TweetCard } from './TweetCard';

export function TwitterFeed() {
  const [isActive, setIsActive] = useState(false);
  const { tweets, loading, error, fetchTweets } = useTweets();

  const handleActivate = () => {
    setIsActive(true);
    fetchTweets('TitansCrew');
  };

  const handleRefresh = () => {
    fetchTweets('TitansCrew');
  };

  return (
    <div className="twitter-feed">
        <div className="twitter-feed__header">
            <h3>Use #TitansCrew on X to show up in the feed</h3>
            <div className="twitter-feed__actions">
                {!isActive? (
                    <button
                    onClick={handleActivate}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#1da1f2',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                    >
                        Activate feed
                    </button>
                ):(

                <button
                onClick={handleRefresh}
                disabled={loading}
                style={{
                    padding: '8px 16px',
                    backgroundColor: loading ? '#ccc' : '#1da1f2',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                }}
                >
                {loading ? "Loading..." : "Refresh"}
                </button>
                )}
            </div>
        </div>

        {error && (
            <p className="twitter-feed__error" style={{color: 'red', padding:12, backgroundColor: '#fee'}}>
                {error}
            </p>
        )}

        <div className="twitter-feed__list">
            {tweets.map((tweet) => (
                <TweetCard key={tweet.id} tweet={tweet} />
            ))}

            {!isActive && !loading && tweets.length === 0 && (
                <p style={{ textAlign: 'center', color: '#657786', padding: 32 }}>
                    Tap &quot;Activate feed&quot; to load the latest #TitansCrew tweets
                </p>
            )}

            {isActive && !loading && tweets.length === 0 && !error && (
                <p style={{ textAlign: 'center', color: '#657786', padding: 32 }}>
                    No recent tweets found
                </p>
            )}
        </div>
    </div>
  );
}
