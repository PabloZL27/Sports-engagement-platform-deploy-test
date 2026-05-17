import { useState } from "react";
import { Card } from "@heroui/react";
import GridCard from "../community-reports/GridCard";
import ReportPost from "../community-reports/ReportPost";

type ReportFilterKey = "all" | "pending" | "critical" | "resolved";

const reportFilterLabel: Record<ReportFilterKey, string> = {
  all: "All",
  pending: "Pending",
  critical: "Critical",
  resolved: "Resolved",
};

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-[#0d1f3c] bg-[#0d1f3c] text-white"
          : "border-[#d0d4e0] bg-white text-[#3a4560]"
      }`}
    >
      {label}
    </button>
  );
}

function PostManagement() {
  const [filter, setFilter] = useState<ReportFilterKey>("all");

  return (
    <div className="w-full">
      <div className="mb-7">
        <h2 className="m-0 text-[2.15rem] font-extrabold leading-[1.05] text-[#0b2e63]">
          COMMUNITY REPORTS
        </h2>
        <p className="mt-[10px] text-[0.95rem] text-[#9aa3af]">
          General overview of activity and community management
        </p>
      </div>

      <Card className="rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        <div className="px-4 py-4">
          <div className="mb-5 grid grid-cols-3 gap-3 max-[1200px]:grid-cols-2 max-[640px]:grid-cols-1">
            <GridCard />
            <GridCard />
            <GridCard />
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["all", "pending", "critical", "resolved"] as ReportFilterKey[]).map(
              (f) => (
                <FilterChip
                  key={f}
                  label={reportFilterLabel[f]}
                  active={filter === f}
                  onClick={() => setFilter(f)}
                />
              ),
            )}
          </div>
          <ReportPost></ReportPost>
        </div>
      </Card>
    </div>
  );
}

export default PostManagement;
