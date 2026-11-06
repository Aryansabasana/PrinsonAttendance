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
  CheckCircle2,
  Clock,
  FileCheck2,
  Phone,
  Mail,
  UserCheck,
  UserX,
  Building,
  History,
  CalendarDays,
  Percent,
  Edit,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatReadableDate, ATTENDANCE_STATUS_META } from "@/lib/utils";

export default function EmployeeProfilePage() {
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
        fetch("/api/auth/me"),
        fetch(`/api/employees/${employeeId}`),
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
      const res = await fetch(`/api/attendance/calendar?year=${calYear}&month=${calMonth}&employeeId=${employeeId}`);
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
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
      title={`${employee.fullName} — Profile`}
      subtitle={`${employee.employeeCode} · ${employee.designation} · ${employee.department}`}
      user={currentUser}
    >
      <div className="space-y-5">
        {/* Back Link & Header Card */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="mb-4">
            <Link
              href="/employees"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Employee Directory</span>
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
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                      : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
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

        {/* Tab 2: Full Attendance History */}
        {activeTab === "attendance" && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-black mb-4">
              All Attendance Records ({recentAttendance.length} records)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Attendance Status</th>
                    <th className="py-3 px-3">Check-In Time</th>
                    <th className="py-3 px-3">Check-Out Time</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {recentAttendance.map((att) => (
                    <tr key={att._id} className="hover:bg-zinc-50">
                      <td className="py-3 px-4 font-semibold text-zinc-900">
                        {formatReadableDate(att.dateStr)}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={att.status} size="sm" />
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-600">
                        {att.checkInTime || "--"}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-600">
                        {att.checkOutTime || "--"}
                      </td>
                      <td className="py-3 px-4 text-zinc-500">{att.remarks || "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Monthly Calendar */}
        {activeTab === "calendar" && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base font-bold text-black">
                  {new Date(calYear, calMonth - 1).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <button
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Monthly stats badge */}
              {calData?.stats && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Present: {calData.stats.presentCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 font-bold border border-zinc-200">
                    Half: {calData.stats.halfDayCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-bold border border-zinc-200">
                    Leave: {calData.stats.approvedLeaveCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold border border-red-200">
                    Absent: {calData.stats.absentCount}
                  </span>
                </div>
              )}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                <div
                  key={dayName}
                  className="text-center py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400"
                >
                  {dayName}
                </div>
              ))}

              {calLoading ? (
                <div className="col-span-7 py-12 text-center text-zinc-400">
                  Loading monthly calendar...
                </div>
              ) : (
                calData?.days?.map((day: any) => {
                  const meta = ATTENDANCE_STATUS_META[day.status as keyof typeof ATTENDANCE_STATUS_META] || ATTENDANCE_STATUS_META.NOT_MARKED;

                  return (
                    <div
                      key={day.dateStr}
                      className={`min-h-[75px] p-2 rounded-xl border flex flex-col justify-between transition-colors ${
                        day.isSunday
                          ? "bg-zinc-100/50 border-zinc-200 text-zinc-400"
                          : meta.calendarBg
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{day.day}</span>
                        {day.isSunday && (
                          <span className="text-[9px] uppercase font-bold text-zinc-400">Off</span>
                        )}
                      </div>

                      {!day.isSunday && (
                        <div className="mt-auto">
                          <p className="text-[10px] font-bold leading-tight">{meta.label}</p>
                          {day.checkInTime && (
                            <p className="text-[9px] font-mono text-zinc-500 mt-0.5">
                              {day.checkInTime}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Leaves History */}
        {activeTab === "leaves" && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-black mb-4">
              Leave Applications History ({leaveRequests.length})
            </h3>
            <div className="space-y-3">
              {leaveRequests.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">
                  No leave applications submitted by this employee.
                </p>
              ) : (
                leaveRequests.map((leave: any) => (
                  <div
                    key={leave._id}
                    className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-black uppercase tracking-wider">
                          {leave.leaveType} Leave
                        </span>
                        <span className="text-xs font-mono text-zinc-600">
                          {leave.startDate} to {leave.endDate}
                        </span>
                        <LeaveStatusBadge status={leave.status} size="sm" />
                      </div>
                      <p className="text-xs text-zinc-600 italic">
                        Reason: &ldquo;{leave.reason}&rdquo;
                      </p>
                      {leave.adminRemarks && (
                        <p className="text-[11px] text-black font-medium mt-1">
                          Admin Remark: {leave.adminRemarks}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 whitespace-nowrap self-end sm:self-auto">
                      Submitted on {formatReadableDate(leave.createdAt?.split("T")[0])}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmToggle}
        title={employee.isActive ? "Deactivate Employee" : "Re-activate Employee"}
        description={
          employee.isActive
            ? `Deactivating ${employee.fullName} preserves all their historical attendance data and reports, but prevents further logins.`
            : `Re-activate ${employee.fullName} to restore active showroom duties.`
        }
        confirmLabel={employee.isActive ? "Deactivate" : "Re-activate"}
        variant={employee.isActive ? "danger" : "primary"}
        onConfirm={handleToggleActive}
        onCancel={() => setConfirmToggle(false)}
      />
    </AppLayout>
  );
}
