import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  collapsed?: boolean;
  className?: string;
  href?: string;
  company?: "plynest" | "hytek";
  name?: string;
}

export function BrandLogo({ collapsed = false, className = "", href, company = "plynest", name }: BrandLogoProps) {
  const brandName = name || (company === "hytek" ? "Prinson Hytek" : "Prinson Plynest");
  const targetHref = href || (company === "hytek" ? "/hytek/admin/dashboard" : "/admin/dashboard");

  return (
    <Link href={targetHref} className={`flex items-center gap-3 group select-none ${className}`}>
      {/* Clean geometric black and white emblem */}
      <div className="relative w-9 h-9 rounded-lg bg-black flex items-center justify-center border border-zinc-800 shadow-sm flex-shrink-0">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-5 h-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 7L12 3L21 7L12 11L3 7Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 12L12 16L21 12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 17L12 21L21 17"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {!collapsed && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-wider uppercase text-white font-sans group-hover:text-zinc-200 transition-colors">
              {brandName}
            </span>
          </div>
          <span className="text-[10px] tracking-widest uppercase font-medium text-zinc-400">
            Attendance Portal
          </span>
        </div>
      )}
    </Link>
  );
}
