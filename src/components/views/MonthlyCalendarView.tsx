"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { ATTENDANCE_STATUS_META, formatReadableDate } from "@/lib/utils";
import { CompanyTenant } from "@/lib/mongodb";
import { getTenantUrl, getTenantApiUrl, getTenantApiHeaders } from "@/lib/tenant-client";

interface MonthlyCalendarViewProps {
  company?: CompanyTenant;
}

export function MonthlyCalendarView({ company = "plynest" }: MonthlyCalendarViewProps) {
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
  }, [year, month, selectedEmployeeId, company]);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const [authRes, empRes] = await Promise.all([
        fetch(getTenantApiUrl("/api/auth/me", company), {
          headers: getTenantApiHeaders(company),
        }),
        fetch(getTenantApiUrl("/api/employees?status=active", company), {
          headers: getTenantApiHeaders(company),
        }),
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
        ...(selectedEmployeeId ? { employeeId: selectedEmployeeId } : {}),
      });

      const res = await fetch(getTenantApiUrl(`/api/attendance/calendar?${params.toString()}`, company), {
        headers: getTenantApiHeaders(company),
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

  const isIndividual = calendarData?.view === "individual";
  const monthName = new Date(year, month - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <AppLayout
      title="Monthly Attendance Calendar"
      subtitle={`Comprehensive monthly attendance view · ${monthName}`}
      company={company}
      user={currentUser}
    >
      <div className="space-y-5">
        {/* Navigation & Employee Switcher Toolbar */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Month Stepper */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <h2 className="text-base md:text-lg font-bold text-black tracking-tight min-w-[160px] text-center">
              {monthName}
            </h2>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Employee Switcher (Admin only) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-500">View:</span>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white text-black focus:border-black outline-none shadow-xs"
              >
                <option value="">Company-Wide Overview</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Monthly Summary Statistics Bar (if individual employee) */}
        {isIndividual && calendarData?.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-center">
              <span className="text-[10px] font-bold uppercase text-zinc-500">Attendance Rate</span>
              <p className="text-xl font-extrabold text-black mt-0.5">
                {calendarData.stats.hasStarted && calendarData.stats.attendancePercentage !== null
                  ? `${calendarData.stats.attendancePercentage}%`
                  : "N/A"}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-600">Present</span>
              <p className="text-xl font-extrabold text-emerald-600 mt-0.5">
                {calendarData.stats.presentCount}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-center">
              <span className="text-[10px] font-bold uppercase text-zinc-700">Half Day</span>
              <p className="text-xl font-extrabold text-zinc-700 mt-0.5">
                {calendarData.stats.halfDayCount}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-center">
              <span className="text-[10px] font-bold uppercase text-zinc-600">Leave</span>
              <p className="text-xl font-extrabold text-zinc-600 mt-0.5">
                {calendarData.stats.approvedLeaveCount}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-center">
              <span className="text-[10px] font-bold uppercase text-red-600">Absent</span>
              <p className="text-xl font-extrabold text-red-600 mt-0.5">
                {calendarData.stats.absentCount}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-center">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Not Marked</span>
              <p className="text-xl font-extrabold text-zinc-400 mt-0.5">
                {calendarData.stats.notMarkedCount}
              </p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap text-xs bg-white p-3 rounded-xl border border-zinc-200 text-zinc-600 font-medium">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mr-2">
            Legend:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
            <span>Half Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
            <span>Approved Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-200 border border-zinc-300" />
            <span>Not Marked</span>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 md:p-6">
          <div className="grid grid-cols-7 gap-2 md:gap-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
              <div
                key={dayName}
                className="text-center py-2 text-xs font-bold uppercase tracking-wider text-zinc-400"
              >
                {dayName}
              </div>
            ))}

            {calendarData?.days?.map((day: any) => {
              if (isIndividual) {
                const meta =
                  ATTENDANCE_STATUS_META[day.status as keyof typeof ATTENDANCE_STATUS_META] ||
                  ATTENDANCE_STATUS_META.NOT_MARKED;

                return (
                  <div
                    key={day.dateStr}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[90px] p-2.5 rounded-xl border cursor-pointer hover:shadow-md transition-all flex flex-col justify-between ${
                      day.isSunday
                        ? "bg-zinc-100/50 border-zinc-200 text-zinc-400"
                        : meta.calendarBg
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono">{day.day}</span>
                      {day.isSunday && (
                        <span className="text-[9px] uppercase font-bold text-zinc-400">Off</span>
                      )}
                    </div>

                    {!day.isSunday && (
                      <div className="mt-auto">
                        <span className="text-[10px] font-bold block">{meta.label}</span>
                        {day.checkInTime && (
                          <span className="text-[9px] font-mono text-zinc-500 block">
                            {day.checkInTime}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // Company-wide aggregate cell
              const counts = day.counts || {};
              const hasActivity = counts.present > 0 || counts.halfDay > 0 || counts.absent > 0 || counts.approvedLeave > 0;

              return (
                <Link
                  key={day.dateStr}
                  href={getTenantUrl(`/attendance/register?date=${day.dateStr}`, company)}
                  className={`min-h-[95px] p-2.5 rounded-xl border transition-all flex flex-col justify-between group hover:border-black hover:shadow-md ${
                    day.isSunday
                      ? "bg-zinc-100/50 border-zinc-200 text-zinc-400"
                      : hasActivity
                      ? "bg-white border-zinc-200"
                      : "bg-zinc-50/50 border-dashed border-zinc-200"
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
