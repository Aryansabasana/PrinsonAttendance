"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Percent,
  UserCheck,
  UserX,
  Clock,
  CalendarCheck,
  Printer,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { formatDateStr, formatReadableDate } from "@/lib/utils";

export default function AttendanceReportsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  // Filter state
  const today = new Date();
  const defaultStart = formatDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
  const defaultEnd = formatDateStr(today);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [selectedDesignation, setSelectedDesignation] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchInitial();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedEmpId, selectedDesignation, selectedStatus]);

  const fetchInitial = async () => {
    try {
      const [authRes, empRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/employees?status=active"),
      ]);

      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated || authData.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }
      setCurrentUser(authData.user);

      const empData = await empRes.json();
      if (empRes.ok) {
        setEmployees(empData.employees || []);
      }
    } catch (err) {
      console.error("Initial reports error", err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        employeeId: selectedEmpId,
        designation: selectedDesignation,
        status: selectedStatus,
      });

      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setReportData(data);
      }
    } catch (err) {
      console.error("Report fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams({
      startDate,
      endDate,
      employeeId: selectedEmpId,
      designation: selectedDesignation,
      status: selectedStatus,
    });
    window.location.href = `/api/reports/export-csv?${params.toString()}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !reportData && !currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { summary, employeeBreakdown = [], dailyTrend = [] } = reportData || {};

  return (
    <AppLayout
      title="Showroom Attendance Reports & Analytics"
      subtitle={`Official reporting period: ${formatReadableDate(startDate)} to ${formatReadableDate(endDate)}`}
      user={currentUser}
    >
      <div className="space-y-6">
        {/* Filter Controls Bar (Hidden during print) */}
        <div className="no-print bg-white p-4 md:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-semibold">
              <span className="text-zinc-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs font-mono focus:border-black outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-semibold">
              <span className="text-zinc-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs font-mono focus:border-black outline-none"
              />
            </div>

            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 bg-white text-black focus:border-black outline-none"
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.employeeCode} - {e.fullName}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 bg-white text-black focus:border-black outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="APPROVED_LEAVE">Approved Leave</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-black" />
              <span>Print</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl shadow-subtle flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-zinc-500">Attendance Rate</span>
              <Percent className="w-4 h-4 text-black" />
            </div>
            <p className="text-2xl font-extrabold text-black font-sans">
              {summary?.overallRate ?? 0}%
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Weighted showroom average</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-emerald-700">Present Days</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-600 font-sans">
              {summary?.presentCount ?? 0}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Full days recorded</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-zinc-600">Half Days</span>
              <Clock className="w-4 h-4 text-zinc-600" />
            </div>
            <p className="text-2xl font-extrabold text-zinc-800 font-sans">
              {summary?.halfDayCount ?? 0}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">0.5 day duty logs</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-zinc-600">Approved Leaves</span>
              <CalendarCheck className="w-4 h-4 text-zinc-600" />
            </div>
            <p className="text-2xl font-extrabold text-zinc-800 font-sans">
              {summary?.approvedLeaveCount ?? 0}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Sanctioned absences</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-subtle col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-red-700">Absent Days</span>
              <UserX className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-extrabold text-red-600 font-sans">
              {summary?.absentCount ?? 0}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Unapproved absences</p>
          </div>
        </div>

        {/* Daily Attendance Trend in Range */}
        {dailyTrend.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle">
            <h3 className="text-sm font-bold text-black mb-1">
              Attendance Distribution Across Period
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Day-by-day attendance trends in the selected range
            </p>
            <div className="h-60 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="dateStr"
                      tick={{ fontSize: 10, fill: "#71717a" }}
                      axisLine={{ stroke: "#e4e4e7" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#71717a" }}
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
                        fontSize: "11px",
                      }}
                      itemStyle={{ color: "#FFFFFF" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar dataKey="present" name="Present" fill="#16a34a" stackId="a" />
                    <Bar dataKey="halfDay" name="Half Day" fill="#71717a" stackId="a" />
                    <Bar dataKey="approvedLeave" name="Leave" fill="#a1a1aa" stackId="a" />
                    <Bar dataKey="absent" name="Absent" fill="#dc2626" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* Employee-Wise Attendance Summary Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-subtle overflow-hidden">
          <div className="p-5 border-b border-zinc-200">
            <h3 className="text-sm font-bold text-black">Employee-Wise Attendance Performance</h3>
            <p className="text-xs text-zinc-500">
              Individual staff performance for the filtered period
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-600 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Designation</th>
                  <th className="py-3 px-3 text-center">Present</th>
                  <th className="py-3 px-3 text-center">Half Day</th>
                  <th className="py-3 px-3 text-center">Leave</th>
                  <th className="py-3 px-3 text-center">Absent</th>
                  <th className="py-3 px-3 text-center">Total Recorded</th>
                  <th className="py-3 px-4 text-right">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {employeeBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-zinc-400">
                      No data available for this criteria.
                    </td>
                  </tr>
                ) : (
                  employeeBreakdown.map((item: any) => (
                    <tr key={item.employee._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/employees/${item.employee._id}`}
                          className="font-bold text-black hover:underline"
                        >
                          {item.employee.fullName}
                        </Link>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {item.employee.employeeCode}
                        </p>
                      </td>

                      <td className="py-3.5 px-3 text-zinc-600">
                        {item.employee.designation}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-emerald-600">
                        {item.present}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-zinc-700">
                        {item.halfDay}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-zinc-600">
                        {item.approvedLeave}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-red-600">
                        {item.absent}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-black">
                        {item.totalMarked}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`inline-block font-extrabold text-xs px-2 py-0.5 rounded-lg ${
                            item.attendanceRate >= 90
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : item.attendanceRate >= 75
                              ? "bg-zinc-100 text-zinc-800 border border-zinc-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {item.attendanceRate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
            <span>Showing {employeeBreakdown.length} active employees</span>
            <span className="font-semibold">Prinson Plynest Showroom Analytics</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
