"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const SHADES = ["#e8e8e8", "#a8a8a8", "#686868", "#343434"];

interface Asset { symbol: string; balance: string; assetId: number }

interface Props { assets: Asset[] }

export default function AllocationChart({ assets }: Props) {
  const data = assets
    .map((a) => ({ name: a.symbol, value: parseFloat(a.balance) }))
    .filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted font-mono text-xs uppercase tracking-widest">
        No deposits
      </div>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={78}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={SHADES[i % SHADES.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
            formatter={(value: number, name: string) => [
              `${((value / total) * 100).toFixed(1)}%  (${value.toFixed(2)})`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-2">Total</span>
        <span className="font-mono text-lg font-semibold text-white leading-tight">
          {total.toLocaleString("en", { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
}
