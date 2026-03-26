"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart2, TrendingUp, PieChart as PieIcon, Activity } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChartConfig {
  labels?: string[];
  datasets?: {
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
  }[];
  title?: string;
}

interface ChartDisplayProps {
  chartType: string;
  chartConfig: ChartConfig;
  justification?: string;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#20566D", "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#F97316",
];

const CHART_TYPES = [
  { key: "bar", label: "Barras", icon: BarChart2 },
  { key: "line", label: "Línea", icon: TrendingUp },
  { key: "area", label: "Área", icon: Activity },
  { key: "pie", label: "Circular", icon: PieIcon },
] as const;

type ChartTypeKey = (typeof CHART_TYPES)[number]["key"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function transformToRechartsData(config: ChartConfig) {
  const labels = config.labels ?? [];
  const datasets = config.datasets ?? [];

  return labels.map((label, i) => {
    const entry: Record<string, string | number> = { name: label };
    datasets.forEach((ds, dsIndex) => {
      const key = ds.label || `serie_${dsIndex + 1}`;
      entry[key] = ds.data[i] ?? 0;
    });
    return entry;
  });
}

function getDatasetKeys(config: ChartConfig): string[] {
  return (config.datasets ?? []).map((ds, i) => ds.label || `serie_${i + 1}`);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-brand-deepest text-white px-3 py-2 rounded-lg shadow-lg text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-white/70">{p.name}:</span>
          <span className="font-medium">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

// ─── Chart Component ──────────────────────────────────────────────────────────

export default function ChartDisplay({
  chartType: initialType,
  chartConfig,
  justification,
}: ChartDisplayProps) {
  const [activeType, setActiveType] = useState<ChartTypeKey>(
    CHART_TYPES.some((t) => t.key === initialType)
      ? (initialType as ChartTypeKey)
      : "bar"
  );

  if (!chartConfig?.labels || !chartConfig?.datasets?.length) return null;

  const data = transformToRechartsData(chartConfig);
  const keys = getDatasetKeys(chartConfig);

  const renderChart = () => {
    switch (activeType) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#CBD5E1" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#CBD5E1" }}
              />
              <Tooltip content={<CustomTooltip />} />
              {keys.length > 1 && <Legend />}
              {keys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                  animationDuration={800}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data}>
              <defs>
                {keys.map((key, i) => (
                  <linearGradient key={key} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#CBD5E1" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#CBD5E1" }}
              />
              <Tooltip content={<CustomTooltip />} />
              {keys.length > 1 && <Legend />}
              {keys.map((key, i) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  fill={`url(#gradient-${i})`}
                  animationDuration={800}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.map((d, i) => ({
                  name: d.name,
                  value: d[keys[0]] as number,
                  fill: CHART_COLORS[i % CHART_COLORS.length],
                }))}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                animationDuration={800}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
                labelLine={{ stroke: "#94A3B8" }}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        );

      default: // bar
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#CBD5E1" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#CBD5E1" }}
              />
              <Tooltip content={<CustomTooltip />} />
              {keys.length > 1 && <Legend />}
              {keys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="mt-1 w-full rounded-xl border border-brand-light bg-white p-4 overflow-hidden">
      {/* Title */}
      {chartConfig.title && (
        <p className="text-sm font-semibold text-brand-deepest mb-3">
          {chartConfig.title}
        </p>
      )}

      {/* Chart type toggle */}
      <div className="flex gap-1 mb-3">
        {CHART_TYPES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveType(key)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeType === key
                ? "bg-brand-dark text-white shadow-sm"
                : "bg-brand-light/50 text-brand-mid hover:bg-brand-light hover:text-brand-dark"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {renderChart()}

      {/* Justification */}
      {justification && (
        <p className="mt-3 text-xs text-brand-mid italic leading-relaxed border-t border-brand-light/50 pt-2">
          {justification}
        </p>
      )}
    </div>
  );
}