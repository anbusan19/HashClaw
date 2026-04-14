"use client";

import {
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer,
} from "recharts";

interface Signal { symbol: string; currentApy: number }

interface Props { signals: Signal[] }

function CustomTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="#888" fontSize={10} fontFamily="var(--font-mono)">
      {(payload?.value ?? "").toUpperCase()}
    </text>
  );
}

const SHADES = ["#c8c8c8", "#c8c8c8", "#ffffff", "#888888"];

export default function YieldChart({ signals }: Props) {
  if (!signals.length) return null;

  const maxApy = Math.max(...signals.map((s) => s.currentApy));
  const data = signals.map((s) => ({ ...s, max: maxApy }));

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
        barSize={8}
      >
        <XAxis
          type="number"
          domain={[0, Math.ceil(maxApy) + 1]}
          tick={{ fill: "#555", fontSize: 9, fontFamily: "var(--font-mono)" }}
          tickFormatter={(v) => `${v}%`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="symbol"
          width={56}
          tick={<CustomTick />}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          contentStyle={{
            background: "#111",
            border: "1px solid #2a2a2a",
            borderRadius: 6,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "#fff",
          }}
          itemStyle={{ color: "#fff" }}
          labelStyle={{ color: "#aaa" }}
          formatter={(v: number) => [`${v.toFixed(2)}% APY`, ""]}
        />
        <Bar dataKey="currentApy" radius={[0, 2, 2, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={SHADES[i % SHADES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
