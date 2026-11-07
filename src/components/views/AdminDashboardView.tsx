"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LeaveStatusBadge } from "@/components/ui/LeaveStatusBadge";
import {
  Users2,
  UserCheck,
  UserX,
  Clock,
  CalendarCheck,
  HelpCircle,
  FileCheck2,
  Percent,
  PlusCircle,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  UserCog,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatReadableDate } from "@/lib/utils";
import { CompanyTenant } from "@/lib/mongodb";
import { getTenantUrl, getTenantApiUrl, getTenantApiHeaders } from "@/lib/tenant-client";

interface AdminDashboardViewProps {
  company?: CompanyTenant;
}

export function AdminDashboardView({ company = "plynest" }: AdminDashboardViewProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [mounted, setMounted] = useState(false);

  const isHytek = company === "hytek";
  const orgTitle = isHytek ? "Hytek Attendance & Workforce Dashboard" : "Showroom Attendance Dashboard";
  const facilityDescription = isHytek
    ? "Prinson Hytek Industrial Facility · Precision Engineering & Assembly"
    : "Prinson Plynest Showroom · Architectural Surfaces & Wood Panels Division";
  const roleBadge = isHytek ? "Hytek Administrator" : "Showroom Director";

  // Quick leave action dialog state
  const [leaveModal, setLeaveModal] = useState<{
    isOpen: boolean;
    leaveId: string;
    employeeName: string;
    action: "APPROVE" | "REJECT";
    adminRemarks: string;
    override: boolean;
    conflictWarning: string | null;
  }>({
    isOpen: false,
    leaveId: "",
    employeeName: "",
    action: "APPROVE",
    adminRemarks: "",
    override: false,
    conflictWarning: null,
  });

  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [company]);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [authRes, dashRes] = await Promise.all([
        fetch(getTenantApiUrl("/api/auth/me", company), {
          headers: getTenantApiHeaders(company),
        }),
        fetch(getTenantApiUrl("/api/dashboard/admin", company), {
          headers: getTenantApiHeaders(company),
        }),
      ]);

      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated || authData.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }
      setCurrentUser(authData.user);

      const dash = await dashRes.json();
      if (dashRes.ok) {
        setDashboardData(dash);
      }
    } catch (err) {
      console.error("Dashboard fetch error", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleQuickLeaveAction = async () => {
    setIsSubmittingLeave(true);
    try {
      const res = await fetch(getTenantApiUrl(`/api/leave/${leaveModal.leaveId}`, company), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getTenantApiHeaders(company),
        },
        body: JSON.stringify({
          action: leaveModal.action,
          adminRemarks: leaveModal.adminRemarks,
          overrideAttendanceConflicts: leaveModal.override,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.conflictingDates) {
          setLeaveModal((prev) => ({
            ...prev,
            conflictWarning: data.error,
            override: true,
          }));
          return;
        }
        alert(data.error || "Action failed");
        return;
      }

      setLeaveModal((prev) => ({ ...prev, isOpen: false }));
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-black tracking-wider uppercase">
            Loading {isHytek ? "Hytek" : "Showroom"} Portal...
          </p>
        </div>
      </div>
    );
  }

  const { metrics, todayList = [], sevenDayTrend = [], pendingLeaves = [], dateStr } =
    dashboardData || {};

  // Filter today's list based on selected quick filter
  const filteredTodayList = todayList.filter((item: any) => {
    if (statusFilter === "ALL") return true;
    return item.status === statusFilter;
  });

  // Pie chart data for today's distribution
  const pieData = [
    { name: "Present", value: metrics?.presentToday || 0, color: "#16a34a" },
    { name: "Absent", value: metrics?.absentToday || 0, color: "#dc2626" },
    { name: "Half Day", value: metrics?.halfDayToday || 0, color: "#71717a" },
    { name: "Approved Leave", value: metrics?.approvedLeaveToday || 0, color: "#a1a1aa" },
    { name: "Not Marked", value: metrics?.notMarkedToday || 0, color: "#e4e4e7" },
  ].filter((item) => item.value > 0);

  return (
    <AppLayout
      title={orgTitle}
      subtitle={`Live workforce register & ${isHytek ? "facility" : "showroom"} attendance overview · ${formatReadableDate(dateStr)}`}
      company={company}
      user={currentUser}
      pendingLeavesCount={metrics?.pendingLeavesCount || 0}
    >
      <div className="space-y-6">
        {/* Top greeting & Refresh action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg md:text-xl font-extrabold text-black tracking-tight">
                Welcome, {currentUser.name}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-900 font-bold border border-zinc-200">
                {roleBadge}
              </span>
              <Link
                href={getTenantUrl("/settings/profile", company)}
                className="text-xs font-bold text-black hover:text-zinc-600 flex items-center gap-1 transition-colors ml-1"
                title="Manage Admin Profile"
              >
                <span>Manage Profile</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-zinc-500 mt-1">{facilityDescription}</p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="px-3 py-2 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <Link
              href={getTenantUrl("/settings/profile", company)}
              className="px-3.5 py-2 text-xs font-bold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-xl flex items-center gap-1.5 transition-colors"
              title="Admin Profile Management & Settings"
            >
              <UserCog className="w-3.5 h-3.5 text-black" />
              <span>Profile Settings</span>
            </Link>

            <Link
              href={getTenantUrl("/attendance/register", company)}
              className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl flex items-center gap-1.5 shadow-subtle transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Mark Attendance</span>
            </Link>

            <Link
              href={getTenantUrl("/employees?new=true", company)}
              className="px-3.5 py-2 text-xs font-bold text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </Link>
          </div>
        </div>

        {/* 8 Clickable Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            label="Total Active Employees"
            value={metrics?.totalActiveEmployees ?? 0}
            subtitle="Registered staff"
            icon={Users2}
            variant="default"
            href={getTenantUrl("/employees", company)}
          />

          <StatCard
            label="Present Today"
            value={metrics?.presentToday ?? 0}
            subtitle="Full-day present"
            icon={UserCheck}
            variant="present"
            active={statusFilter === "PRESENT"}
            onClick={() => setStatusFilter(statusFilter === "PRESENT" ? "ALL" : "PRESENT")}
            badge={metrics?.presentToday > 0 ? "Click to filter" : undefined}
          />

          <StatCard
            label="Absent Today"
            value={metrics?.absentToday ?? 0}
            subtitle="Unapproved absence"
            icon={UserX}
            variant="absent"
            active={statusFilter === "ABSENT"}
            onClick={() => setStatusFilter(statusFilter === "ABSENT" ? "ALL" : "ABSENT")}
            badge={metrics?.absentToday > 0 ? "Click to filter" : undefined}
          />

          <StatCard
            label="Approved Leave"
            value={metrics?.approvedLeaveToday ?? 0}
            subtitle="On sanctioned leave"
            icon={CalendarCheck}
            variant="leave"
            active={statusFilter === "APPROVED_LEAVE"}
            onClick={() => setStatusFilter(statusFilter === "APPROVED_LEAVE" ? "ALL" : "APPROVED_LEAVE")}
            badge={metrics?.approvedLeaveToday > 0 ? "Click to filter" : undefined}
          />

          <StatCard
            label="Half-Day Today"
            value={metrics?.halfDayToday ?? 0}
            subtitle="0.5 day duty"
            icon={Clock}
            variant="halfDay"
            active={statusFilter === "HALF_DAY"}
            onClick={() => setStatusFilter(statusFilter === "HALF_DAY" ? "ALL" : "HALF_DAY")}
            badge={metrics?.halfDayToday > 0 ? "Click to filter" : undefined}
          />

          <StatCard
            label="Not Marked Today"
            value={metrics?.notMarkedToday ?? 0}
            subtitle="Pending attendance"
            icon={HelpCircle}
            variant="pending"
            active={statusFilter === "NOT_MARKED"}
            onClick={() => setStatusFilter(statusFilter === "NOT_MARKED" ? "ALL" : "NOT_MARKED")}
            badge={metrics?.notMarkedToday > 0 ? "Action required" : undefined}
          />

          <StatCard
            label="Pending Leaves"
            value={metrics?.pendingLeavesCount ?? 0}
            subtitle="Awaiting decision"
            icon={FileCheck2}
            variant="pending"
            href={getTenantUrl("/leave", company)}
            badge={metrics?.pendingLeavesCount > 0 ? "Needs Review" : "Clear"}
          />

          <StatCard
            label="Attendance Rate"
            value={`${metrics?.overallAttendanceRate ?? 0}%`}
            subtitle="Current month average"
            icon={Percent}
            variant="rate"
            href={getTenantUrl("/reports", company)}
          />
        </div>

        {/* Analytics Section: 7-Day Trend + Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 7-Day Trend Chart */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-black">7-Day Attendance Trend</h3>
                <p className="text-xs text-zinc-500">Daily breakdown for the past week</p>
              </div>
              <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
                Daily Counts
              </span>
            </div>

            <div className="h-64 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sevenDayTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#71717a" }}
                      axisLine={{ stroke: "#e4e4e7" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#71717a" }}
                      axisLine={{ stroke: "#e4e4e7" }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#000000",
                        borderRadius: "8px",
                        border: "1px solid #27272a",
                        color: "#FFFFFF",
                        fontSize: "12px",
                      }}
                      itemStyle={{ color: "#FFFFFF" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar dataKey="present" name="Present" fill="#16a34a" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="halfDay" name="Half Day" fill="#71717a" stackId="a" />
                    <Bar dataKey="approvedLeave" name="Leave" fill="#a1a1aa" stackId="a" />
                    <Bar dataKey="absent" name="Absent" fill="#dc2626" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Today's Status Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-black">Today's Distribution</h3>
                <p className="text-xs text-zinc-500">Total: {metrics?.totalActiveEmployees || 0} employees</p>
              </div>
            </div>

            <div className="h-52 w-full flex items-center justify-center">
              {mounted && pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#000000",
                        borderRadius: "8px",
                        border: "1px solid #27272a",
                        color: "#FFFFFF",
                        fontSize: "11px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-zinc-400 text-center">
                  No attendance records marked yet today
                </div>
              )}
            </div>

            {/* Distribution Legend List */}
            <div className="space-y-1.5 pt-3 border-t border-zinc-200">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-zinc-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-zinc-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pending Leave Applications Section */}
        {pendingLeaves.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black">Pending Leave Requests</h3>
                  <p className="text-xs text-zinc-500">
                    Review and decide on {isHytek ? "Hytek facility" : "showroom"} employee leave requests
                  </p>
                </div>
              </div>

              <Link
                href={getTenantUrl("/leave", company)}
                className="text-xs font-bold text-black hover:text-zinc-700 flex items-center gap-1 transition-colors"
              >
                <span>View All Requests</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingLeaves.slice(0, 4).map((leave: any) => (
                <div
                  key={leave._id}
                  className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 hover:border-zinc-400 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs">
                          {leave.employee?.fullName?.charAt(0) || "E"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-black">
                            {leave.employee?.fullName}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {leave.employee?.employeeCode} · {leave.employee?.designation}
                          </p>
                        </div>
                      </div>
                      <LeaveStatusBadge status={leave.status} size="sm" />
                    </div>

                    <div className="text-xs bg-white p-2.5 rounded-lg border border-zinc-200 mb-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-900 mb-1">
                        <span className="uppercase text-black tracking-wider font-bold">
                          {leave.leaveType} Leave
                        </span>
                        <span className="text-zinc-500 font-mono">
                          {leave.startDate} to {leave.endDate}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 italic line-clamp-2">
                        &ldquo;{leave.reason}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
                    <button
                      onClick={() =>
                        setLeaveModal({
                          isOpen: true,
                          leaveId: leave._id,
                          employeeName: leave.employee?.fullName,
                          action: "REJECT",
                          adminRemarks: "",
                          override: false,
                          conflictWarning: null,
                        })
                      }
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() =>
                        setLeaveModal({
                          isOpen: true,
                          leaveId: leave._id,
                          employeeName: leave.employee?.fullName,
                          action: "APPROVE",
                          adminRemarks: "",
                          override: false,
                          conflictWarning: null,
                        })
                      }
                      className="px-3 py-1.5 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg shadow-sm transition-colors flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Attendance Register Live Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-subtle p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-black">
                Today&apos;s {isHytek ? "Facility" : "Showroom"} Attendance
              </h3>
              <p className="text-xs text-zinc-500">
                {formatReadableDate(dateStr)} · {todayList.length} total active employees
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-semibold text-zinc-500 mr-1 hidden md:inline">
                Filter:
              </span>
              {[
                { key: "ALL", label: "All Staff" },
                { key: "PRESENT", label: "Present" },
                { key: "HALF_DAY", label: "Half Day" },
                { key: "APPROVED_LEAVE", label: "Leave" },
                { key: "ABSENT", label: "Absent" },
                { key: "NOT_MARKED", label: "Unmarked" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    statusFilter === f.key
                      ? "bg-black text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-600 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Designation</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Check-In / Out</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {filteredTodayList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      No employees match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredTodayList.map((item: any) => (
                    <tr
                      key={item.employee._id}
                      className="hover:bg-zinc-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={getTenantUrl(`/employees/${item.employee._id}`, company)}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 text-black font-bold flex items-center justify-center text-xs border border-zinc-300 flex-shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                            {item.employee.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-black group-hover:text-zinc-600 transition-colors">
                              {item.employee.fullName}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-mono">
                              {item.employee.employeeCode}
                            </p>
                          </div>
                        </Link>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-zinc-700 font-medium">
                          {item.employee.designation}
                        </span>
                        <p className="text-[10px] text-zinc-400">{item.employee.department}</p>
                      </td>

                      <td className="py-3 px-3">
                        <StatusBadge status={item.status} size="sm" />
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-600">
                        {item.checkInTime || item.checkOutTime ? (
                          <span>
                            {item.checkInTime || "--:--"} → {item.checkOutTime || "--:--"}
                          </span>
                        ) : (
                          <span className="text-zinc-300">--</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">
                        {item.remarks || <span className="text-zinc-300 italic">None</span>}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={getTenantUrl(`/attendance/register?date=${dateStr}&employee=${item.employee._id}`, company)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-black hover:bg-zinc-100 border border-zinc-300 transition-colors"
                        >
                          <span>{item.status === "NOT_MARKED" ? "Mark" : "Edit"}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing {filteredTodayList.length} of {todayList.length} employees
            </span>
            <Link
              href={getTenantUrl("/attendance/register", company)}
              className="font-bold text-black hover:underline flex items-center gap-1"
            >
              <span>Open Full Daily Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Leave Decision Dialog */}
      {leaveModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 p-6">
            <h3 className="text-base font-bold text-black mb-2">
              {leaveModal.action === "APPROVE" ? "Approve Leave Request" : "Reject Leave Request"}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Employee: <span className="font-bold text-black">{leaveModal.employeeName}</span>
            </p>

            {leaveModal.conflictWarning && (
              <div className="p-3 mb-4 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-zinc-700 mt-0.5" />
                <div>
                  <p className="font-bold">Attendance Conflict</p>
                  <p className="mt-0.5">{leaveModal.conflictWarning}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Director / Admin Remark
                </label>
                <textarea
                  rows={3}
                  value={leaveModal.adminRemarks}
                  onChange={(e) =>
                    setLeaveModal((prev) => ({ ...prev, adminRemarks: e.target.value }))
                  }
                  placeholder="Optional remark or notes regarding this decision..."
                  className="w-full p-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:border-black focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              {leaveModal.conflictWarning && (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={leaveModal.override}
                    onChange={(e) =>
                      setLeaveModal((prev) => ({ ...prev, override: e.target.checked }))
                    }
                    className="rounded border-zinc-200 text-black focus:ring-black"
                  />
                  <span>Override existing attendance records with Approved Leave</span>
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setLeaveModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingLeave}
                onClick={handleQuickLeaveAction}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors ${
                  leaveModal.action === "APPROVE"
                    ? "bg-black hover:bg-zinc-800"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isSubmittingLeave ? "Processing..." : `Confirm ${leaveModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
