"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import {
  ShieldAlert,
  ClipboardList,
  Users,
  Database,
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/security", label: "Seguridad", icon: ShieldAlert },
  { href: "/audit", label: "Auditoría", icon: ClipboardList },
  { href: "/admin", label: "Equipo", icon: Users },
  { href: "/onboarding", label: "Base de datos", icon: Database },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4faff]">
      {/* Sidebar — admin mode, no session callbacks */}
      <AppSidebar />

      <main className="ml-[260px] flex-1 flex flex-col min-h-screen">
        {/* Top bar with admin sub-nav */}
        <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-xl border-b border-[#003f54]/10 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold tracking-tight text-[#003f54]">
              Panel de Administración
            </span>
            <nav className="hidden md:flex items-center gap-1">
              {ADMIN_NAV.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#edf5fb] text-[#003f54]"
                        : "text-slate-500 hover:text-[#003f54] hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={14} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
