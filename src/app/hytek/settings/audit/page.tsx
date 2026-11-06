"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatReadableDate } from "@/lib/utils";

export default function HytekAuditTrailPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, pagination.page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const authRes = await fetch("/api/auth/me?company=hytek", {
        headers: { "x-company": "hytek" },
      });
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated || authData.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }
      setCurrentUser(authData.user);

      const params = new URLSearchParams({
        action: actionFilter,
        page: String(pagination.page),
        limit: String(pagination.limit),
        company: "hytek",
      });

      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: { "x-company": "hytek" },
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Audit logs error", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !logs.length && !currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout
      company="hytek"
      title="Prinson Hytek Governance & Audit Trail"
      subtitle="Complete chronological audit log of all attendance actions in the dedicated Hytek database"
      user={currentUser}
    >
      <div className="space-y-5">
        {/* Action filter */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-zinc-500 mr-2">Action Type:</span>
          {[
            { key: "ALL", label: "All Audit Logs" },
            { key: "ATTENDANCE_CORRECTED", label: "Attendance Corrections" },
            { key: "BULK_ATTENDANCE_MARKED", label: "Bulk Marked" },
            { key: "LEAVE_APPROVED", label: "Leave Approvals" },
            { key: "LEAVE_REJECTED", label: "Leave Rejections" },
            { key: "EMPLOYEE_STATUS_CHANGED", label: "Employee Status" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setActionFilter(item.key);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                actionFilter === item.key
                  ? "bg-black text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-600 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Performed By</th>
                  <th className="py-3 px-4">Reason / Details</th>
                  <th className="py-3 px-3">Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-400">
                      No audit log records recorded yet in Prinson Hytek database.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-black border border-zinc-300">
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-black">
                        {log.performerName || log.performedBy?.name || "Hytek Admin"}
                      </td>

                      <td className="py-3 px-4 text-zinc-600">
                        {log.reason || "--"}
                      </td>

                      <td className="py-3 px-3 text-[11px] font-mono text-zinc-500 max-w-xs truncate">
                        {log.previousValue || log.newValue ? (
                          <span>
                            {log.previousValue?.status ? `${log.previousValue.status} → ` : ""}
                            {log.newValue?.status || JSON.stringify(log.newValue || "").slice(0, 30)}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing {logs.length} of {pagination.total} audit records (Page {pagination.page} of{" "}
              {pagination.totalPages || 1})
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
