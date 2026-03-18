import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataAgent — AI Data Analysis",
  description:
    "Multi-agent system that converts natural language questions to SQL queries, executes them securely, and explains the results.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
