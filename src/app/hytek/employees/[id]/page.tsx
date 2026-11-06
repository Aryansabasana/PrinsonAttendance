"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LeaveStatusBadge } from "@/components/ui/LeaveStatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Phone,
  Mail,
  UserCheck,
  UserX,
  History,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatReadableDate, ATTENDANCE_STATUS_META } from "@/lib/utils";

export default function HytekEmployeeProfilePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'overview' | 'attendance' | 'calendar' | 'leaves'
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "calendar" | "leaves">("overview");

  // Calendar tab state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [calData, setCalData] = useState<any>(null);
  const [calLoading, setCalLoading] = useState(false);

  // Status toggle confirm
  const [confirmToggle, setConfirmToggle] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [employeeId]);

  useEffect(() => {
    if (activeTab === "calendar") {
      fetchCalendar();
    }
  }, [activeTab, calYear, calMonth]);

  const fetchProfile = async () => {
    try {
      const [authRes, empRes] = await Promise.all([
        fetch("/api/auth/me?company=hytek", { headers: { "x-company": "hytek" } }),
        fetch(`/api/employees/${employeeId}?company=hytek`, { headers: { "x-company": "hytek" } }),
      ]);

      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push("/login");
        return;
      }
      setCurrentUser(authData.user);

      const empData = await empRes.json();
      if (empRes.ok) {
        setEmployee(empData.employee);
        setStats(empData.stats);
        setRecentAttendance(empData.recentAttendance || []);
        setLeaveRequests(empData.leaveRequests || []);
      }
    } catch (err) {
      console.error("Fetch profile error", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendar = async () => {
    setCalLoading(true);
    try {
      const res = await fetch(`/api/attendance/calendar?year=${calYear}&month=${calMonth}&employeeId=${employeeId}&company=hytek`, {
        headers: { "x-company": "hytek" },
      });
      const data = await res.json();
      if (res.ok) {
        setCalData(data);
      }
    } catch (err) {
      console.error("Calendar fetch error", err);
    } finally {
      setCalLoading(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      const res = await fetch(`/api/employees/${employeeId}?company=hytek`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-company": "hytek",
        },
        body: JSON.stringify({ isActive: !employee.isActive }),
      });
      if (res.ok) {
        setConfirmToggle(false);
        await fetchProfile();
      }
    } catch (err) {
      console.error("Error toggling active state", err);
    }
  };

  const handlePrevMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  if (loading || !currentUser || !employee) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = currentUser.role === "ADMIN";

  return (
    <AppLayout
      company="hytek"
      title={`${employee.fullName} — Prinson Hytek Profile`}
      subtitle={`${employee.employeeCode} · ${employee.designation} · ${employee.department}`}
      user={currentUser}
    >
      <div className="space-y-5">
        {/* Back Link & Header Card */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="mb-4">
            <Link
              href="/hytek/employees"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Hytek Employee Directory</span>
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-black text-white font-extrabold text-2xl flex items-center justify-center shadow-sm border border-zinc-800">
                {employee.fullName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-black tracking-tight">
                    {employee.fullName}
                  </h2>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200 font-bold">
                    {employee.employeeCode}
                  </span>
                  {employee.isActive ? (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 text-black border border-zinc-300">
                      Active Staff
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                      Deactivated
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {employee.designation} · {employee.department}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-zinc-400" />
                    {employee.phone}
                  </span>
                  {employee.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-zinc-400" />
                      {employee.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    Joined {formatReadableDate(employee.joiningDate)}
                  </span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 self-start md:self-center">
                <button
                  onClick={() => setConfirmToggle(true)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1.5 ${
                    employee.isActive
                      ? "border-red-300 text-red-600 hover:bg-red-50"
                      : "border-zinc-300 text-zinc-800 hover:bg-zinc-100"
                  }`}
                >
                  {employee.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  <span>{employee.isActive ? "Deactivate Employee" : "Re-activate Employee"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-zinc-200 overflow-x-auto">
            {[
              { key: "overview", label: "Overview & Stats" },
              { key: "attendance", label: "Attendance History" },
              { key: "calendar", label: "Monthly Calendar" },
              { key: "leaves", label: `Leave History (${leaveRequests.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-black text-white shadow-sm"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-black"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* 4 Lifetime Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Attendance Rate
                </span>
                <p className="text-2xl font-extrabold text-black mt-1 font-sans">
                  {stats?.hasStarted && stats?.attendancePercentage !== null
                    ? `${stats.attendancePercentage}%`
                    : "N/A"}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {stats?.hasStarted ? "Overall lifetime attendance" : "Starts on 1st marked record"}
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Full Days Present
                </span>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-sans">
                  {stats?.presentCount ?? 0}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Recorded full day presence</p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                  Half Days
                </span>
                <p className="text-2xl font-extrabold text-zinc-700 mt-1 font-sans">
                  {stats?.halfDayCount ?? 0}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Counted as 0.5 day duty</p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                  Sanctioned Leaves
                </span>
                <p className="text-2xl font-extrabold text-zinc-600 mt-1 font-sans">
                  {stats?.approvedLeaveCount ?? 0}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Approved by management</p>
              </div>
            </div>

            {/* Recent Attendance Records */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-black">Recent Attendance Activity</h3>
                <button
                  onClick={() => setActiveTab("attendance")}
                  className="text-xs font-bold text-black hover:underline"
                >
                  View All History →
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-500 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Check-In / Out</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {recentAttendance.slice(0, 10).map((att) => (
                      <tr key={att._id} className="hover:bg-zinc-50">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900">
                          {formatReadableDate(att.dateStr)}
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={att.status} size="sm" />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-600">
                          {att.checkInTime || att.checkOutTime
                            ? `${att.checkInTime || "--"} → ${att.checkOutTime || "--"}`
                            : "--"}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-500">{att.remarks || "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Attendance History */}
        {activeTab === "attendance" && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-black mb-4">Complete Attendance History</h3>
            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Check-In</th>
                    <th className="py-3 px-3">Check-Out</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {recentAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-400">
                        No attendance records recorded for this employee yet.
                      </td>
                    </tr>
                  ) : (
                    recentAttendance.map((att) => (
                      <tr key={att._id} className="hover:bg-zinc-50">
                        <td className="py-3 px-4 font-semibold text-zinc-900">
                          {formatReadableDate(att.dateStr)}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={att.status} size="sm" />
                        </td>
                        <td className="py-3 px-3 font-mono text-zinc-700">{att.checkInTime || "--"}</td>
                        <td className="py-3 px-3 font-mono text-zinc-700">{att.checkOutTime || "--"}</td>
                        <td className="py-3 px-4 text-zinc-500">{att.remarks || "--"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Monthly Calendar */}
        {activeTab === "calendar" && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-xs text-black">
                  {new Date(calYear, calMonth - 1, 1).toLocaleString("en-US", { month: "long" })} {calYear}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {calLoading ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                  <div key={d} className={`text-center py-1 text-[10px] font-bold ${i === 0 ? "text-red-500" : "text-zinc-400"}`}>
                    {d}
                  </div>
                ))}
                {(calData?.days || []).map((day: any, i: number) => {
                  if (day.isPadding) {
                    return <div key={`p-${i}`} className="h-16 rounded-lg bg-zinc-50/40" />;
                  }
                  const att = day.attendance;
                  const meta = att ? ATTENDANCE_STATUS_META[att.status as keyof typeof ATTENDANCE_STATUS_META] : null;

                  return (
                    <div
                      key={day.dateStr}
                      className={`h-16 p-1.5 rounded-lg border text-xs flex flex-col justify-between ${
                        day.isSunday ? "bg-zinc-50 border-zinc-100 text-zinc-400" : "bg-white border-zinc-200"
                      }`}
                    >
                      <span className="font-mono text-[10px] font-bold text-zinc-500">{day.day}</span>
                      {att && (
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded text-center truncate ${meta?.chipClass}`}>
                          {att.status === "PRESENT"
                            ? "P"
                            : att.status === "HALF_DAY"
                            ? "HD"
                            : att.status === "APPROVED_LEAVE"
                            ? "L"
                            : "A"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Leave Requests */}
        {activeTab === "leaves" && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-black mb-4">Leave Application Records</h3>
            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                  <tr>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-3">Days</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-400">
                        No leave applications recorded for this employee.
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.map((l) => (
                      <tr key={l._id} className="hover:bg-zinc-50">
                        <td className="py-3 px-4 font-mono font-bold text-black">
                          {l.startDate} → {l.endDate}
                        </td>
                        <td className="py-3 px-3 text-zinc-700 font-bold">{l.daysCount} d</td>
                        <td className="py-3 px-3 font-semibold text-black uppercase text-[10px]">
                          {l.leaveType}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 italic">&ldquo;{l.reason}&rdquo;</td>
                        <td className="py-3 px-3">
                          <LeaveStatusBadge status={l.status} size="sm" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Deactivation */}
      <ConfirmDialog
        isOpen={confirmToggle}
        title={employee?.isActive ? "Deactivate Employee?" : "Re-activate Employee?"}
        description={`Are you sure you want to ${employee?.isActive ? "deactivate" : "activate"} ${employee?.fullName}?`}
        confirmLabel={employee?.isActive ? "Deactivate" : "Activate"}
        variant={employee?.isActive ? "danger" : "primary"}
        onConfirm={handleToggleActive}
        onCancel={() => setConfirmToggle(false)}
      />
    </AppLayout>
  );
}
