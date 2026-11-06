"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Users2,
  User,
  X,
} from "lucide-react";
import { ATTENDANCE_STATUS_META, formatReadableDate } from "@/lib/utils";

export default function HytekMonthlyAttendanceCalendarPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [calendarData, setCalendarData] = useState<any>(null);

  // Selected day details modal
  const [selectedDay, setSelectedDay] = useState<any>(null);

  useEffect(() => {
    fetchCalendar();
  }, [year, month, selectedEmployeeId]);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const [authRes, empRes] = await Promise.all([
        fetch("/api/auth/me?company=hytek", { headers: { "x-company": "hytek" } }),
        fetch("/api/employees?status=active&company=hytek", { headers: { "x-company": "hytek" } }),
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
        year: String(year),
        month: String(month),
        company: "hytek",
        ...(selectedEmployeeId ? { employeeId: selectedEmployeeId } : {}),
      });

      const res = await fetch(`/api/attendance/calendar?${params.toString()}`, {
        headers: { "x-company": "hytek" },
      });
      const data = await res.json();
      if (res.ok) {
        setCalendarData(data);
      }
    } catch (err) {
      console.error("Calendar fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  if (loading && !calendarData && !currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const days: any[] = calendarData?.days || [];
  const selectedEmp = employees.find((e) => e._id === selectedEmployeeId);

  const monthName = new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
  });

  return (
    <AppLayout
      company="hytek"
      title="Prinson Hytek Monthly Calendar"
      subtitle={`Attendance grid for ${monthName} ${year}`}
      user={currentUser}
    >
      <div className="space-y-5">
        {/* Top Month Selector Toolbar */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                title="Next Month"
                className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-black" />
              <h2 className="text-base font-extrabold text-black tracking-tight">
                {monthName} {year}
              </h2>
            </div>
          </div>

          {/* Filter by Employee Dropdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Users2 className="w-4 h-4 text-zinc-400" />
              <span className="font-bold text-zinc-700">View:</span>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-semibold text-black focus:border-black outline-none"
              >
                <option value="">Full Hytek Workforce Overview</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.employeeCode} - {e.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 md:p-6">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, idx) => (
              <div
                key={dayName}
                className={`py-2 text-[11px] font-bold uppercase tracking-wider ${
                  idx === 0 ? "text-red-500" : "text-zinc-500"
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              if (day.isPadding) {
                return (
                  <div
                    key={`pad-${idx}`}
                    className="h-28 rounded-xl border border-dashed border-zinc-100 bg-zinc-50/30"
                  />
                );
              }

              // Individual employee view
              if (selectedEmployeeId) {
                const att = day.attendance;
                const meta = att ? ATTENDANCE_STATUS_META[att.status as keyof typeof ATTENDANCE_STATUS_META] : null;

                return (
                  <div
                    key={day.dateStr}
                    onClick={() => att && setSelectedDay(att)}
                    className={`h-28 p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                      day.isToday
                        ? "border-black ring-1 ring-black bg-zinc-50/70"
                        : day.isSunday
                        ? "border-zinc-200 bg-zinc-50 text-zinc-400"
                        : "border-zinc-200 bg-white hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold font-mono ${day.isSunday ? "text-zinc-400" : "text-zinc-800"}`}>
                        {day.day}
                      </span>
                      {day.isSunday && (
                        <span className="text-[9px] uppercase font-bold text-zinc-400">Off</span>
                      )}
                    </div>

                    {!day.isSunday && att && (
                      <div className="mt-auto space-y-1">
                        <span
                          className={`inline-block w-full text-center text-[10px] font-bold py-1 px-1.5 rounded-lg border ${meta?.chipClass}`}
                        >
                          {att.status === "PRESENT"
                            ? "Present"
                            : att.status === "HALF_DAY"
                            ? "Half Day"
                            : att.status === "APPROVED_LEAVE"
                            ? "Leave"
                            : "Absent"}
                        </span>
                        {att.checkInTime && (
                          <p className="text-[9px] font-mono text-zinc-500 text-center truncate">
                            {att.checkInTime} - {att.checkOutTime || "..."}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // Workforce aggregate view
              const counts = day.counts || {};
              const hasActivity =
                counts.present > 0 ||
                counts.absent > 0 ||
                counts.halfDay > 0 ||
                counts.approvedLeave > 0;

              return (
                <Link
                  key={day.dateStr}
                  href={`/hytek/attendance/register?date=${day.dateStr}`}
                  className={`h-28 p-2 rounded-xl border flex flex-col justify-between transition-all group ${
                    day.isToday
                      ? "border-black ring-1 ring-black bg-zinc-50/60"
                      : day.isSunday
                      ? "border-zinc-200 bg-zinc-50/70 text-zinc-400"
                      : "border-zinc-200 bg-white hover:border-black"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono group-hover:text-black">
                      {day.day}
                    </span>
                    {day.isSunday ? (
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Off</span>
                    ) : (
                      <span className="text-[9px] text-zinc-400 font-medium group-hover:underline">
                        Register →
                      </span>
                    )}
                  </div>

                  {!day.isSunday && hasActivity && (
                    <div className="space-y-1 mt-auto">
                      {counts.present > 0 && (
                        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          <span>Present</span>
                          <span>{counts.present}</span>
                        </div>
                      )}
                      {counts.absent > 0 && (
                        <div className="flex items-center justify-between text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                          <span>Absent</span>
                          <span>{counts.absent}</span>
                        </div>
                      )}
                      {counts.halfDay > 0 && (
                        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-800 bg-zinc-100 px-1.5 py-0.5 rounded">
                          <span>Half Day</span>
                          <span>{counts.halfDay}</span>
                        </div>
                      )}
                      {counts.approvedLeave > 0 && (
                        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded">
                          <span>Leave</span>
                          <span>{counts.approvedLeave}</span>
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day Details Modal (when clicked in individual view) */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 relative">
            <button
              onClick={() => setSelectedDay(null)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-black rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-black mb-1">Attendance Details</h3>
            <p className="text-xs text-zinc-400 mb-4">{formatReadableDate(selectedDay.dateStr)}</p>

            <div className="space-y-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Recorded Status:</span>
                <StatusBadge status={selectedDay.status} size="sm" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Check-In Time:</span>
                <span className="text-xs font-mono font-bold text-black">
                  {selectedDay.checkInTime || "--"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Check-Out Time:</span>
                <span className="text-xs font-mono font-bold text-black">
                  {selectedDay.checkOutTime || "--"}
                </span>
              </div>

              {selectedDay.remarks && (
                <div className="pt-2 border-t border-zinc-200">
                  <span className="text-[11px] font-bold text-zinc-500 block mb-0.5">Remarks:</span>
                  <p className="text-xs text-zinc-700 italic">{selectedDay.remarks}</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
