import { useEffect, useState } from "react";
import { getTopContributors } from "../../services/communityService";
import { getProfile } from "../../services/profileService";

interface Contributor {
  userId: string;
  name: string;
  postCount: number;
}

const TopContributors = () => {
    const [contributors, setContributors] = useState<Contributor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
      let isMounted = true;

      async function loadTopContributors() {
        try {
          setLoading(true);
          setError("");

          const data = await getTopContributors();

          const withProfiles = await Promise.all(
            data.map(async (item) => {
              const userId = item.user_id;
              const postCount = Number(item.post_count ?? 0);

              if (!userId) {
                return null;
              }

              try {
                const response = await getProfile(userId);
                const profileData = response;
                return {
                  userId,
                  name: profileData?.username || `User #${userId}`,
                  postCount,
                };
              } catch {
                return {
                  userId,
                  name: `User #${userId}`,
                  postCount,
                };
              }
            })
          ).then((results): Contributor[] =>
            results.filter((r): r is Contributor => r !== null)
          );

          if (isMounted) {
            setContributors(withProfiles);
          }
        } catch (err) {
          console.error("Error loading top contributors:", err);
          if (isMounted) {
            setError("No se pudieron cargar los top contributors.");
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

    if (loading) return <p className="py-4 text-center">Cargando top contributors...</p>;
    if (error) return <p className="py-4 text-center text-red-500">{error}</p>;

    return(
        <>
            <section className="w-full min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-3 pl-1 text-base font-semibold uppercase tracking-[0.08em] text-[#0B2A55] sm:text-lg">
                Top Contributors
              </h3>
              <ol className="space-y-2 text-sm text-[#334155]">
                {contributors.map((fan, index) => {
                  const rank = index + 1;
                  const isFirst = rank === 1;

                  return (
                    <li key={fan.userId} className="flex min-w-0 items-center gap-3 sm:gap-4">
                      <span
                        className={[
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:h-11 sm:w-11",
                          isFirst
                            ? "bg-[#4E8FD6] text-white"
                            : "bg-[#E5E7EB] text-[#0B2A55]",
                        ].join(" ")}
                      >
                        {rank}
                      </span>

                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-base font-semibold text-[#0B2A55] sm:text-lg">{fan.name}</p>
                        <p className="text-xs text-[#9AA4B2] sm:text-sm">{fan.postCount} posts</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
        </>
    );
} 

export default TopContributors;