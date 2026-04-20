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
  ReferenceLine,
} from "recharts";
import { rolling7DayMean } from "@/lib/weight-stats";

interface WeightChartProps {
  data: WeightLog[];
  targetMin?: number;
  targetMax?: number;
  /** Dashed horizontal line at the target weight. */
  targetWeight?: number;
  /** Show the 7-day rolling mean as a subtle trend line. */
  showTrend?: boolean;
  height?: number;
}

interface TooltipPayload {
  value: number;
  name?: string;
  dataKey?: string;
  color?: string;
  payload: { dateLabel: string; kg: number; trend: number | null };
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || !payload.length) return null;
  const first = payload[0];
  const dateLabel = first.payload.dateLabel;
  const kg = first.payload.kg;
  const trend = first.payload.trend;
  return (
    <div className="bg-white border border-border rounded-xl shadow-md px-3 py-2 text-xs space-y-0.5">
      <p className="text-ink-muted">{dateLabel}</p>
      <p className="text-ink font-semibold">{kg} kg</p>
      {trend != null && (
        <p className="text-ink-faint">7-Tage-Ø: {trend} kg</p>
      )}
    </div>
  );
}

export function WeightChart({
  data,
  targetMin,
  targetMax,
  targetWeight,
  showTrend = true,
  height = 280,
}: WeightChartProps) {
  if (data.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-border p-8 text-center text-ink-faint text-sm">
        Mindestens 2 Einträge nötig für das Diagramm.
      </div>
    );
  }

  // Rolling mean needs logs sorted ascending. Caller is expected to pass
  // them in that order (GET /api/tracker/gewicht does).
  const smoothed = rolling7DayMean(data);
  const chartData = smoothed.map((s, i) => {
    const log = data[i];
    return {
      kg: s.kg,
      trend: s.trend,
      dateLabel: new Date(log.gemessen_am).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      }),
    };
  });

  const weights = data.map((d) => d.gewicht_kg);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const padding = Math.max(1, (maxW - minW) * 0.2);

  let domainMin = Math.floor(minW - padding);
  let domainMax = Math.ceil(maxW + padding);

  if (typeof targetMin === "number") domainMin = Math.min(domainMin, Math.floor(targetMin - 0.5));
  if (typeof targetMax === "number") domainMax = Math.max(domainMax, Math.ceil(targetMax + 0.5));
  if (typeof targetWeight === "number") {
    domainMin = Math.min(domainMin, Math.floor(targetWeight - 0.5));
    domainMax = Math.max(domainMax, Math.ceil(targetWeight + 0.5));
  }

  const hasRange =
    typeof targetMin === "number" && typeof targetMax === "number" && targetMax >= targetMin;

  return (
    <div className="bg-white rounded-2xl border border-border p-4 sm:p-5">
      <ResponsiveContainer width="100%" minWidth={280} height={height}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
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
            width={50}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#E5E7EB", strokeWidth: 1 }} />
          {typeof targetWeight === "number" && (
            <ReferenceLine
              y={targetWeight}
              stroke="#2D6A4F"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Ziel: ${targetWeight} kg`,
                position: "insideTopRight",
                fill: "#2D6A4F",
                fontSize: 10,
              }}
            />
          )}
          {showTrend && (
            <Line
              type="monotone"
              dataKey="trend"
              stroke="#A8A29E"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              connectNulls
              isAnimationActive={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="kg"
            stroke="#2D6A4F"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#2D6A4F", stroke: "#fff", strokeWidth: 1.5 }}
            activeDot={{ r: 6, fill: "#2D6A4F", stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
