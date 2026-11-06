"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { LeaveStatusBadge } from "@/components/ui/LeaveStatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  FileCheck2,
  PlusCircle,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  X,
  Trash2,
} from "lucide-react";
import { formatReadableDate, formatDateStr } from "@/lib/utils";

export default function EmployeeLeavePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Leave Form State
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = formatDateStr(tomorrow);

  const [formData, setFormData] = useState({
    leaveType: "CASUAL",
    startDate: defaultDateStr,
    endDate: defaultDateStr,
    reason: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Cancellation dialog
  const [cancelDialog, setCancelDialog] = useState<{ isOpen: boolean; leaveId: string | null }>({
    isOpen: false,
    leaveId: null,
  });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push("/login");
        return;
      }
      setCurrentUser(authData.user);

      const res = await fetch("/api/leave");
      const data = await res.json();
      if (res.ok) {
        setLeaveRequests(data.leaveRequests || []);
      }
    } catch (err) {
      console.error("Fetch leaves error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    setNotification(null);

    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit leave request");

      setNotification({
        type: "success",
        message: "Leave application submitted successfully. It will be reviewed by the showroom manager.",
      });

      setFormData({
        leaveType: "CASUAL",
        startDate: defaultDateStr,
        endDate: defaultDateStr,
        reason: "",
      });

      await fetchLeaves();
    } catch (err: any) {
      setFormError(err.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async () => {
    if (!cancelDialog.leaveId) return;
    try {
      const res = await fetch(`/api/leave/${cancelDialog.leaveId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: "success", message: "Leave request cancelled successfully." });
        setCancelDialog({ isOpen: false, leaveId: null });
        await fetchLeaves();
      } else {
        alert(data.error || "Could not cancel leave request");
      }
    } catch (err) {
      console.error("Cancel leave error", err);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout
      title="Apply & Manage Leaves"
      subtitle="Submit showroom leave requests and review approval decisions"
      user={currentUser}
    >
      <div className="space-y-6">
        {notification && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Leave Application Form */}
          <div className="lg:col-span-1 bg-white p-5 md:p-6 rounded-2xl border border-zinc-200 shadow-subtle h-fit">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200">
              <PlusCircle className="w-4 h-4 text-black" />
              <h3 className="text-sm font-bold text-black">Apply for Showroom Leave</h3>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Leave Type *
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-semibold focus:border-black outline-none bg-white text-zinc-900"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="PERSONAL">Personal Leave</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-mono focus:border-black outline-none text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-mono focus:border-black outline-none text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Reason for Leave *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Please state clear reasons for your requested absence..."
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:border-black outline-none placeholder:text-zinc-400"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-black hover:bg-zinc-800 shadow-subtle transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "Submitting Request..." : "Submit Leave Application"}</span>
              </button>
            </form>
          </div>

          {/* Right: History & Status List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle">
              <h3 className="text-sm font-bold text-black mb-1">
                My Leave Applications ({leaveRequests.length})
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                Track status and manager remarks for all submitted leave requests
              </p>

              <div className="space-y-3">
                {leaveRequests.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-8 text-center">
                    You have not submitted any leave applications yet.
                  </p>
                ) : (
                  leaveRequests.map((leave) => {
                    const isPending = leave.status === "PENDING";

                    return (
                      <div
                        key={leave._id}
                        className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100/60 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-black uppercase tracking-wider">
                              {leave.leaveType} Leave
                            </span>
                            <span className="text-xs font-mono text-zinc-600">
                              📅 {leave.startDate} to {leave.endDate}
                            </span>
                            <LeaveStatusBadge status={leave.status} size="sm" />
                          </div>

                          <p className="text-xs text-zinc-700 italic">
                            &ldquo;{leave.reason}&rdquo;
                          </p>

                          {leave.adminRemarks && (
                            <div className="mt-2 p-2 rounded-lg bg-white border border-zinc-200 text-xs">
                              <span className="font-bold text-black block">
                                Manager Remark:
                              </span>
                              <p className="text-zinc-600 mt-0.5">{leave.adminRemarks}</p>
                            </div>
                          )}

                          <span className="text-[10px] text-zinc-400 block pt-1">
                            Applied on {formatReadableDate(leave.createdAt?.split("T")[0])}
                          </span>
                        </div>

                        {isPending && (
                          <button
                            onClick={() =>
                              setCancelDialog({ isOpen: true, leaveId: leave._id })
                            }
                            className="text-xs font-semibold text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 flex items-center gap-1 self-start sm:self-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Cancel Request</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={cancelDialog.isOpen}
        title="Cancel Leave Application"
        description="Are you sure you want to cancel this pending leave application?"
        confirmLabel="Cancel Application"
        variant="danger"
        onConfirm={handleCancelLeave}
        onCancel={() => setCancelDialog({ isOpen: false, leaveId: null })}
      />
    </AppLayout>
  );
}
