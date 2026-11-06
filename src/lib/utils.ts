import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "APPROVED_LEAVE" | "NOT_MARKED";
export type LeaveType = "CASUAL" | "SICK" | "PERSONAL" | "OTHER";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type UserRole = "ADMIN" | "EMPLOYEE";

export const ATTENDANCE_STATUS_META: Record<
  AttendanceStatus,
  {
    label: string;
    description: string;
    badgeClass: string;
    chipClass: string;
    dotColor: string;
    calendarBg: string;
    textColor: string;
  }
> = {
  PRESENT: {
    label: "Present",
    description: "Full day attendance recorded",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20",
    chipClass: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600",
    dotColor: "bg-emerald-600",
    calendarBg: "bg-emerald-50 text-emerald-800 border-emerald-300",
    textColor: "text-emerald-700",
  },
  ABSENT: {
    label: "Absent",
    description: "Employee absent without approved leave",
    badgeClass: "bg-red-50 text-red-700 border-red-200 ring-red-600/20",
    chipClass: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
    dotColor: "bg-red-600",
    calendarBg: "bg-red-50 text-red-800 border-red-300",
    textColor: "text-red-700",
  },
  HALF_DAY: {
    label: "Half Day",
    description: "Half day attendance (0.5 day)",
    badgeClass: "bg-zinc-100 text-zinc-800 border-zinc-300 ring-zinc-500/20",
    chipClass: "bg-zinc-800 text-white hover:bg-zinc-700 focus:ring-zinc-800",
    dotColor: "bg-zinc-600",
    calendarBg: "bg-zinc-100 text-zinc-800 border-zinc-300",
    textColor: "text-zinc-800",
  },
  APPROVED_LEAVE: {
    label: "Approved Leave",
    description: "Sanctioned leave approved by manager",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200 ring-zinc-400/20",
    chipClass: "bg-zinc-700 text-white hover:bg-zinc-600 focus:ring-zinc-700",
    dotColor: "bg-zinc-500",
    calendarBg: "bg-zinc-50 text-zinc-700 border-zinc-200",
    textColor: "text-zinc-700",
  },
  NOT_MARKED: {
    label: "Not Marked",
    description: "Attendance not yet submitted for date",
    badgeClass: "bg-zinc-100 text-zinc-500 border-zinc-200 ring-zinc-300/20",
    chipClass: "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 focus:ring-zinc-400",
    dotColor: "bg-zinc-400",
    calendarBg: "bg-zinc-50 text-zinc-400 border-dashed border-zinc-200",
    textColor: "text-zinc-400",
  },
};

export const LEAVE_STATUS_META: Record<
  LeaveStatus,
  {
    label: string;
    badgeClass: string;
  }
> = {
  PENDING: {
    label: "Pending Review",
    badgeClass: "bg-zinc-100 text-zinc-800 border-zinc-300",
  },
  APPROVED: {
    label: "Approved",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    label: "Rejected",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-zinc-100 text-zinc-500 border-zinc-200",
  },
};

export function formatDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}
