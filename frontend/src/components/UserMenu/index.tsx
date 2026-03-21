"use client";

import { useState, useEffect, useRef } from "react";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { ChevronDown, LogOut } from "lucide-react";

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0].toUpperCase() ?? "U";

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 hover:bg-brand-light/60 rounded-xl px-2 py-1.5 transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-brand-dark text-white text-sm font-semibold flex items-center justify-center shadow-sm">
          {initials}
        </div>
        <span className="text-sm text-brand-deepest font-medium hidden sm:block max-w-[160px] truncate">
          {user.displayName || user.email}
        </span>
        <ChevronDown
          size={15}
          className={`text-brand-mid transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white border border-brand-light rounded-xl shadow-card-hover z-20 py-1 animate-fade-in overflow-hidden">
          <div className="px-4 py-3 border-b border-brand-light bg-brand-light/30">
            <p className="text-sm font-semibold text-brand-deepest truncate">
              {user.displayName || "Usuario"}
            </p>
            <p className="text-xs text-brand-mid truncate mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
