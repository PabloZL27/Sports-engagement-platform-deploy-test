import { useEffect, useState } from "react";
import { Card } from "@heroui/react";
import MembersPerWeekChart from "../reportsC/ChartCard";
import StatsCard, { type StatsTrend } from "../reportsC/StatsCard";
import SectionCard from "../reportsC/SectionCard";
import PostsPerDayChart from "../reportsC/PostPerDayChart";
import PostsByCategoryChart from "../reportsC/PostsByCatChart";
import TopContributorsCard from "../reportsC/TopContributorsCard";
import {
  dashboardService,
  type TotalMembersStat,
  type TotalPostsStat,
  type TotalProductsStat,
} from "../../services/dashboardService";

function resolveStatsTrend(
  trend: StatsTrend | undefined,
  count: number | undefined,
): StatsTrend {
  if (trend) {
    return trend;
  }

  return Number(count ?? 0) > 0 ? "green" : "gray";
}

export default function Dashboard() {
  const [totalMembers, setTotalMembers] = useState<TotalMembersStat | null>(
    null,
  );
  const [totalPosts, setTotalPosts] = useState<TotalPostsStat | null>(null);
  const [totalProducts, setTotalProducts] = useState<TotalProductsStat | null>(
    null,
  );
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStatsCards() {
      try {
        setStatsLoading(true);
        const [membersResult, postsResult, productsResult] =
          await Promise.allSettled([
            dashboardService.getTotalMembers(),
            dashboardService.getTotalPosts(),
            dashboardService.getTotalProducts(),
          ]);

        if (!isMounted) return;

        if (membersResult.status === "fulfilled") {
          setTotalMembers(membersResult.value);
        }

        if (postsResult.status === "fulfilled") {
          setTotalPosts(postsResult.value);
        }

        if (productsResult.status === "fulfilled") {
          setTotalProducts(productsResult.value);
        }

        if (
          membersResult.status === "rejected" ||
          postsResult.status === "rejected" ||
          productsResult.status === "rejected"
        ) {
          console.error("Error loading one or more dashboard stats cards:", {
            members:
              membersResult.status === "rejected" ? membersResult.reason : null,
            posts:
              postsResult.status === "rejected" ? postsResult.reason : null,
            products:
              productsResult.status === "rejected"
                ? productsResult.reason
                : null,
          });
        }
      } catch (error) {
        console.error("Error loading dashboard stats cards:", error);
      } finally {
        if (isMounted) {
          setStatsLoading(false);
        }
      }
    }

    void loadStatsCards();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="w-full">
      <div className="mb-7">
        <h2 className="m-0 text-[2.15rem] font-extrabold leading-[1.05] text-[#0b2e63]">
          DASHBOARD
        </h2>
        <p className="mt-[10px] text-[0.95rem] text-[#9aa3af]">
          Admin overview and management tools will appear here
        </p>
      </div>

      <Card className="rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        <div className="px-4 py-4">
          <div className="mb-5 grid grid-cols-4 gap-3 max-[1200px]:grid-cols-2 max-[640px]:grid-cols-1">
            <StatsCard
              title="TOTAL MEMBERS"
              value={
                statsLoading
                  ? "..."
                  : (totalMembers?.total_members ?? 0).toLocaleString()
              }
              changeLabel={`+${totalMembers?.new_this_week ?? 0} this week`}
              trend={resolveStatsTrend(
                totalMembers?.trend,
                totalMembers?.new_this_week,
              )}
            />
            <StatsCard
              title="TOTAL POSTS"
              value={
                statsLoading
                  ? "..."
                  : (totalPosts?.total_posts ?? 0).toLocaleString()
              }
              changeLabel={`+${totalPosts?.new_today ?? 0} today`}
              trend={resolveStatsTrend(totalPosts?.trend, totalPosts?.new_today)}
            />
            <StatsCard />
            <StatsCard
              title="TOTAL PRODUCTS"
              value={
                statsLoading
                  ? "..."
                  : (totalProducts?.total_products ?? 0).toLocaleString()
              }
              changeLabel="Available Online"
              trend={"gray"}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <SectionCard />
            <div className="rounded-xl bg-[#f7f8fc] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <MembersPerWeekChart />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#f7f8fc] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <TopContributorsCard />
            </div>
            <div className="rounded-xl bg-[#f7f8fc] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <PostsPerDayChart />
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-[#f7f8fc] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <PostsByCategoryChart />
          </div>
        </div>
      </Card>
    </div>
  );
}
