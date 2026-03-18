"use client";

// TODO: Issue #18 — Connect with /audit/logs endpoint

const columns = [
  "Date",
  "User",
  "Question",
  "Status",
  "Risk",
  "Block Type",
];

export default function Audit() {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Audit Logs</h2>
        <button
          disabled
          className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="border-b px-4 py-2 text-sm font-medium text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-400"
              >
                No audit logs available yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
