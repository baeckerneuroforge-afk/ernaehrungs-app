"use client";

import { WeightLog } from "@/types";

interface WeightChartProps {
  data: WeightLog[];
}

export function WeightChart({ data }: WeightChartProps) {
  if (data.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
        Mindestens 2 Einträge nötig für das Diagramm.
      </div>
    );
  }

  const W = 600;
  const H = 250;
  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const weights = data.map((d) => d.gewicht_kg);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);
  const rangeW = maxW - minW || 1;

  const points = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: PAD.top + (1 - (d.gewicht_kg - minW) / rangeW) * chartH,
    kg: d.gewicht_kg,
    date: new Date(d.gemessen_am).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }),
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Y-Axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minW + (rangeW * i) / 4;
    const y = PAD.top + (1 - i / 4) * chartH;
    return { val: Math.round(val * 10) / 10, y };
  });

  // X-Axis labels (max 7)
  const step = Math.max(1, Math.floor(data.length / 6));
  const xLabels = points.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 400 }}>
        {/* Grid lines */}
        {yTicks.map((t) => (
          <line
            key={t.val}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={t.y}
            y2={t.y}
            stroke="#f3f4f6"
            strokeWidth={1}
          />
        ))}

        {/* Y-Axis labels */}
        {yTicks.map((t) => (
          <text
            key={`label-${t.val}`}
            x={PAD.left - 8}
            y={t.y + 4}
            textAnchor="end"
            className="fill-gray-400"
            fontSize={11}
          >
            {t.val}
          </text>
        ))}

        {/* X-Axis labels */}
        {xLabels.map((p) => (
          <text
            key={p.date}
            x={p.x}
            y={H - 8}
            textAnchor="middle"
            className="fill-gray-400"
            fontSize={10}
          >
            {p.date}
          </text>
        ))}

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#2D6A4F"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#2D6A4F" stroke="white" strokeWidth={2}>
              <title>{`${p.date}: ${p.kg} kg`}</title>
            </circle>
          </g>
        ))}

        {/* Unit label */}
        <text x={12} y={PAD.top - 6} className="fill-gray-400" fontSize={10}>
          kg
        </text>
      </svg>
    </div>
  );
}
