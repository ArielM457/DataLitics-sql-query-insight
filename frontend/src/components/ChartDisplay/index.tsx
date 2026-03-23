"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartConfig {
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

const DEFAULT_COLORS = [
  "#4472C4", "#D9D9D9", "#D9D9D9", "#D9D9D9", "#D9D9D9",
  "#D9D9D9", "#D9D9D9", "#D9D9D9", "#D9D9D9", "#D9D9D9",
];

export default function ChartDisplay({ chartType, chartConfig, justification }: ChartDisplayProps) {
  if (!chartConfig?.labels || !chartConfig?.datasets?.length) return null;

  // Ensure colors are set
  const datasets = chartConfig.datasets.map((ds) => ({
    ...ds,
    backgroundColor: ds.backgroundColor ?? DEFAULT_COLORS,
    borderColor: ds.borderColor ?? "#4472C4",
    borderWidth: ds.borderWidth ?? 1,
  }));

  const data = { labels: chartConfig.labels, datasets };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: datasets.length > 1 },
      title: {
        display: !!chartConfig.title,
        text: chartConfig.title ?? "",
        font: { size: 13 },
        color: "#1e293b",
      },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales:
      chartType !== "pie"
        ? {
            x: { grid: { display: false } },
            y: { grid: { color: "rgba(0,0,0,0.05)" }, beginAtZero: true },
          }
        : undefined,
  };

  const chartElement = () => {
    switch (chartType) {
      case "line":
        return (
          <Line
            data={{ ...data, datasets: datasets.map((d) => ({ ...d, fill: false, tension: 0.3 })) }}
            options={options}
          />
        );
      case "pie":
        return <Pie data={data} options={options} />;
      default:
        return <Bar data={data} options={options} />;
    }
  };

  return (
    <div className="mt-1 rounded-xl border border-brand-light bg-white p-3">
      <div className="max-h-64">{chartElement()}</div>
      {justification && (
        <p className="mt-2 text-xs text-brand-mid italic leading-relaxed">{justification}</p>
      )}
    </div>
  );
}
