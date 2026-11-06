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
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { formatReadableDate } from "@/lib/utils";

export default function HytekAdminLeaveManagementPage() {
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
  }, [statusFilter, typeFilter]);

  const fetchLeaveRequests = async () => {
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
        status: statusFilter,
        leaveType: typeFilter,
        company: "hytek",
      });

      const res = await fetch(`/api/leave?${params.toString()}`, {
        headers: { "x-company": "hytek" },
      });
      const data = await res.json();
      if (res.ok) {
        setLeaveRequests(data.leaveRequests || []);
      }
    } catch (err) {
      console.error("Failed to load Hytek leave requests", err);
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
        const res = await fetch(`/api/leave/${leave._id}?company=hytek`, {
          headers: { "x-company": "hytek" },
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
      const res = await fetch(`/api/leave/${decisionModal.leave._id}?company=hytek`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-company": "hytek",
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
      company="hytek"
      title="Prinson Hytek Leave Management"
      subtitle="Review industrial staff leave applications, resolve attendance conflicts & record decisions"
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

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-zinc-500">Filters:</span>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 bg-white text-black focus:border-black outline-none"
            >
              <option value="ALL">All Application Statuses</option>
              <option value="PENDING">Pending Action Only</option>
              <option value="APPROVED">Approved Requests</option>
              <option value="REJECTED">Rejected Requests</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 bg-white text-black focus:border-black outline-none"
            >
              <option value="ALL">All Leave Types</option>
              <option value="CASUAL">Casual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="PRIVILEGE">Privilege Leave</option>
              <option value="UNPAID">Unpaid Leave</option>
            </select>
          </div>

          <div className="text-xs text-zinc-500 font-semibold">
            <span>
              Total: {leaveRequests.length} request(s) · {pendingCount} pending review
            </span>
          </div>
        </div>

        {/* Leave Requests Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-600 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Leave Type</th>
                  <th className="py-3 px-3">Date Range & Duration</th>
                  <th className="py-3 px-4 min-w-[200px]">Reason</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Decision Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      No leave requests found matching the selected filters in Prinson Hytek.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((l) => (
                    <tr key={l._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/hytek/employees/${l.employee?._id}`}
                          className="font-bold text-black hover:underline"
                        >
                          {l.employee?.fullName}
                        </Link>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {l.employee?.employeeCode} · {l.employee?.designation}
                        </p>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-extrabold uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                          {l.leaveType}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-mono text-zinc-900 font-bold">
                          {formatReadableDate(l.startDate)} → {formatReadableDate(l.endDate)}
                        </div>
                        <span className="text-[10px] text-zinc-400 font-semibold">
                          {l.daysCount} calendar day(s)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-600 italic">
                        &ldquo;{l.reason}&rdquo;
                      </td>

                      <td className="py-3.5 px-3">
                        <LeaveStatusBadge status={l.status} size="sm" />
                      </td>

                      <td className="py-3.5 px-3 text-zinc-500">
                        {l.adminRemarks ? (
                          <span>{l.adminRemarks}</span>
                        ) : (
                          <span className="text-zinc-300 italic">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {l.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openDecisionDialog(l, "REJECT")}
                              className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                            <button
                              onClick={() => openDecisionDialog(l, "APPROVE")}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg shadow-sm transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400 italic">Decided</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      {decisionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 relative">
            <h3 className="text-base font-bold text-black mb-1">
              {decisionModal.action === "APPROVE" ? "Approve Leave Application" : "Reject Leave Application"}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Employee: <span className="font-bold text-black">{decisionModal.leave?.employee?.fullName}</span> (
              {decisionModal.leave?.startDate} to {decisionModal.leave?.endDate})
            </p>

            {/* Conflict Warning Alert */}
            {decisionModal.conflicts.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-zinc-100 border border-zinc-300 text-xs text-black">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-black" />
                  <span>Existing Attendance Records Conflict</span>
                </div>
                <p className="text-zinc-600 text-[11px]">
                  Attendance is already recorded on {decisionModal.conflicts.length} day(s) in this period.
                </p>
                <div className="mt-2 text-[10px] space-y-0.5 max-h-24 overflow-y-auto font-mono text-zinc-800">
                  {decisionModal.conflicts.map((c: any) => (
                    <div key={c.dateStr} className="flex justify-between">
                      <span>{c.dateStr}</span>
                      <span className="font-bold">{c.status}</span>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-300 cursor-pointer font-bold text-xs">
                  <input
                    type="checkbox"
                    checked={decisionModal.override}
                    onChange={(e) =>
                      setDecisionModal((prev) => ({ ...prev, override: e.target.checked }))
                    }
                    className="rounded border-zinc-300 text-black focus:ring-black"
                  />
                  <span>Override existing records with Approved Leave</span>
                </label>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Director / Admin Decision Note
                </label>
                <textarea
                  rows={3}
                  value={decisionModal.adminRemarks}
                  onChange={(e) =>
                    setDecisionModal((prev) => ({ ...prev, adminRemarks: e.target.value }))
                  }
                  placeholder="Optional note explaining the decision..."
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setDecisionModal({ ...decisionModal, isOpen: false })}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDecision}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-colors ${
                  decisionModal.action === "APPROVE"
                    ? "bg-black hover:bg-zinc-800"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submitting ? "Processing..." : `Confirm ${decisionModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
