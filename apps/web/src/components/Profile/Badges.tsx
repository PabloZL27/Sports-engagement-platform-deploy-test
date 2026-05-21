import type { UserBadge } from "../../services/profile";

type BadgesProps = {
  badges: UserBadge[];
  isLoading?: boolean;
  error?: string | null;
};

export default function Badges({
  badges,
  isLoading = false,
  error = null,
}: BadgesProps) {
  if (isLoading) {
    return (
      <div className="badges-section">
        <div className="badges-header">
          <h2>ACHIEVEMENT BADGES</h2>
          <p>Unlock badges by completing challenges</p>
        </div>
        <p>Loading badges...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="badges-section">
        <div className="badges-header">
          <h2>ACHIEVEMENT BADGES</h2>
          <p>Unlock badges by completing challenges</p>
        </div>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="badges-section">
      <div className="badges-header">
        <h2>ACHIEVEMENT BADGES</h2>
        <p>Unlock badges by completing challenges</p>
      </div>

      {badges.length === 0 ? (
        <div className="badges-empty-state">
          <p>No badges unlocked yet.</p>
        </div>
      ) : (
        <div className="badges-grid">
          {badges.map((badge) => (
            <div key={badge.badge_id} className="badge-card">
              <div className="badge-icon-wrapper">
                {badge.icon_url ? (
                  <img
                    src={badge.icon_url}
                    alt={badge.name}
                    className="badge-icon-image"
                  />
                ) : (
                  <div className="badge-icon-fallback">🏅</div>
                )}
              </div>

              <h3>{badge.name}</h3>
              <p className="badge-status">UNLOCKED</p>
              <p className="badge-description">
                {badge.description || "Badge unlocked"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}