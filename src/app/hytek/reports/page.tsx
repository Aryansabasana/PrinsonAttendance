"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Percent,
  UserCheck,
  UserX,
  Clock,
  CalendarCheck,
  Printer,
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

export default function HytekAttendanceReportsPage() {
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
        fetch("/api/auth/me?company=hytek", { headers: { "x-company": "hytek" } }),
        fetch("/api/employees?status=active&company=hytek", { headers: { "x-company": "hytek" } }),
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
        company: "hytek",
      });

      const res = await fetch(`/api/reports?${params.toString()}`, {
        headers: { "x-company": "hytek" },
      });
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
      company: "hytek",
    });
    window.location.href = `/api/reports/export-csv?${params.toString()}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { metrics, employeeSummaries = [], dailyTrend = [] } = reportData || {};

  return (
    <AppLayout
      company="hytek"
      title="Prinson Hytek Reports & Analytics"
      subtitle={`Attendance aggregates & employee performance from ${formatReadableDate(startDate)} to ${formatReadableDate(endDate)}`}
      user={currentUser}
    >
      <div className="space-y-6">
        {/* Filter Controls Bar */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Start Date */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-semibold">
              <span className="text-zinc-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs font-mono focus:border-black outline-none"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-semibold">
              <span className="text-zinc-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs font-mono focus:border-black outline-none"
              />
            </div>

            {/* Employee filter */}
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 bg-white text-black focus:border-black outline-none"
            >
              <option value="">All Hytek Employees</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.employeeCode} - {e.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons: Export CSV & Print */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-bold text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
              Workforce Rate
            </span>
            <p className="text-2xl font-extrabold text-black mt-1">
              {metrics?.overallAttendanceRate ?? 0}%
            </p>
            <span className="text-[11px] text-zinc-400">Total duty percentage</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
              Total Present
            </span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              {metrics?.totalPresent ?? 0}
            </p>
            <span className="text-[11px] text-zinc-400">Full-day presences</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase text-red-600 tracking-wider">
              Total Absent
            </span>
            <p className="text-2xl font-extrabold text-red-600 mt-1">
              {metrics?.totalAbsent ?? 0}
            </p>
            <span className="text-[11px] text-zinc-400">Unapproved absences</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase text-zinc-700 tracking-wider">
              Half-Days
            </span>
            <p className="text-2xl font-extrabold text-zinc-800 mt-1">
              {metrics?.totalHalfDay ?? 0}
            </p>
            <span className="text-[11px] text-zinc-400">0.5 day duty</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm text-center col-span-2 md:col-span-1">
            <span className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider">
              Approved Leaves
            </span>
            <p className="text-2xl font-extrabold text-zinc-700 mt-1">
              {metrics?.totalApprovedLeave ?? 0}
            </p>
            <span className="text-[11px] text-zinc-400">Sanctioned leaves</span>
          </div>
        </div>

        {/* Daily Attendance Trend Chart */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-black">Attendance Trend Overview</h3>
              <p className="text-xs text-zinc-500">Day-by-day attendance counts for selected range</p>
            </div>
            <TrendingUp className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="h-64 w-full">
            {mounted && dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="dateStr" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#000000",
                      borderRadius: "8px",
                      color: "#FFFFFF",
                      fontSize: "11px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="present" name="Present" fill="#16a34a" stackId="a" />
                  <Bar dataKey="halfDay" name="Half Day" fill="#71717a" stackId="a" />
                  <Bar dataKey="approvedLeave" name="Leave" fill="#a1a1aa" stackId="a" />
                  <Bar dataKey="absent" name="Absent" fill="#dc2626" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                No attendance trend data available for this range.
              </div>
            )}
          </div>
        </div>

        {/* Employee Summary Breakdown Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-black">Employee Attendance Breakdown</h3>
            <span className="text-xs text-zinc-500">{employeeSummaries.length} total staff</span>
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
                  <th className="py-3 px-4 text-right">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {employeeSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      No employee summaries available for this date range in Prinson Hytek.
                    </td>
                  </tr>
                ) : (
                  employeeSummaries.map((emp: any) => (
                    <tr key={emp.employee._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          href={`/hytek/employees/${emp.employee._id}`}
                          className="font-bold text-black hover:underline"
                        >
                          {emp.employee.fullName}
                        </Link>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {emp.employee.employeeCode}
                        </p>
                      </td>

                      <td className="py-3 px-3 text-zinc-600">{emp.employee.designation}</td>

                      <td className="py-3 px-3 text-center font-bold text-emerald-600">
                        {emp.present}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-zinc-700">
                        {emp.halfDay}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-zinc-600">
                        {emp.approvedLeave}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-red-600">
                        {emp.absent}
                      </td>

                      <td className="py-3 px-4 text-right font-bold font-mono text-zinc-900">
                        {emp.attendanceRate !== null ? `${emp.attendanceRate}%` : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
