"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";
import { ATTENDANCE_STATUS_META, formatReadableDate } from "@/lib/utils";

export default function EmployeeCalendarPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<any>(null);

  useEffect(() => {
    fetchCalendar();
  }, [year, month]);

  const fetchCalendar = async () => {
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
        year: String(year),
        month: String(month),
      });

      const res = await fetch(`/api/attendance/calendar?${params.toString()}`);
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

  const monthName = new Date(year, month - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <AppLayout
      title="My Attendance Calendar"
      subtitle={`Personal monthly attendance calendar · ${monthName}`}
      user={currentUser}
    >
      <div className="space-y-5">
        {/* Month Stepper Toolbar */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base md:text-lg font-bold text-black tracking-tight min-w-[150px] text-center">
              {monthName}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {calendarData?.stats && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                Present: {calendarData.stats.presentCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 font-bold border border-zinc-200">
                Half: {calendarData.stats.halfDayCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-bold border border-zinc-200">
                Leave: {calendarData.stats.approvedLeaveCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold border border-red-200">
                Absent: {calendarData.stats.absentCount}
              </span>
            </div>
          )}
        </div>

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
        </div>

        {/* Calendar Grid */}
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
              const meta =
                ATTENDANCE_STATUS_META[day.status as keyof typeof ATTENDANCE_STATUS_META] ||
                ATTENDANCE_STATUS_META.NOT_MARKED;

              return (
                <div
                  key={day.dateStr}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[85px] p-2.5 rounded-xl border cursor-pointer hover:shadow-md transition-all flex flex-col justify-between ${
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
            })}
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 relative">
            <button
              onClick={() => setSelectedDay(null)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-black rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-black mb-1">Attendance Record</h3>
            <p className="text-xs text-zinc-400 mb-4">{formatReadableDate(selectedDay.dateStr)}</p>

            <div className="space-y-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Status:</span>
                <StatusBadge status={selectedDay.status} size="sm" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Check-In:</span>
                <span className="text-xs font-mono font-bold text-black">
                  {selectedDay.checkInTime || "--"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Check-Out:</span>
                <span className="text-xs font-mono font-bold text-black">
                  {selectedDay.checkOutTime || "--"}
                </span>
              </div>

              {selectedDay.remarks && (
                <div className="pt-2 border-t border-zinc-200">
                  <span className="text-[11px] font-bold text-zinc-500 block mb-0.5">Note:</span>
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
