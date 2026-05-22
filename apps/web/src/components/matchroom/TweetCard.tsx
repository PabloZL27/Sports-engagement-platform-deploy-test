import type { Tweet } from "../../types/tweet";

export function TweetCard({ tweet }: { tweet: Tweet }) {
  const hasAvatar = tweet.author.profilePicture?.trim()?.startsWith("http");

  return (
    <article className="tweet-card">
      <header className="tweet-card__header">
        {hasAvatar ? (
          <img
            src={tweet.author.profilePicture}
            alt={tweet.author.name}
            className="tweet-card__avatar"
          />
        ) : (
          <div className="tweet-card__avatar tweet-card__avatar--fallback" aria-hidden>
            {tweet.author.name?.charAt(0)?.toUpperCase() || "@"}
          </div>
        )}
        <div className="tweet-card__author">
          <strong className="tweet-card__author-name">{tweet.author.name}</strong>
          <span className="tweet-card__author-handle">@{tweet.author.userName}</span>
        </div>
      </header>
      <p className="tweet-card__text">{tweet.text}</p>
      <footer className="tweet-card__footer">
        <span>❤️ {tweet.likeCount}</span>
        <span>🔁 {tweet.retweetCount}</span>
        <span>💬 {tweet.replyCount}</span>
        <a
          href={tweet.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tweet-card__link"
        >
          View on X →
        </a>
      </footer>
    </article>
  );
}
