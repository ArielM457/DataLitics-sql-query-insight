"use client";

import { useState } from "react";

// TODO: Issue #23 — Connect with /onboarding/connect endpoint

export default function Onboarding() {
  const [companyName, setCompanyName] = useState("");
  const [connectionString, setConnectionString] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleConnect = async () => {
    if (!companyName.trim() || !connectionString.trim()) return;

    setLoading(true);
    setProgress(0);

    try {
      // TODO: Issue #23 — Call /onboarding/connect API
      console.log("Connecting:", { companyName, connectionString });
      setProgress(100);
    } catch {
      console.error("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Connect Company</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Contoso Ltd."
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Connection String
          </label>
          <input
            type="password"
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            placeholder="Server=...;Database=...;..."
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        {/* Progress indicator */}
        {loading && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={loading || !companyName.trim() || !connectionString.trim()}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Connecting..." : "Connect Company"}
        </button>
      </div>
    </div>
  );
}
