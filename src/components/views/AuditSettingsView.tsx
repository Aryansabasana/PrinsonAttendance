"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { getTenantApiUrl, getTenantApiHeaders } from "@/lib/tenant-client";

interface AuditSettingsViewProps {
  company?: "plynest" | "hytek";
}

export function AuditSettingsView({ company = "plynest" }: AuditSettingsViewProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, pagination.page, company]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const authRes = await fetch(getTenantApiUrl("/api/auth/me", company), {
        headers: getTenantApiHeaders(company),
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
      });

      const res = await fetch(getTenantApiUrl(`/api/audit-logs?${params.toString()}`, company), {
        headers: getTenantApiHeaders(company),
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
      title="Governance & Audit Trail"
      subtitle="Complete chronological audit log of all attendance corrections and administrative overrides"
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

        {/* Logs List */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Admin Performer</th>
                  <th className="py-3 px-3">Target Staff</th>
                  <th className="py-3 px-3">Date Affected</th>
                  <th className="py-3 px-4">Changes & Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400">
                      No audit log entries recorded for this filter.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-zinc-900">
                        {log.performerName || log.performedBy?.name || "Admin"}
                      </td>

                      <td className="py-3 px-3">
                        {log.employeeName ? (
                          <div>
                            <p className="font-bold text-zinc-900">{log.employeeName}</p>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {log.employeeCode}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-300">--</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-600">
                        {log.dateStr || "--"}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        {log.reason && (
                          <p className="font-medium text-zinc-700 italic mb-1">
                            &ldquo;{log.reason}&rdquo;
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                          {log.previousValue && (
                            <span className="bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded">
                              Old: {JSON.stringify(log.previousValue)}
                            </span>
                          )}
                          {log.newValue && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                              New: {JSON.stringify(log.newValue)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing {logs.length} of {pagination.total} audit logs
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
