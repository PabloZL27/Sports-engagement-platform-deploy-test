import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MOCK_MEMBER_STATS } from "./mockReportData";
import "../../styles/admin.css";

type ChartValue = string | number;

interface ChartRow {
  [key: string]: ChartValue;
}

interface ChartResponse {
  data?: ChartRow[];
}

interface Props {
  data?: ChartRow[];
  endpoint?: string;
  title?: string;
  xKey?: string;
  yKey?: string;
  tooltipLabel?: string;
  fallbackData?: ChartRow[];
  height?: number;
  stroke?: string;
  formatXValue?: (value: ChartValue) => ChartValue;
}

function formatMonthLabel(value: ChartValue): ChartValue {
  return new Date(value).toLocaleString("es", { month: "short", year: "2-digit" });
}

export default function MembersPerWeekChart({
  data: propData,
  endpoint,
  title = "New Members Per Month",
  xKey = "month",
  yKey = "new_members",
  tooltipLabel = "Nuevos miembros",
  fallbackData = MOCK_MEMBER_STATS,
  height = 260,
  stroke = "#3266ad",
  formatXValue = formatMonthLabel,
}: Props) {
  const hasPropData = Boolean(propData?.length);
  const [data, setData] = useState<ChartRow[]>(hasPropData ? propData! : fallbackData);
  const [loading, setLoading] = useState<boolean>(!hasPropData);

  function normalizeRows(payload: ChartRow[] | ChartResponse): ChartRow[] {
    const rows = Array.isArray(payload) ? payload : payload.data;

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row) => ({
      ...row,
      [xKey]: formatXValue(row[xKey]),
      [yKey]: Number(row[yKey]),
    }));
  }

  useEffect(() => {
    if (hasPropData) {
      setData(propData!);
      setLoading(false);
      return;
    }

    let isMounted = true;

    fetch(endpoint ?? "/api/dashboard/stats/members-per-month")
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((payload: ChartRow[] | ChartResponse) => {
        if (!isMounted) return;

        const formatted = normalizeRows(payload);

        setData(formatted.length > 0 ? formatted : fallbackData);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setData(fallbackData);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [endpoint, fallbackData, formatXValue, hasPropData, propData, xKey, yKey]);

  if (loading) return <p style={{ color: "#888", fontSize: 14 }}>Cargando...</p>;

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-card-header">
        <h3 className="admin-chart-card-title">{title}</h3>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: "#888" }}
            axisLine={false}
            tickLine={false}
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
            formatter={(v) => [v, tooltipLabel]}
          />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={stroke}
            strokeWidth={2}
            dot={{ r: 4, fill: stroke, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
