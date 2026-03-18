"use client";

import { useState } from "react";
import { queryAgent } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// TODO: Issue #20 — Connect with real API and display SQL/insights results

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await queryAgent(input);
      const assistantMessage: Message = {
        role: "assistant",
        content: response?.explanation || "Query processed successfully.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content: "Error processing your question. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 h-[600px] flex flex-col">
      <h2 className="text-xl font-semibold mb-4">Chat</h2>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center mt-20">
            Ask a question about your data...
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg ${
              msg.role === "user"
                ? "bg-blue-100 text-blue-900 ml-8"
                : "bg-gray-100 text-gray-900 mr-8"
            }`}
          >
            <p className="text-sm font-medium mb-1">
              {msg.role === "user" ? "You" : "DataAgent"}
            </p>
            <p>{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="bg-gray-100 p-3 rounded-lg mr-8">
            <p className="text-sm text-gray-500">Analyzing...</p>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a question about your data..."
          className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
