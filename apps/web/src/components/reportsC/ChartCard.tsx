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

interface MemberStat {
  month: string;
  new_members: number;
}

interface MembersPerMonthResponse {
  data?: MemberStat[];
}

interface Props {
  data?: MemberStat[];
  endpoint?: string;
  title?: string;
}

export default function MembersPerWeekChart({
  data: propData,
  endpoint,
  title = "New Members Per Month",
}: Props) {
  const hasPropData = Boolean(propData?.length);
  const [data, setData] = useState<MemberStat[]>(hasPropData ? propData! : MOCK_MEMBER_STATS);
  const [loading, setLoading] = useState<boolean>(!hasPropData);

  function normalizeRows(payload: MemberStat[] | MembersPerMonthResponse): MemberStat[] {
    const rows = Array.isArray(payload) ? payload : payload.data;

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row) => ({
      month: new Date(row.month).toLocaleString("es", { month: "short", year: "2-digit" }),
      new_members: Number(row.new_members),
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
      .then((payload: MemberStat[] | MembersPerMonthResponse) => {
        if (!isMounted) return;

        const formatted = normalizeRows(payload);

        setData(formatted.length > 0 ? formatted : MOCK_MEMBER_STATS);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setData(MOCK_MEMBER_STATS);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [endpoint, hasPropData, propData]);

  if (loading) return <p style={{ color: "#888", fontSize: 14 }}>Cargando...</p>;

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-card-header">
        <h3 className="admin-chart-card-title">{title}</h3>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
          <XAxis
            dataKey="month"
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
            formatter={(v) => [v, "Nuevos miembros"]}
          />
          <Line
            type="monotone"
            dataKey="new_members"
            stroke="#3266ad"
            strokeWidth={2}
            dot={{ r: 4, fill: "#3266ad", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
