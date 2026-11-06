"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  RotateCcw,
  Save,
  AlertCircle,
  CheckSquare,
  Square,
  Info,
} from "lucide-react";
import { formatDateStr, formatReadableDate, ATTENDANCE_STATUS_META, AttendanceStatus } from "@/lib/utils";

interface RowItem {
  employee: any;
  attendanceId: string | null;
  status: AttendanceStatus;
  checkInTime: string;
  checkOutTime: string;
  remarks: string;
  markedBy: string | null;
  updatedAt: string | null;
  leaveInfo: any;
  // Local state for editing
  isDirty?: boolean;
  originalStatus?: AttendanceStatus;
  originalCheckIn?: string;
  originalCheckOut?: string;
  originalRemarks?: string;
}

function DailyAttendanceRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Date selection
  const todayStr = formatDateStr(new Date());
  const initialDate = searchParams.get("date") || todayStr;
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  // Register data
  const [register, setRegister] = useState<RowItem[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Filters & search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk action confirmation dialog
  const [bulkDialog, setBulkDialog] = useState<{
    isOpen: boolean;
    targetStatus: AttendanceStatus;
    count: number;
  }>({ isOpen: false, targetStatus: "PRESENT", count: 0 });

  useEffect(() => {
    fetchRegister(selectedDate);
  }, [selectedDate]);

  const fetchRegister = async (dateStr: string) => {
    setLoading(true);
    setNotification(null);
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

      const res = await fetch(`/api/attendance/daily?dateStr=${dateStr}&company=hytek`, {
        headers: { "x-company": "hytek" },
      });
      const data = await res.json();
      if (res.ok) {
        const rows: RowItem[] = data.register.map((r: any) => ({
          ...r,
          isDirty: false,
          originalStatus: r.status,
          originalCheckIn: r.checkInTime,
          originalCheckOut: r.checkOutTime,
          originalRemarks: r.remarks,
        }));
        setRegister(rows);
        setSummary(data.summary);
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error("Failed to load daily attendance", err);
    } finally {
      setLoading(false);
    }
  };

  // Date navigation helpers
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d - 1);
    setSelectedDate(formatDateStr(date));
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d + 1);
    setSelectedDate(formatDateStr(date));
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
  };

  // Change individual employee status locally
  const setRowStatus = (empId: string, newStatus: AttendanceStatus) => {
    setRegister((prev) =>
      prev.map((row) => {
        if (row.employee._id === empId) {
          const isDirty =
            newStatus !== row.originalStatus ||
            row.checkInTime !== row.originalCheckIn ||
            row.checkOutTime !== row.originalCheckOut ||
            row.remarks !== row.originalRemarks;

          let checkIn = row.checkInTime;
          let checkOut = row.checkOutTime;
          if (newStatus === "PRESENT" && !checkIn) {
            checkIn = "09:30";
          } else if (newStatus === "HALF_DAY" && !checkIn) {
            checkIn = "09:30";
            checkOut = "14:00";
          } else if (newStatus === "ABSENT" || newStatus === "APPROVED_LEAVE") {
            checkIn = "";
            checkOut = "";
          }

          return {
            ...row,
            status: newStatus,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            isDirty,
          };
        }
        return row;
      })
    );
  };

  const setRowField = (empId: string, field: "checkInTime" | "checkOutTime" | "remarks", value: string) => {
    setRegister((prev) =>
      prev.map((row) => {
        if (row.employee._id === empId) {
          const updated = { ...row, [field]: value };
          const isDirty =
            updated.status !== row.originalStatus ||
            updated.checkInTime !== row.originalCheckIn ||
            updated.checkOutTime !== row.originalCheckOut ||
            updated.remarks !== row.originalRemarks;
          return { ...updated, isDirty };
        }
        return row;
      })
    );
  };

  // Selection helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map((r) => r.employee._id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Bulk status action
  const requestBulkStatus = (targetStatus: AttendanceStatus) => {
    if (selectedIds.size === 0) return;
    setBulkDialog({
      isOpen: true,
      targetStatus,
      count: selectedIds.size,
    });
  };

  const executeBulkStatus = async () => {
    const targetStatus = bulkDialog.targetStatus;
    const employeeIds = Array.from(selectedIds);
    setSaving(true);
    setBulkDialog({ ...bulkDialog, isOpen: false });

    try {
      const res = await fetch("/api/attendance/bulk?company=hytek", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company": "hytek",
        },
        body: JSON.stringify({
          dateStr: selectedDate,
          employeeIds,
          status: targetStatus,
          checkInTime: targetStatus === "PRESENT" ? "09:30" : targetStatus === "HALF_DAY" ? "09:30" : "",
          checkOutTime: targetStatus === "HALF_DAY" ? "14:00" : "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk action failed");

      setNotification({
        type: "success",
        message: `Bulk marked ${employeeIds.length} employees as ${targetStatus} successfully in Prinson Hytek.`,
      });
      await fetchRegister(selectedDate);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to execute bulk action",
      });
    } finally {
      setSaving(false);
    }
  };

  // Save dirty rows
  const saveAllDirtyRows = async () => {
    const dirtyRows = register.filter((r) => r.isDirty);
    if (dirtyRows.length === 0) return;

    setSaving(true);
    setNotification(null);

    try {
      for (const row of dirtyRows) {
        const res = await fetch("/api/attendance/daily?company=hytek", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-company": "hytek",
          },
          body: JSON.stringify({
            employeeId: row.employee._id,
            dateStr: selectedDate,
            status: row.status,
            checkInTime: row.checkInTime,
            checkOutTime: row.checkOutTime,
            remarks: row.remarks,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Failed to update ${row.employee.fullName}`);
        }
      }

      setNotification({
        type: "success",
        message: `Successfully saved Prinson Hytek attendance records for ${dirtyRows.length} employee(s).`,
      });
      await fetchRegister(selectedDate);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to save attendance changes",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetAllDirtyRows = () => {
    setRegister((prev) =>
      prev.map((r) => ({
        ...r,
        status: r.originalStatus || "NOT_MARKED",
        checkInTime: r.originalCheckIn || "",
        checkOutTime: r.originalCheckOut || "",
        remarks: r.originalRemarks || "",
        isDirty: false,
      }))
    );
  };

  // Filtering
  const filteredRows = register.filter((row) => {
    const matchesSearch =
      search === "" ||
      row.employee.fullName.toLowerCase().includes(search.toLowerCase()) ||
      row.employee.employeeCode.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || row.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const dirtyCount = register.filter((r) => r.isDirty).length;

  if ((loading && !register.length) || !currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout
      company="hytek"
      title="Daily Attendance Register"
      subtitle="Select a date, mark individual or bulk employee attendance for Prinson Hytek"
      user={currentUser}
    >
      <div className="space-y-5">
        {/* Date Selector & Day Navigation Toolbar */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevDay}
              title="Previous Day"
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold text-black focus:border-black outline-none font-mono"
              />
            </div>

            <button
              onClick={handleNextDay}
              title="Next Day"
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleToday}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                selectedDate === todayStr
                  ? "bg-black text-white"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200"
              }`}
            >
              Today
            </button>
          </div>

          {/* Quick Date Display */}
          <div className="flex items-center gap-2 text-xs font-bold text-black">
            <Calendar className="w-4 h-4 text-black" />
            <span>{formatReadableDate(selectedDate)}</span>
            {selectedDate === todayStr && (
              <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 text-[10px] uppercase font-bold border border-zinc-200">
                Live Today
              </span>
            )}
          </div>
        </div>

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

        {/* Unsaved changes floating bar */}
        {dirtyCount > 0 && (
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <p className="text-xs font-bold text-zinc-100">
                You have {dirtyCount} unsaved attendance change(s) on this date.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetAllDirtyRows}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
              <button
                onClick={saveAllDirtyRows}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-black bg-white hover:bg-zinc-100 shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : `Save ${dirtyCount} Change(s)`}</span>
              </button>
            </div>
          </div>
        )}

        {/* Day Summary Metrics */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-700">Present</span>
              <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{summary.presentCount}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-center">
              <span className="text-[10px] font-bold uppercase text-red-700">Absent</span>
              <p className="text-xl font-extrabold text-red-600 mt-0.5">{summary.absentCount}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-center">
              <span className="text-[10px] font-bold uppercase text-zinc-600">Half Day</span>
              <p className="text-xl font-extrabold text-zinc-800 mt-0.5">{summary.halfDayCount}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-center">
              <span className="text-[10px] font-bold uppercase text-zinc-600">Leave</span>
              <p className="text-xl font-extrabold text-zinc-800 mt-0.5">{summary.approvedLeaveCount}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase text-zinc-500">Not Marked</span>
              <p className="text-xl font-extrabold text-zinc-500 mt-0.5">{summary.notMarkedCount}</p>
            </div>
          </div>
        )}

        {/* Register Table Section */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-subtle p-5">
          {/* Table Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-zinc-200">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Hytek staff by name or ID..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:border-black outline-none bg-zinc-50/50"
              />
            </div>

            {/* Bulk Action Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
                  <span className="text-[11px] font-bold text-black px-2">
                    {selectedIds.size} selected:
                  </span>
                  <button
                    onClick={() => requestBulkStatus("PRESENT")}
                    className="px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    Mark Present
                  </button>
                  <button
                    onClick={() => requestBulkStatus("HALF_DAY")}
                    className="px-2 py-1 text-[11px] font-bold rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
                  >
                    Half Day
                  </button>
                  <button
                    onClick={() => requestBulkStatus("ABSENT")}
                    className="px-2 py-1 text-[11px] font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Mark Absent
                  </button>
                </div>
              )}

              {/* Status filter dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:border-black outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present Only</option>
                <option value="HALF_DAY">Half Day Only</option>
                <option value="APPROVED_LEAVE">Approved Leave</option>
                <option value="ABSENT">Absent Only</option>
                <option value="NOT_MARKED">Not Marked</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-zinc-500 hover:text-black"
                    >
                      {selectedIds.size === filteredRows.length && filteredRows.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-black" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Designation</th>
                  <th className="py-3 px-4 min-w-[280px]">Attendance Status</th>
                  <th className="py-3 px-3">Check-In</th>
                  <th className="py-3 px-3">Check-Out</th>
                  <th className="py-3 px-3 min-w-[160px]">Remarks</th>
                  <th className="py-3 px-3 text-right">Status State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-zinc-400">
                      No Prinson Hytek employees match the filter on this date.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const isSelected = selectedIds.has(row.employee._id);

                    return (
                      <tr
                        key={row.employee._id}
                        className={`hover:bg-zinc-50 transition-colors ${
                          row.isDirty ? "bg-zinc-100/50" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectOne(row.employee._id)}
                            className="text-zinc-400 hover:text-black"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-black" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Employee info */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-black border border-zinc-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {row.employee.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-black">{row.employee.fullName}</p>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {row.employee.employeeCode}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Designation */}
                        <td className="py-3 px-3 text-zinc-600">
                          <p className="font-medium truncate max-w-[140px]">
                            {row.employee.designation}
                          </p>
                        </td>

                        {/* Quick 1-Click Status Chips */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {(["PRESENT", "HALF_DAY", "ABSENT", "APPROVED_LEAVE"] as AttendanceStatus[]).map(
                              (statusOpt) => {
                                const isCurrent = row.status === statusOpt;
                                const meta = ATTENDANCE_STATUS_META[statusOpt];

                                return (
                                  <button
                                    key={statusOpt}
                                    type="button"
                                    onClick={() => setRowStatus(row.employee._id, statusOpt)}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                                      isCurrent
                                        ? `${meta.chipClass} shadow-xs scale-105`
                                        : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200"
                                    }`}
                                  >
                                    {statusOpt === "PRESENT"
                                      ? "Present"
                                      : statusOpt === "HALF_DAY"
                                      ? "Half Day"
                                      : statusOpt === "ABSENT"
                                      ? "Absent"
                                      : "Leave"}
                                  </button>
                                );
                              }
                            )}
                          </div>
                          {row.leaveInfo && (
                            <p className="text-[10px] text-zinc-600 font-medium mt-1 flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              <span>
                                {row.leaveInfo.status} leave: {row.leaveInfo.leaveType}
                              </span>
                            </p>
                          )}
                        </td>

                        {/* Check-In */}
                        <td className="py-3 px-3">
                          <input
                            type="time"
                            value={row.checkInTime}
                            onChange={(e) =>
                              setRowField(row.employee._id, "checkInTime", e.target.value)
                            }
                            className="w-20 p-1 rounded-lg border border-zinc-200 text-[11px] font-mono text-zinc-900 focus:border-black outline-none bg-white"
                          />
                        </td>

                        {/* Check-Out */}
                        <td className="py-3 px-3">
                          <input
                            type="time"
                            value={row.checkOutTime}
                            onChange={(e) =>
                              setRowField(row.employee._id, "checkOutTime", e.target.value)
                            }
                            className="w-20 p-1 rounded-lg border border-zinc-200 text-[11px] font-mono text-zinc-900 focus:border-black outline-none bg-white"
                          />
                        </td>

                        {/* Remarks */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) =>
                              setRowField(row.employee._id, "remarks", e.target.value)
                            }
                            placeholder="Optional note..."
                            className="w-full p-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-900 focus:border-black outline-none bg-white placeholder:text-zinc-400"
                          />
                        </td>

                        {/* State & Save */}
                        <td className="py-3 px-3 text-right">
                          {row.isDirty ? (
                            <span className="text-[10px] font-bold text-zinc-800 bg-zinc-200 px-2 py-0.5 rounded-full">
                              Modified
                            </span>
                          ) : (
                            <StatusBadge status={row.status} size="sm" />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing {filteredRows.length} staff records · Changes require explicit save to persist to Prinson Hytek database.
            </span>
            {dirtyCount > 0 && (
              <button
                onClick={saveAllDirtyRows}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-black hover:bg-zinc-800 shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving Changes..." : `Save All ${dirtyCount} Modifications`}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Action Confirmation Dialog */}
      <ConfirmDialog
        isOpen={bulkDialog.isOpen}
        title="Confirm Bulk Attendance Action"
        description={`Are you sure you want to mark ${bulkDialog.count} selected employees as ${bulkDialog.targetStatus} for ${formatReadableDate(
          selectedDate
        )}? This will record in the Prinson Hytek audit log.`}
        confirmLabel={`Mark as ${bulkDialog.targetStatus}`}
        variant={
          bulkDialog.targetStatus === "ABSENT"
            ? "danger"
            : bulkDialog.targetStatus === "HALF_DAY"
            ? "warning"
            : "primary"
        }
        onConfirm={executeBulkStatus}
        onCancel={() => setBulkDialog({ ...bulkDialog, isOpen: false })}
      />
    </AppLayout>
  );
}

export default function DailyAttendanceRegisterPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DailyAttendanceRegisterContent />
    </React.Suspense>
  );
}
