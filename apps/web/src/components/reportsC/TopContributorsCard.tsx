import { useEffect, useState } from "react";
import { dashboardService } from "../../services/dashboardService";
import { getProfile } from "../../services/profileService";
import type { ApiListResponse, TopContributor } from "../../types/community";
import "../../styles/admin.css";

interface ContributorView {
  userId: string;
  name: string;
  postCount: number;
}

function normalizeRows(payload: TopContributor[] | ApiListResponse<TopContributor[]>): TopContributor[] {
  const rows = Array.isArray(payload) ? payload : payload.result;

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows;
}

export default function TopContributorsCard() {
  const [contributors, setContributors] = useState<ContributorView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTopContributors() {
      try {
        setLoading(true);
        setError(null);

        const payload = await dashboardService.getTopContributors();
        const rows = normalizeRows(payload).slice(0, 5);

        const withProfiles = await Promise.all(
          rows.map(async (item) => {
            const userId = item.user_id;
            const postCount = Number(item.post_count ?? 0);

            if (!userId) {
              return null;
            }

            try {
              const profile = await getProfile(userId);

              return {
                userId,
                name: profile?.username || `User #${userId}`,
                postCount,
              };
            } catch {
              return {
                userId,
                name: `User #${userId}`,
                postCount,
              };
            }
          }),
        );

        if (!isMounted) return;

        setContributors(withProfiles.filter((item): item is ContributorView => item !== null));
      } catch (err) {
        console.error("Error loading dashboard top contributors:", err);
        if (isMounted) {
          setError("No se pudieron cargar los contributors.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadTopContributors();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <p className="admin-card-message">Cargando top contributors...</p>;
  }

  if (error) {
    return <p className="admin-card-message admin-card-message-error">{error}</p>;
  }

  return (
    <section className="admin-top-contributors-card">
      <div className="admin-chart-card-header">
        <h3 className="admin-chart-card-title">Top Contributors</h3>
      </div>

      {contributors.length === 0 ? (
        <p className="admin-card-message">No hay contributors todavía.</p>
      ) : (
        <ol className="admin-top-contributors-list">
          {contributors.map((contributor, index) => {
            const rank = index + 1;

            return (
              <li key={contributor.userId} className="admin-top-contributors-item">
                <span className="admin-top-contributors-rank">{rank}</span>
                <div className="admin-top-contributors-details">
                  <p className="admin-top-contributors-name">{contributor.name}</p>
                  <p className="admin-top-contributors-meta">{contributor.postCount} posts</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
