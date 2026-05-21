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
import { MOCK_POSTS_PER_DAY } from "./mockReportData";
import "../../styles/admin.css";

interface PostStat {
  day: string;
  total_posts: number;
}

interface PostsPerDayResponse {
  data?: PostStat[];
}

interface Props {
  data?: PostStat[];
  endpoint?: string;
  title?: string;
}

export default function PostsPerDayChart({
  data: propData,
  endpoint,
  title = "Posts Per Day",
}: Props) {
  const hasPropData = Boolean(propData?.length);
  const [data, setData] = useState<PostStat[]>(hasPropData ? propData! : MOCK_POSTS_PER_DAY);
  const [loading, setLoading] = useState<boolean>(!hasPropData);

  function normalizeRows(payload: PostStat[] | PostsPerDayResponse): PostStat[] {
    const rows = Array.isArray(payload) ? payload : payload.data;

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row) => ({
      day: new Date(row.day).toLocaleDateString("es", { month: "short", day: "numeric" }),
      total_posts: Number(row.total_posts),
    }));
  }

  useEffect(() => {
    if (hasPropData) {
      setData(propData!);
      setLoading(false);
      return;
    }

    let isMounted = true;

    fetch(endpoint ?? "/api/dashboard/stats/posts-per-day")
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((payload: PostStat[] | PostsPerDayResponse) => {
        if (!isMounted) return;

        const formatted = normalizeRows(payload);

        setData(formatted.length > 0 ? formatted : MOCK_POSTS_PER_DAY);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setData(MOCK_POSTS_PER_DAY);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [endpoint, hasPropData, propData]);

  if (loading) return <p style={{ color: "#888", fontSize: 14 }}>Cargando...</p>;

  const max = Math.max(...data.map((d) => d.total_posts));

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-card-header">
        <h3 className="admin-chart-card-title">{title}</h3>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "#888" }}
            axisLine={false}
            tickLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#888" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{ fontSize: 13, borderRadius: 8, border: "0.5px solid #e0e0e0" }}
            labelStyle={{ fontWeight: 500 }}
            formatter={(v) => [v, "Posts"]}
            cursor={{ fill: "rgba(53, 118, 183, 0.06)" }}
          />
          <Bar dataKey="total_posts" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.total_posts === max ? "#4e83b7" : "#8bb1d7"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
