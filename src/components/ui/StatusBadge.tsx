import React from "react";
import { AttendanceStatus, ATTENDANCE_STATUS_META, cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: AttendanceStatus | string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({
  status,
  size = "md",
  className = "",
  showDot = true,
}: StatusBadgeProps) {
  const meta = ATTENDANCE_STATUS_META[status as AttendanceStatus] || ATTENDANCE_STATUS_META.NOT_MARKED;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-medium rounded-md",
    md: "px-2.5 py-1 text-xs font-semibold rounded-lg",
    lg: "px-3 py-1.5 text-sm font-semibold rounded-lg",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border transition-all",
        sizeClasses[size],
        meta.badgeClass,
        className
      )}
    >
      {showDot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse", meta.dotColor)}
        />
      )}
      <span>{meta.label}</span>
    </span>
  );
}
