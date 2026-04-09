"use client";

import { WeightLog } from "@/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

interface WeightChartProps {
  data: WeightLog[];
  targetMin?: number;
  targetMax?: number;
}

interface TooltipPayload {
  value: number;
  payload: { dateLabel: string };
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0];
  return (
    <div className="bg-white border border-border rounded-xl shadow-md px-3 py-2 text-xs">
      <p className="text-ink-muted mb-0.5">{point.payload.dateLabel}</p>
      <p className="text-ink font-semibold">{point.value} kg</p>
    </div>
  );
}

export function WeightChart({ data, targetMin, targetMax }: WeightChartProps) {
  if (data.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-border p-8 text-center text-ink-faint text-sm">
        Mindestens 2 Einträge nötig für das Diagramm.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    kg: d.gewicht_kg,
    dateLabel: new Date(d.gemessen_am).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }),
  }));

  const weights = data.map((d) => d.gewicht_kg);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const padding = Math.max(1, (maxW - minW) * 0.2);

  let domainMin = Math.floor(minW - padding);
  let domainMax = Math.ceil(maxW + padding);

  if (typeof targetMin === "number") domainMin = Math.min(domainMin, Math.floor(targetMin - 0.5));
  if (typeof targetMax === "number") domainMax = Math.max(domainMax, Math.ceil(targetMax + 0.5));

  const hasRange =
    typeof targetMin === "number" && typeof targetMax === "number" && targetMax >= targetMin;

  return (
    <div className="bg-white rounded-2xl border border-border p-4 sm:p-5">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          {hasRange && (
            <ReferenceArea
              y1={targetMin}
              y2={targetMax}
              fill="#2D6A4F"
              fillOpacity={0.08}
              stroke="none"
            />
          )}
          <XAxis
            dataKey="dateLabel"
            stroke="#9CA3AF"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#E5E7EB" }}
          />
          <YAxis
            domain={[domainMin, domainMax]}
            stroke="#9CA3AF"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#E5E7EB", strokeWidth: 1 }} />
          <Line
            type="monotone"
            dataKey="kg"
            stroke="#2D6A4F"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#2D6A4F", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#2D6A4F", stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
