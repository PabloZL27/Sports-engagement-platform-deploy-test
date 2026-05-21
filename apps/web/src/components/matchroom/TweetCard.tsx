import type { Tweet } from '../../types/tweet';

export function TweetCard({ tweet }: { tweet: Tweet }) {
  return (
    <article
      className="tweet-card"
      style={{
        border: '1px solid #e1e8ed',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        backgroundColor: '#fff',
        color: '#14171a',
        textAlign: 'left',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 8,
        }}
      >
        {tweet.author.profilePicture?.trim()?.startsWith('http') ? (
          <img
            src={tweet.author.profilePicture}
            alt={tweet.author.name}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: '#1da1f2',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 600,
            }}
            aria-hidden
          >
            {tweet.author.name?.charAt(0)?.toUpperCase() || '@'}
          </div>
        )}
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{tweet.author.name}</strong>
          <span style={{ color: '#657786', fontSize: 14, overflowWrap: 'anywhere' }}>
            @{tweet.author.userName}
          </span>
        </div>
      </header>
      <p
        style={{
          margin: '8px 0',
          lineHeight: 1.5,
          color: '#14171a',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {tweet.text}
      </p>
      <footer
        style={{
          color: '#657786',
          fontSize: 14,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px 16px',
          marginTop: 8,
          minWidth: 0,
        }}
      >
        <span>❤️ {tweet.likeCount}</span>
        <span>🔁 {tweet.retweetCount}</span>
        <span>💬 {tweet.replyCount}</span>
        <a
          href={tweet.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginLeft: 'auto', color: '#1da1f2', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          Ver en X →
        </a>
      </footer>
    </article>
  );
}