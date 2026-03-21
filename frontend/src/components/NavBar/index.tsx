"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import UserMenu from "@/components/UserMenu";
import { MessageSquare, ClipboardList, Users, Database, ShieldAlert } from "lucide-react";

const NO_NAV = ["/", "/auth", "/pending", "/join"];

export default function NavBar() {
  const pathname = usePathname();
  const { role } = useAuth();

  if (NO_NAV.includes(pathname)) return null;

  const adminLinks = [
    { href: "/home",       label: "Chat",           icon: MessageSquare },
    { href: "/security",   label: "Seguridad",      icon: ShieldAlert },
    { href: "/audit",      label: "Audit Logs",     icon: ClipboardList },
    { href: "/admin",      label: "Equipo",          icon: Users },
    { href: "/onboarding", label: "Base de datos",  icon: Database },
  ];

  const analystLinks = [
    { href: "/home", label: "Chat", icon: MessageSquare },
  ];

  const links = role === "admin" ? adminLinks : analystLinks;

  return (
    <nav className="border-b border-brand-light bg-white sticky top-0 z-10 px-6 h-14 flex items-center gap-6 shadow-sm">
      <Link href="/home" className="font-bold text-brand-dark text-lg shrink-0 tracking-tight">
        DataLitics
      </Link>

      <div className="flex items-center gap-1">
        {links.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-brand-light text-brand-deepest"
                  : "text-brand-mid hover:text-brand-deepest hover:bg-brand-light/50"
              }`}
            >
              <Icon size={15} />
              {link.label}
            </Link>
          );
        })}
      </div>

      <UserMenu />
    </nav>
  );
}
