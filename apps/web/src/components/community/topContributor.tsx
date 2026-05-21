import { Icon } from "@iconify/react";
import { FanOfWeek } from "../../types/community";
import { getFanOfWeek } from "../../services/communityService";
import { useEffect, useState } from "react";
import { getProfile } from "../../services/profileService";
import { Profile } from "../../types";
import { getInitials } from "../../utils/postUtils";

const formatNumber = (n: number | undefined) =>
  n == null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : n.toLocaleString();

export default function TopContributor() {
    const [fanOfWeek, setFanOfWeek] = useState<FanOfWeek | null>(null);
    const [topUser, setTopUser] = useState<Profile | null>(null);
    const [points, setPoints] = useState<number>(0);
    
    useEffect(() => {
        async function loadFanOfWeek() {
            try {
                const data = await getFanOfWeek();
                
                if (!data || data.user_id == null) {
                    console.error("Error getting user_id");
                    return;
                }
                setFanOfWeek(data);
                setPoints((data.upvotes_count ?? 0) * (data.post_count ?? 0));
                const response = await getProfile(data.user_id);
                const user = response;

                if (!user || !user.user_id) {
                  console.error("Error getting profile");
                  return;
                }

                setTopUser(user);
              } catch (error) {
                console.error("Error loading fan of the week ", error);
              }
        }

        void loadFanOfWeek();
    }, []);


  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:trophy-outline" width={22} className="text-[#0B2A55]" />
            <span className="text-sm font-semibold uppercase tracking-[0.08em] leading-none text-[#0B2A55]">
                Fan of the week
            </span>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div
              aria-hidden
              className="h-16 w-16 shrink-0 rounded-full flex items-center justify-center text-white font-bold"
              style={{
                background: "linear-gradient(135deg, #123B7A, #0B2A55)",
                boxShadow: "inset 0 -6px 18px rgba(0,0,0,0.14)",
                }}
            >
              <span className="text-lg">{getInitials(topUser?.username)}</span>
            </div>

            <div>
              <p  className="text-lg font-semibold text-[#0B2A55]">{topUser?.username}</p>
              <p className="text-sm text-slate-500">{points} points</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            {`Most active contributor this week with ${fanOfWeek?.post_count ?? 0} posts and ${formatNumber(
                fanOfWeek?.upvotes_count ?? 0
            )} upvotes!`}
          </p>
        </div>
      </div>
    </section>
  );
}