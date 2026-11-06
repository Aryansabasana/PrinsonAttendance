"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  History,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { formatReadableDate, formatDateStr } from "@/lib/utils";

export default function EmployeeHistoryPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, totalRecords: 0, totalPages: 1 });

  const today = new Date();
  const defaultStart = formatDateStr(new Date(today.getFullYear(), today.getMonth() - 2, 1));
  const defaultEnd = formatDateStr(today);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  useEffect(() => {
    fetchHistory();
  }, [pagination.page, startDate, endDate, selectedStatus]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push("/login");
        return;
      }
      setCurrentUser(authData.user);

      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        startDate,
        endDate,
        status: selectedStatus,
      });

      const res = await fetch(`/api/attendance/history?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setRecords(data.records || []);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Personal history fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !records.length && !currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout
      title="My Attendance Logs"
      subtitle="Complete chronological history of your showroom duty and leaves"
      user={currentUser}
    >
      <div className="space-y-5">
        {/* Date Filter Bar */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
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
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Attendance Status</th>
                  <th className="py-3 px-3">Check-In</th>
                  <th className="py-3 px-3">Check-Out</th>
                  <th className="py-3 px-4">Remark / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-400">
                      No attendance records found for this period.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-zinc-900">
                        {formatReadableDate(r.dateStr)}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-600">
                        {r.checkInTime || "--:--"}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-600">
                        {r.checkOutTime || "--:--"}
                      </td>
                      <td className="py-3 px-4 text-zinc-500">{r.remarks || "--"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing {records.length} of {pagination.totalRecords} records
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
