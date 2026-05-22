import { useState } from "react";
import { Icon } from "@iconify/react";
import { useTweets } from "../../hooks/useTweets";
import { TweetCard } from "./TweetCard";

export function TwitterFeed() {
  const [isActive, setIsActive] = useState(false);
  const { tweets, loading, error, fetchTweets } = useTweets();

  const handleActivate = () => {
    setIsActive(true);
    fetchTweets("TitansCrew");
  };

  const handleRefresh = () => {
    fetchTweets("TitansCrew");
  };

  return (
    <div className="twitter-feed">
      <div className="twitter-feed__header">
        <div>
          <h3>#TitansCrew on X</h3>
          <span className="twitter-feed__tag">
            <Icon icon="mdi:twitter" width={16} />
            Live fan feed
          </span>
        </div>
        <div className="twitter-feed__actions">
          {!isActive ? (
            <button
              type="button"
              className="twitter-feed__btn"
              onClick={handleActivate}
            >
              Activate feed
            </button>
          ) : (
            <button
              type="button"
              className="twitter-feed__btn"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="twitter-feed__error">{error}</p>}

      <div className="twitter-feed__list">
        {tweets.map((tweet) => (
          <TweetCard key={tweet.id} tweet={tweet} />
        ))}

        {!isActive && !loading && tweets.length === 0 && (
          <div className="twitter-feed__empty">
            <div className="twitter-feed__empty-icon" aria-hidden>
              <Icon icon="mdi:twitter" width={28} />
            </div>
            <p className="twitter-feed__empty-title">Join the conversation</p>
            <p className="twitter-feed__empty-text">
              Tap &quot;Activate feed&quot; to load the latest #TitansCrew tweets from X.
            </p>
          </div>
        )}

        {isActive && !loading && tweets.length === 0 && !error && (
          <div className="twitter-feed__empty">
            <p className="twitter-feed__empty-title">No tweets yet</p>
            <p className="twitter-feed__empty-text">
              Post with #TitansCrew on X to show up here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
