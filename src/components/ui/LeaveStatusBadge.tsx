import React from "react";
import { LeaveStatus, LEAVE_STATUS_META, cn } from "@/lib/utils";

interface LeaveStatusBadgeProps {
  status: LeaveStatus | string;
  size?: "sm" | "md";
  className?: string;
}

export function LeaveStatusBadge({
  status,
  size = "md",
  className = "",
}: LeaveStatusBadgeProps) {
  const meta = LEAVE_STATUS_META[status as LeaveStatus] || LEAVE_STATUS_META.PENDING;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-medium rounded-md",
    md: "px-2.5 py-1 text-xs font-semibold rounded-lg",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border transition-colors",
        sizeClasses[size],
        meta.badgeClass,
        className
      )}
    >
      {meta.label}
    </span>
  );
}
