import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { dashboardService } from "../../services/dashboardService";
import { MOCK_POSTS_BY_CATEGORY } from "./mockReportData";
import "../../styles/admin.css";

interface PostCategoryStat {
  category: string;
  total_posts: number;
}

interface PostsByCategoryResponse {
  data?: PostCategoryStat[];
}

interface Props {
  data?: PostCategoryStat[];
  endpoint?: string;
  title?: string;
}

const PRIMARY_BAR_COLOR = "#002244";
const LIGHT_BAR_COLOR = "#b9cada";

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function mixColors(from: string, to: string, amount: number) {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const ratio = Math.min(Math.max(amount, 0), 1);

  const r = Math.round(start.r + (end.r - start.r) * ratio);
  const g = Math.round(start.g + (end.g - start.g) * ratio);
  const b = Math.round(start.b + (end.b - start.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

export default function PostsByCategoryChart({
  data: propData,
  endpoint,
  title = "Posts By Category",
}: Props) {
  const hasPropData = Boolean(propData?.length);
  const [data, setData] = useState<PostCategoryStat[]>(
    hasPropData ? propData! : MOCK_POSTS_BY_CATEGORY,
  );
  const [loading, setLoading] = useState<boolean>(!hasPropData);
  const [error, setError] = useState<string | null>(null);

  function normalizeRows(payload: PostCategoryStat[] | PostsByCategoryResponse): PostCategoryStat[] {
    const rows = Array.isArray(payload) ? payload : payload.data;

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row) => ({
      category: row.category,
      total_posts: Number(row.total_posts),
    }));
  }

  useEffect(() => {
    if (hasPropData) {
      setData(propData!);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    const request = endpoint
      ? fetch(endpoint).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
      : dashboardService.getPostsByCategory();

    request
      .then((payload: PostCategoryStat[] | PostsByCategoryResponse) => {
        if (!isMounted) return;

        const formatted = normalizeRows(payload);
        setData(formatted.length > 0 ? formatted : MOCK_POSTS_BY_CATEGORY);
        setLoading(false);
        setError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setData(MOCK_POSTS_BY_CATEGORY);
        setError(null);
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [endpoint, hasPropData, propData]);

  if (loading) return <p style={{ color: "#888", fontSize: 14 }}>Cargando...</p>;
  if (error) return <p style={{ color: "#e55", fontSize: 14 }}>Error: {error}</p>;

  const max = Math.max(...data.map((d) => d.total_posts));
  const chartHeight = Math.max(data.length * 44 + 40, 200);

  function getBarColor(totalPosts: number) {
    if (max <= 0) {
      return LIGHT_BAR_COLOR;
    }

    const valueRatio = totalPosts / max;
    const colorStrength = 0.18 + valueRatio * 0.82;

    return mixColors(LIGHT_BAR_COLOR, PRIMARY_BAR_COLOR, colorStrength);
  }

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-card-header">
        <h3 className="admin-chart-card-title">{title}</h3>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: "#888" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fontSize: 13, fill: "#555" }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip
            contentStyle={{ fontSize: 13, borderRadius: 8, border: "0.5px solid #e0e0e0" }}
            labelStyle={{ fontWeight: 500 }}
            formatter={(v: number) => [v, "Posts"]}
            cursor={{ fill: "rgba(0,34,68,0.06)" }}
          />
          <Bar dataKey="total_posts" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={getBarColor(entry.total_posts)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
