import React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "present" | "absent" | "halfDay" | "leave" | "pending" | "rate";
  href?: string;
  onClick?: () => void;
  badge?: string;
  active?: boolean;
}

const variantStyles = {
  default: {
    iconBg: "bg-zinc-100 text-black",
    borderHover: "hover:border-zinc-400",
    accent: "text-black",
  },
  present: {
    iconBg: "bg-emerald-50 text-emerald-600",
    borderHover: "hover:border-emerald-300",
    accent: "text-emerald-700",
  },
  absent: {
    iconBg: "bg-red-50 text-red-600",
    borderHover: "hover:border-red-300",
    accent: "text-red-700",
  },
  halfDay: {
    iconBg: "bg-zinc-100 text-zinc-800",
    borderHover: "hover:border-zinc-400",
    accent: "text-zinc-900",
  },
  leave: {
    iconBg: "bg-zinc-100 text-zinc-800",
    borderHover: "hover:border-zinc-400",
    accent: "text-zinc-900",
  },
  pending: {
    iconBg: "bg-zinc-100 text-zinc-800",
    borderHover: "hover:border-zinc-400",
    accent: "text-zinc-900",
  },
  rate: {
    iconBg: "bg-zinc-100 text-black",
    borderHover: "hover:border-zinc-400",
    accent: "text-black",
  },
};

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  href,
  onClick,
  badge,
  active = false,
}: StatCardProps) {
  const styles = variantStyles[variant];

  const content = (
    <div
      className={cn(
        "relative p-4 md:p-5 bg-white rounded-xl border transition-all duration-200 text-left select-none flex flex-col justify-between h-full group",
        active
          ? "border-black ring-1 ring-black shadow-sm"
          : "border-zinc-200 shadow-sm hover:border-black",
        (href || onClick) && "cursor-pointer active:scale-[0.99]"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider line-clamp-1">
          {label}
        </span>
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
            styles.iconBg
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-auto">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-extrabold text-black tracking-tight font-sans">
            {value}
          </span>
          {badge && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
              {badge}
            </span>
          )}
        </div>
      </div>

      {subtitle && (
        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">
          {subtitle}
        </p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
