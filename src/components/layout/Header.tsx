"use client";

import React, { useEffect, useState } from "react";
import { Menu, Calendar, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface HeaderProps {
  title: string;
  subtitle?: string;
  company?: "plynest" | "hytek";
  user?: {
    id: string;
    name: string;
    role: "ADMIN" | "EMPLOYEE";
    employeeCode?: string;
  } | null;
  onToggleMobileMenu: () => void;
}

export function Header({ title, subtitle, company = "plynest", user, onToggleMobileMenu }: HeaderProps) {
  const [currentDateTime, setCurrentDateTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Formatted in IST / Indian format
      const formatted = now.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      setCurrentDateTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-zinc-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Left: Mobile hamburger + Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-black hover:bg-zinc-100 rounded-lg transition-colors"
          aria-label="Toggle mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block lg:hidden">
          <BrandLogo collapsed company={company} />
        </div>

        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold text-black tracking-tight truncate font-sans">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-zinc-500 truncate hidden md:block">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Date, Timezone, User badge */}
      <div className="flex items-center gap-3">
        {/* Date pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-700">
          <Calendar className="w-3.5 h-3.5 text-black" />
          <span>{currentDateTime || "Today"}</span>
          <span className="text-[10px] text-zinc-400 border-l border-zinc-300 pl-1.5 uppercase font-medium">
            IST
          </span>
        </div>

        {/* Showroom badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-900 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-black" />
          <span className="truncate">{company === "hytek" ? "Prinson Hytek" : "Prinson Plynest"}</span>
        </div>

        {/* User avatar initial & Profile Link */}
        <Link
          href={company === "hytek" ? "/hytek/settings/profile" : "/settings/profile"}
          title="Profile & Security Settings"
          className="flex items-center gap-2 pl-2 border-l border-zinc-200 group hover:opacity-90 transition-all"
        >
          <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs ring-1 ring-zinc-300 group-hover:ring-black transition-all">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-black leading-none truncate max-w-[120px] group-hover:text-zinc-600 transition-colors">
              {user?.name || "User"}
            </p>
            <span className="text-[10px] text-zinc-500 font-medium capitalize">
              {user?.role === "ADMIN" ? "Director / Admin" : user?.employeeCode || "Staff"}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
