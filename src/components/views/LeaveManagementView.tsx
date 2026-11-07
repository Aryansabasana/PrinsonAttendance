"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { LeaveStatusBadge } from "@/components/ui/LeaveStatusBadge";
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { formatReadableDate } from "@/lib/utils";
import { getTenantUrl, getTenantApiUrl, getTenantApiHeaders } from "@/lib/tenant-client";

interface LeaveManagementViewProps {
  company?: "plynest" | "hytek";
}

export function LeaveManagementView({ company = "plynest" }: LeaveManagementViewProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    leave: any;
    action: "APPROVE" | "REJECT";
    adminRemarks: string;
    override: boolean;
    conflicts: any[];
    loadingConflictCheck: boolean;
  }>({
    isOpen: false,
    leave: null,
    action: "APPROVE",
    adminRemarks: "",
    override: false,
    conflicts: [],
    loadingConflictCheck: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchLeaveRequests();
  }, [statusFilter, typeFilter, company]);

  const fetchLeaveRequests = async () => {
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
        status: statusFilter,
        leaveType: typeFilter,
      });

      const res = await fetch(getTenantApiUrl(`/api/leave?${params.toString()}`, company), {
        headers: getTenantApiHeaders(company),
      });
      const data = await res.json();
      if (res.ok) {
        setLeaveRequests(data.leaveRequests || []);
      }
    } catch (err) {
      console.error("Failed to load leave requests", err);
    } finally {
      setLoading(false);
    }
  };

  const openDecisionDialog = async (leave: any, action: "APPROVE" | "REJECT") => {
    setDecisionModal({
      isOpen: true,
      leave,
      action,
      adminRemarks: "",
      override: false,
      conflicts: [],
      loadingConflictCheck: action === "APPROVE",
    });

    if (action === "APPROVE") {
      try {
        const res = await fetch(getTenantApiUrl(`/api/leave/${leave._id}`, company), {
          headers: getTenantApiHeaders(company),
        });
        const data = await res.json();
        if (res.ok && data.conflicts) {
          setDecisionModal((prev) => ({
            ...prev,
            conflicts: data.conflicts,
            loadingConflictCheck: false,
          }));
        }
      } catch (err) {
        console.error("Conflict check error", err);
      }
    }
  };

  const handleConfirmDecision = async () => {
    if (!decisionModal.leave) return;
    setSubmitting(true);
    setNotification(null);

    try {
      const res = await fetch(getTenantApiUrl(`/api/leave/${decisionModal.leave._id}`, company), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getTenantApiHeaders(company),
        },
        body: JSON.stringify({
          action: decisionModal.action,
          adminRemarks: decisionModal.adminRemarks,
          overrideAttendanceConflicts: decisionModal.override,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setDecisionModal((prev) => ({
            ...prev,
            override: true,
            conflicts: data.conflictingDates || [],
          }));
          alert(data.error);
          return;
        }
        throw new Error(data.error || "Decision failed");
      }

      setNotification({
        type: "success",
        message: data.message || `Leave ${decisionModal.action.toLowerCase()}d successfully.`,
      });
      setDecisionModal({ ...decisionModal, isOpen: false });
      await fetchLeaveRequests();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to process leave decision",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !leaveRequests.length && !currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingCount = leaveRequests.filter((l) => l.status === "PENDING").length;

  return (
    <AppLayout
      title="Showroom Leave Management"
      subtitle="Review showroom staff leave applications, resolve attendance conflicts & record decisions"
      user={currentUser}
      pendingLeavesCount={pendingCount}
    >
      <div className="space-y-5">
        {/* Notifications */}
        {notification && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-zinc-400 mr-1">Status:</span>
            {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                  statusFilter === st
                    ? "bg-black text-white shadow-subtle"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {st === "ALL" ? "All Requests" : st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400">Leave Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:border-black outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="CASUAL">Casual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="PERSONAL">Personal Leave</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Leave Requests List */}
        <div className="space-y-3">
          {leaveRequests.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-zinc-200 shadow-subtle text-center text-zinc-400">
              <FileCheck2 className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">No leave requests found</p>
              <p className="text-xs mt-0.5">There are no leave applications matching the filters.</p>
            </div>
          ) : (
            leaveRequests.map((leave) => {
              const isPending = leave.status === "PENDING";

              return (
                <div
                  key={leave._id}
                  className="bg-white rounded-2xl border border-zinc-200 shadow-subtle p-5 hover:border-black transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Employee & Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-100 text-black font-bold text-xs flex items-center justify-center border border-zinc-300">
                        {leave.employee?.fullName?.charAt(0) || "E"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={getTenantUrl(`/employees/${leave.employee?._id}`, company)}
                            className="font-bold text-black hover:underline"
                          >
                            {leave.employee?.fullName}
                          </Link>
                          <span className="font-mono text-[10px] text-zinc-400">
                            {leave.employee?.employeeCode}
                          </span>
                          <LeaveStatusBadge status={leave.status} size="sm" />
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          {leave.employee?.designation} · {leave.employee?.department}
                        </p>
                      </div>
                    </div>

                    <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-900 mb-1">
                        <span className="text-black uppercase font-bold tracking-wider">
                          {leave.leaveType} Leave
                        </span>
                        <span className="font-mono text-zinc-600">
                          📅 {leave.startDate} to {leave.endDate}
                        </span>
                      </div>
                      <p className="text-zinc-700 italic">
                        Reason: &ldquo;{leave.reason}&rdquo;
                      </p>
                    </div>

                    {leave.adminRemarks && (
                      <p className="text-xs text-black font-medium">
                        <span className="font-bold">Director Remark:</span> {leave.adminRemarks} (by{" "}
                        {leave.reviewedBy?.name || "Admin"})
                      </p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => openDecisionDialog(leave, "REJECT")}
                          className="px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => openDecisionDialog(leave, "APPROVE")}
                          className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl shadow-subtle transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve Leave</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-400 font-medium">
                        Reviewed on {formatReadableDate(leave.reviewedAt?.split("T")[0])}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Decision Dialog with Attendance Conflict Check */}
      {decisionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-zinc-200 p-6">
            <h3 className="text-base font-bold text-black mb-1">
              {decisionModal.action === "APPROVE"
                ? "Approve Leave Application"
                : "Reject Leave Application"}
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Staff: <span className="font-bold text-black">{decisionModal.leave?.employee?.fullName}</span> (
              {decisionModal.leave?.startDate} to {decisionModal.leave?.endDate})
            </p>

            {/* Conflict Warning */}
            {decisionModal.conflicts.length > 0 && (
              <div className="mb-4 p-3.5 rounded-xl bg-zinc-100 border border-zinc-300 text-xs text-zinc-900">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-zinc-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Existing Attendance Conflict Detected</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      This employee already has recorded attendance on these date(s):
                    </p>
                  </div>
                </div>

                <div className="space-y-1 pl-6">
                  {decisionModal.conflicts.map((c: any) => (
                    <div key={c.dateStr} className="flex items-center gap-2 font-mono text-[11px]">
                      <span>{c.dateStr}:</span>
                      <span className="font-bold">{c.status}</span>
                    </div>
                  ))}
                </div>

                <label className="flex items-center gap-2 cursor-pointer mt-3 pt-2 border-t border-zinc-200 font-semibold text-xs">
                  <input
                    type="checkbox"
                    checked={decisionModal.override}
                    onChange={(e) =>
                      setDecisionModal((prev) => ({ ...prev, override: e.target.checked }))
                    }
                    className="rounded border-zinc-400 text-black focus:ring-black"
                  />
                  <span>
                    Resolve conflict: Override existing attendance records to Approved Leave
                  </span>
                </label>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1">
                  Director / Admin Decision Remark
                </label>
                <textarea
                  rows={3}
                  value={decisionModal.adminRemarks}
                  onChange={(e) =>
                    setDecisionModal((prev) => ({ ...prev, adminRemarks: e.target.value }))
                  }
                  placeholder="Optional remark explaining the decision or coverage arrangements..."
                  className="w-full p-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:border-black outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setDecisionModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDecision}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-subtle transition-colors ${
                  decisionModal.action === "APPROVE"
                    ? "bg-black hover:bg-zinc-800"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submitting
                  ? "Processing..."
                  : `Confirm ${decisionModal.action === "APPROVE" ? "Approval" : "Rejection"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
