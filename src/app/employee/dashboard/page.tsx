"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LeaveStatusBadge } from "@/components/ui/LeaveStatusBadge";
import {
  CalendarDays,
  UserCheck,
  UserX,
  Clock,
  CalendarCheck,
  FileCheck2,
  Percent,
  PlusCircle,
  History,
  ArrowRight,
  Sparkles,
  Building2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { formatReadableDate } from "@/lib/utils";

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState<any>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push("/login");
        return;
      }
      setCurrentUser(authData.user);

      const res = await fetch("/api/dashboard/employee");
      const data = await res.json();
      if (res.ok) {
        setDashData(data);
      }
    } catch (err) {
      console.error("Employee dashboard error", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const {
    employee,
    metrics,
    todayStatus,
    todayAttendance,
    recentAttendance = [],
    pendingLeaves = [],
    upcomingApprovedLeaves = [],
    todayStr,
  } = dashData || {};

  return (
    <AppLayout
      title="Staff Portal"
      subtitle={`Welcome, ${currentUser.name} · ${employee?.employeeCode || ""} · ${formatReadableDate(todayStr)}`}
      user={currentUser}
      pendingLeavesCount={metrics?.pendingLeavesCount || 0}
    >
      <div className="space-y-6">
        {/* Personalized Welcome Card */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-zinc-200 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center font-extrabold text-xl shadow-subtle border border-zinc-800">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-extrabold text-black tracking-tight">
                  Good day, {currentUser.name}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-bold border border-zinc-200">
                  {employee?.employeeCode}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {employee?.designation} · {employee?.department}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="text-zinc-400">Today&apos;s Status:</span>
                <StatusBadge status={todayStatus} size="sm" />
                {todayAttendance?.checkInTime && (
                  <span className="text-[11px] font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                    Checked in at {todayAttendance.checkInTime}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Link
              href="/employee/leave"
              className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl shadow-subtle flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Apply for Leave</span>
            </Link>
          </div>
        </div>

        {/* 6 Monthly Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
          <StatCard
            label="Present Days"
            value={metrics?.presentThisMonth ?? 0}
            subtitle="Full day present"
            icon={UserCheck}
            variant="present"
          />

          <StatCard
            label="Half Days"
            value={metrics?.halfDayThisMonth ?? 0}
            subtitle="0.5 day duty"
            icon={Clock}
            variant="halfDay"
          />

          <StatCard
            label="Approved Leave"
            value={metrics?.approvedLeaveThisMonth ?? 0}
            subtitle="Sanctioned days"
            icon={CalendarCheck}
            variant="leave"
          />

          <StatCard
            label="Absent Days"
            value={metrics?.absentThisMonth ?? 0}
            subtitle="Unapproved absence"
            icon={UserX}
            variant="absent"
          />

          <StatCard
            label="Attendance Rate"
            value={
              metrics?.hasStarted && metrics?.attendancePercentage !== null
                ? `${metrics.attendancePercentage}%`
                : "N/A"
            }
            subtitle={metrics?.hasStarted ? "This month" : "Starts on 1st marked day"}
            icon={Percent}
            variant="rate"
            badge={!metrics?.hasStarted ? "Not Started" : undefined}
          />

          <StatCard
            label="Pending Leaves"
            value={metrics?.pendingLeavesCount ?? 0}
            subtitle="Awaiting approval"
            icon={FileCheck2}
            variant="pending"
            href="/employee/leave"
          />
        </div>

        {/* Upcoming Approved Leaves & Pending Requests Banner */}
        {(upcomingApprovedLeaves.length > 0 || pendingLeaves.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingApprovedLeaves.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-subtle">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-black">Upcoming Approved Leave</h3>
                </div>
                {upcomingApprovedLeaves.slice(0, 2).map((l: any) => (
                  <div key={l._id} className="text-xs text-zinc-700 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 mt-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-black uppercase">{l.leaveType} Leave</span>
                      <span className="font-mono">{l.startDate} to {l.endDate}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 italic mt-0.5">&ldquo;{l.reason}&rdquo;</p>
                  </div>
                ))}
              </div>
            )}

            {pendingLeaves.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-subtle">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck2 className="w-4 h-4 text-black" />
                  <h3 className="text-xs font-bold text-black">Pending Leave Application</h3>
                </div>
                {pendingLeaves.slice(0, 2).map((l: any) => (
                  <div key={l._id} className="text-xs text-zinc-700 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 mt-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-zinc-900 uppercase">{l.leaveType} Leave</span>
                      <span className="font-mono">{l.startDate} to {l.endDate}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 italic mt-0.5">&ldquo;{l.reason}&rdquo;</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Attendance Activity */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-subtle p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-black">My Recent Attendance</h3>
              <p className="text-xs text-zinc-500">Past 10 recorded days at the showroom</p>
            </div>
            <Link
              href="/employee/history"
              className="text-xs font-bold text-black hover:text-zinc-600 flex items-center gap-1 transition-colors"
            >
              <span>View Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-600 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Check-In Time</th>
                  <th className="py-2.5 px-3">Check-Out Time</th>
                  <th className="py-2.5 px-4">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {recentAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-400">
                      No attendance history recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentAttendance.map((att: any) => (
                    <tr key={att._id} className="hover:bg-zinc-50">
                      <td className="py-2.5 px-4 font-semibold text-zinc-900">
                        {formatReadableDate(att.dateStr)}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={att.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-zinc-600">
                        {att.checkInTime || "--"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-zinc-600">
                        {att.checkOutTime || "--"}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-500">
                        {att.remarks || <span className="text-zinc-300 italic">None</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/employee/calendar"
            className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-subtle hover:border-black transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-black">My Monthly Calendar</h4>
                <p className="text-xs text-zinc-500">Visual monthly attendance grid</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-black group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/employee/leave"
            className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-subtle hover:border-black transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-black">Apply or Manage Leaves</h4>
                <p className="text-xs text-zinc-500">Submit requests & check review status</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-black group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
