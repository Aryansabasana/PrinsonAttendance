"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck2,
  CalendarDays,
  History,
  FileCheck2,
  Users2,
  FileSpreadsheet,
  Settings,
  ShieldAlert,
  LogOut,
  ChevronRight,
  UserCheck,
  UserCog,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { cn } from "@/lib/utils";

interface SidebarProps {
  company?: "plynest" | "hytek";
  user?: {
    id: string;
    name: string;
    role: "ADMIN" | "EMPLOYEE";
    email?: string;
    employeeCode?: string;
    designation?: string;
  } | null;
  pendingLeavesCount?: number;
  onCloseMobile?: () => void;
}

export function Sidebar({ company = "plynest", user, pendingLeavesCount = 0, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch(`/api/auth/logout?company=${company}`, {
        method: "POST",
        headers: { "x-company": company },
      });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error", err);
      router.push("/login");
    }
  };

  const isAdmin = user?.role === "ADMIN";
  const prefix = company === "hytek" ? "/hytek" : "";

  interface NavItem {
    label: string;
    href: string;
    icon: any;
    active: boolean;
    badge?: number;
  }

  interface NavGroup {
    group: string;
    items: NavItem[];
  }

  const adminNavItems: NavGroup[] = [
    {
      group: "Operations",
      items: [
        {
          label: "Showroom Dashboard",
          href: `${prefix}/admin/dashboard`,
          icon: LayoutDashboard,
          active: pathname === `${prefix}/admin/dashboard` || pathname === `${prefix}/admin`,
        },
        {
          label: "Daily Attendance Register",
          href: `${prefix}/attendance/register`,
          icon: CalendarCheck2,
          active: pathname === `${prefix}/attendance/register`,
        },
        {
          label: "Monthly Calendar",
          href: `${prefix}/calendar`,
          icon: CalendarDays,
          active: pathname === `${prefix}/calendar`,
        },
        {
          label: "Attendance History",
          href: `${prefix}/attendance/history`,
          icon: History,
          active: pathname === `${prefix}/attendance/history`,
        },
        {
          label: "Leave Applications",
          href: `${prefix}/leave`,
          icon: FileCheck2,
          badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined,
          active: pathname.startsWith(`${prefix}/leave`),
        },
      ],
    },
    {
      group: "Workforce",
      items: [
        {
          label: "Employee Directory",
          href: `${prefix}/employees`,
          icon: Users2,
          active: pathname.startsWith(`${prefix}/employees`),
        },
        {
          label: "Attendance Reports",
          href: `${prefix}/reports`,
          icon: FileSpreadsheet,
          active: pathname === `${prefix}/reports`,
        },
      ],
    },
    {
      group: "System & Governance",
      items: [
        {
          label: "Audit Trail",
          href: `${prefix}/settings/audit`,
          icon: ShieldAlert,
          active: pathname === `${prefix}/settings/audit`,
        },
        {
          label: "Attendance Rules",
          href: `${prefix}/settings/attendance`,
          icon: Settings,
          active: pathname === `${prefix}/settings/attendance`,
        },
      ],
    },
    {
      group: "Preferences",
      items: [
        {
          label: "Profile & Security",
          href: `${prefix}/settings/profile`,
          icon: UserCog,
          active: pathname === `${prefix}/settings/profile`,
        },
      ],
    },
  ];

  const employeeNavItems: NavGroup[] = [
    {
      group: "My Attendance",
      items: [
        {
          label: "Personal Dashboard",
          href: "/employee/dashboard",
          icon: LayoutDashboard,
          active: pathname === "/employee/dashboard",
        },
        {
          label: "My Monthly Calendar",
          href: "/employee/calendar",
          icon: CalendarDays,
          active: pathname === "/employee/calendar",
        },
        {
          label: "My Attendance Log",
          href: "/employee/history",
          icon: History,
          active: pathname === "/employee/history",
        },
        {
          label: "Apply / My Leaves",
          href: "/employee/leave",
          icon: FileCheck2,
          active: pathname === "/employee/leave",
        },
      ],
    },
    {
      group: "Preferences",
      items: [
        {
          label: "Profile & Password",
          href: "/settings/profile",
          icon: Settings,
          active: pathname === "/settings/profile",
        },
      ],
    },
  ];

  const navGroups = isAdmin ? adminNavItems : employeeNavItems;

  return (
    <aside className="w-64 h-full bg-black text-white flex flex-col justify-between border-r border-zinc-800 select-none">
      {/* Top Header / Logo */}
      <div className="p-5 border-b border-zinc-800">
        <BrandLogo
          company={company}
          href={isAdmin ? (prefix ? `${prefix}/admin/dashboard` : "/admin/dashboard") : "/employee/dashboard"}
        />
        <div className="mt-3 flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span className="truncate">
            {company === "hytek" ? "Hytek Admin" : isAdmin ? "Director / Admin" : "Showroom Staff"}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h4 className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-2">
              {group.group}
            </h4>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group",
                      item.active
                        ? "bg-white text-black shadow-sm font-bold"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={cn(
                          "w-4 h-4 flex-shrink-0 transition-colors",
                          item.active ? "text-black" : "text-zinc-500 group-hover:text-white"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-zinc-800 text-white border border-zinc-700 ml-2">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User profile footer & Sign Out */}
      <div className="p-3 border-t border-zinc-800 bg-black">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <Link
            href={`${prefix}/settings/profile`}
            onClick={onCloseMobile}
            title="Manage Profile & Security"
            className="flex items-center gap-2.5 min-w-0 group hover:opacity-90 transition-opacity flex-1"
          >
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-extrabold text-xs flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate group-hover:text-zinc-200 transition-colors">
                {user?.name || "User"}
              </p>
              <p className="text-[10px] text-zinc-400 truncate">
                {user?.employeeCode ? `${user.employeeCode} · ` : ""}
                {user?.role === "ADMIN" ? "Director / Admin" : user?.role || "Staff"}
              </p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
