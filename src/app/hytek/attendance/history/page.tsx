"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { formatReadableDate, formatDateStr } from "@/lib/utils";

export default function HytekAttendanceHistoryPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, totalRecords: 0, totalPages: 1 });
  const [employees, setEmployees] = useState<any[]>([]);

  // Filters
  const today = new Date();
  const defaultStart = formatDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
  const defaultEnd = formatDateStr(today);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchHistory();
  }, [pagination.page, startDate, endDate, selectedEmpId, selectedStatus, search]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [authRes, empRes] = await Promise.all([
        fetch("/api/auth/me?company=hytek", { headers: { "x-company": "hytek" } }),
        fetch("/api/employees?status=all&company=hytek", { headers: { "x-company": "hytek" } }),
      ]);

      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push("/login");
        return;
      }
      setCurrentUser(authData.user);

      const empData = await empRes.json();
      if (empRes.ok) {
        setEmployees(empData.employees || []);
      }

      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        startDate,
        endDate,
        status: selectedStatus,
        employeeId: selectedEmpId,
        search,
        company: "hytek",
      });

      const res = await fetch(`/api/attendance/history?${params.toString()}`, {
        headers: { "x-company": "hytek" },
      });
      const data = await res.json();
      if (res.ok) {
        setRecords(data.records || []);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch Hytek history", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams({
      startDate,
      endDate,
      status: selectedStatus,
      employeeId: selectedEmpId,
      company: "hytek",
    });
    window.location.href = `/api/reports/export-csv?${params.toString()}`;
  };

  if (loading && !records.length && !currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <AppLayout
      company="hytek"
      title="Prinson Hytek Attendance History"
      subtitle="Complete chronological attendance log with audit trail"
      user={currentUser}
    >
      <div className="space-y-5">
        {/* Filter Controls Bar */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Start Date */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-semibold">
              <span className="text-zinc-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs font-mono focus:border-black outline-none"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-semibold">
              <span className="text-zinc-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs font-mono focus:border-black outline-none"
              />
            </div>

            {/* Employee filter (Admin only) */}
            {isAdmin && (
              <select
                value={selectedEmpId}
                onChange={(e) => {
                  setSelectedEmpId(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 bg-white text-black focus:border-black outline-none"
              >
                <option value="">All Hytek Employees</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.employeeCode} - {e.fullName}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 bg-white text-black focus:border-black outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="APPROVED_LEAVE">Approved Leave</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>

          {/* Export CSV button */}
          {isAdmin && (
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl flex items-center gap-1.5 transition-colors self-start md:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        {/* History Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Designation</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Check-In / Out</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-3">Marked By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      No attendance records found matching this date range in Prinson Hytek.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-zinc-900 whitespace-nowrap">
                        {formatReadableDate(r.dateStr)}
                      </td>

                      <td className="py-3 px-3">
                        <Link
                          href={`/hytek/employees/${r.employee?._id}`}
                          className="font-bold text-black hover:underline"
                        >
                          {r.employee?.fullName}
                        </Link>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {r.employee?.employeeCode}
                        </p>
                      </td>

                      <td className="py-3 px-3 text-zinc-600">{r.employee?.designation}</td>

                      <td className="py-3 px-3">
                        <StatusBadge status={r.status} size="sm" />
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-600">
                        {r.checkInTime || r.checkOutTime ? (
                          <span>
                            {r.checkInTime || "--:--"} → {r.checkOutTime || "--:--"}
                          </span>
                        ) : (
                          <span className="text-zinc-300">--</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">
                        {r.remarks || "--"}
                      </td>

                      <td className="py-3 px-3 text-[11px] text-zinc-400">
                        {r.markedBy?.name || "System"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing {records.length} of {pagination.totalRecords} records (Page {pagination.page}{" "}
              of {pagination.totalPages || 1})
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
