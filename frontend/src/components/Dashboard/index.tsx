"use client";

// TODO: Issue #19 — Connect with /audit/security endpoint

interface MetricCard {
  title: string;
  value: number;
  description: string;
}

const metrics: MetricCard[] = [
  {
    title: "Blocked Threats",
    value: 0,
    description: "Prompt injection and jailbreak attempts blocked",
  },
  {
    title: "Out-of-Context Queries",
    value: 0,
    description: "Queries blocked for accessing unauthorized data",
  },
  {
    title: "Restricted Access",
    value: 0,
    description: "Attempts to access restricted columns or tables",
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Security Dashboard</h2>

      <div className="grid grid-cols-1 gap-4">
        {metrics.map((metric, i) => (
          <div key={i} className="border rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">
              {metric.title}
            </h3>
            <p className="text-3xl font-bold mt-1">{metric.value}</p>
            <p className="text-sm text-gray-400 mt-1">{metric.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
