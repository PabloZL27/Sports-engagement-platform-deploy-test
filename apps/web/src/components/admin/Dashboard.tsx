import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import MembersPerWeekChart from "../reportsC/ChartCard";
import StatsCard, { type StatsTrend } from "../reportsC/StatsCard";
import SectionCard from "../reportsC/SectionCard";
import PostsByCategoryChart from "../reportsC/PostsByCatChart";
import TopContributorsCard from "../reportsC/TopContributorsCard";
import { MOCK_POSTS_PER_DAY } from "../reportsC/mockReportData";
import React from "react";
import {
  dashboardService,
  type ActiveReportsStat,
  type TotalMembersStat,
  type TotalPostsStat,
  type TotalProductsStat,
} from "../../services/dashboardService";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import titanLogo from "../../assets/home/TitanCrewLogo.png";

const REPORT_READY_TIMEOUT_MS = 6000;
const REPORT_RENDER_SETTLE_MS = 450;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

async function waitForReportReady(element: HTMLElement) {
  if ("fonts" in document) {
    await document.fonts.ready;
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt < REPORT_READY_TIMEOUT_MS) {
    const reportText = element.textContent ?? "";
    const hasLoadingText = /Cargando|Loading|\.\.\./i.test(reportText);

    if (!hasLoadingText) {
      break;
    }

    await wait(150);
  }

  await waitForNextPaint();
  await wait(REPORT_RENDER_SETTLE_MS);
  await waitForNextPaint();
}

function formatPostDayLabel(value: string | number): string {
  return new Date(value).toLocaleDateString("es", {
    month: "short",
    day: "numeric",
  });
}

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
  const printRef = React.useRef<HTMLDivElement | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleDownloadPdf = async () => {
    const element = printRef.current;

    if (!element) {
      return;
    }

    setIsGeneratingReport(true);

    try {
      await waitForReportReady(element);

      const canvas = await html2canvas(element, {
        scale: 2,
      });

      const data = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // =========================
      // HEADER
      // =========================

      // Logo
      pdf.addImage(
        titanLogo,
        "PNG",
        20, 15, 40, 40
      );

      // Nombre de la aplicación
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.text("Titan Crew", 70, 32);

      // Título del reporte
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(14);
      pdf.text("Administrative Dashboard", 70, 52);

      // Fecha (esquina superior derecha)
      pdf.setFontSize(10);

      pdf.text(
        `Generated: ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        pageWidth - 150,
        25
      );

      // Línea divisoria
      pdf.line(20, 70, pageWidth - 20, 70);

      // =========================
      // DASHBOARD IMAGE
      // =========================

      const imgProperties = pdf.getImageProperties(data);

      const imageWidth = pageWidth - 50;
      const xPosition = (pageWidth - imageWidth) / 2;

      const imageHeight =
        (imgProperties.height * imageWidth) /
        imgProperties.width;

      const headerHeight = 95;

      pdf.addImage(
        data,
        "PNG",
        xPosition,
        headerHeight,
        imageWidth,
        imageHeight
      );

      // =========================
      // FOOTER
      // =========================

      pdf.setFontSize(9);

      pdf.text(
        "Titan Crew - Administrative Dashboard Report",
        20,
        pageHeight - 15
      );

      pdf.save("ADMIN_Report.pdf");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const [totalMembers, setTotalMembers] = useState<TotalMembersStat | null>(
    null,
  );
  const [totalPosts, setTotalPosts] = useState<TotalPostsStat | null>(null);
  const [activeReports, setActiveReports] = useState<ActiveReportsStat | null>(
    null,
  );
  const [totalProducts, setTotalProducts] = useState<TotalProductsStat | null>(
    null,
  );
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStatsCards() {
      try {
        setStatsLoading(true);
        const [membersResult, postsResult, activeReportsResult, productsResult] =
          await Promise.allSettled([
            dashboardService.getTotalMembers(),
            dashboardService.getTotalPosts(),
            dashboardService.getActiveReports(),
            dashboardService.getTotalProducts(),
          ]);

        if (!isMounted) return;

        if (membersResult.status === "fulfilled") {
          setTotalMembers(membersResult.value);
        }

        if (postsResult.status === "fulfilled") {
          setTotalPosts(postsResult.value);
        }

        if (activeReportsResult.status === "fulfilled") {
          setActiveReports(activeReportsResult.value);
        }

        if (productsResult.status === "fulfilled") {
          setTotalProducts(productsResult.value);
        }

        if (
          membersResult.status === "rejected" ||
          postsResult.status === "rejected" ||
          activeReportsResult.status === "rejected" ||
          productsResult.status === "rejected"
        ) {
          console.error("Error loading one or more dashboard stats cards:", {
            members:
              membersResult.status === "rejected" ? membersResult.reason : null,
            posts:
              postsResult.status === "rejected" ? postsResult.reason : null,
            activeReports:
              activeReportsResult.status === "rejected"
                ? activeReportsResult.reason
                : null,
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
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        <div className="min-w-0">
          <h2 className="m-0 text-lg font-extrabold uppercase tracking-[1px] text-[#0d1f3c] sm:text-[22px]">
            Dashboard
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-[#9aa3b2]">
            Admin overview and management tools will appear here
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isGeneratingReport}
          className="mr-10 mt-5 flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-[#4B92DB] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3A7FC5] disabled:cursor-not-allowed disabled:bg-[#8bb1d7]"
        >
          <Icon icon="mdi:download" className="text-lg" />
          {isGeneratingReport ? "Preparing..." : "Download Report"}
        </button>
      </div>

      <div
        ref={printRef}
        className="flex flex-col gap-4 rounded-2xl bg-white p-3 shadow-[0_10px_30px_rgba(0,0,0,0.08)] sm:rounded-[24px] sm:p-4"
      >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            <StatsCard
              title="ACTIVE REPORTS"
              value={
                statsLoading
                  ? "..."
                  : (activeReports?.active_reports ?? 0).toLocaleString()
              }
              changeLabel={`+${activeReports?.new_today ?? 0} today`}
              trend={resolveStatsTrend(
                activeReports?.trend,
                activeReports?.new_today,
              )}
            />
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard />
            <div className="rounded-xl bg-[#f7f8fc] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <MembersPerWeekChart />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-[#f7f8fc] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <MembersPerWeekChart
                endpoint="/api/dashboard/stats/posts-per-day"
                fallbackData={MOCK_POSTS_PER_DAY}
                formatXValue={formatPostDayLabel}
                height={240}
                stroke="#4e83b7"
                title="Posts Per Day"
                tooltipLabel="Posts"
                xKey="day"
                yKey="total_posts"
              />
            </div>
            <div className="rounded-xl bg-[#f7f8fc] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <TopContributorsCard />
            </div>
          </div>

          <div className="rounded-xl bg-[#f7f8fc] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <PostsByCategoryChart />
          </div>
      </div>
    </div>
  );
}
