import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "DataLitics — AI Data Analysis",
  description:
    "Consulta tus datos empresariales en lenguaje natural. Multi-agente, seguro y sin SQL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-gray-50 min-h-screen" suppressHydrationWarning>
        <AuthProvider>
          <NavBar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
