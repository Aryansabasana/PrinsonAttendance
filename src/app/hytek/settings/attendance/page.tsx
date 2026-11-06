"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Settings,
  Save,
  Clock,
  Building,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function HytekAttendanceSettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formData, setFormData] = useState({
    showroomName: "Prinson Hytek Industrial Facility",
    showroomAddress: "Hytek Precision Industrial Estate, Peenya, Bangalore",
    timezone: "Asia/Kolkata",
    enableCheckInOut: true,
    halfDayThresholdHours: 4.5,
    standardWorkHoursStart: "09:30",
    standardWorkHoursEnd: "18:30",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
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

      const res = await fetch("/api/settings?company=hytek", {
        headers: { "x-company": "hytek" },
      });
      const data = await res.json();
      if (res.ok && data.setting) {
        setFormData({
          showroomName: data.setting.showroomName || "Prinson Hytek Industrial Facility",
          showroomAddress: data.setting.showroomAddress || "",
          timezone: data.setting.timezone || "Asia/Kolkata",
          enableCheckInOut: data.setting.enableCheckInOut ?? true,
          halfDayThresholdHours: data.setting.halfDayThresholdHours || 4.5,
          standardWorkHoursStart: data.setting.standardWorkHoursStart || "09:30",
          standardWorkHoursEnd: data.setting.standardWorkHoursEnd || "18:30",
        });
      }
    } catch (err) {
      console.error("Fetch settings error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      const res = await fetch("/api/settings?company=hytek", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-company": "hytek",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update settings");

      setNotification({
        type: "success",
        message: "Prinson Hytek attendance configuration saved successfully.",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout
      company="hytek"
      title="Prinson Hytek Attendance Rules & Config"
      subtitle="Configure standard work timings, half-day thresholds & showroom operations"
      user={currentUser}
    >
      <div className="space-y-6 max-w-3xl">
        {/* Notification */}
        {notification && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
              notification.type === "success"
                ? "bg-zinc-100 border-zinc-300 text-black font-semibold"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-black" />
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

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Facility Info */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-200">
              <Building className="w-4 h-4 text-black" />
              <h3 className="text-sm font-bold text-black">Facility Information</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                Facility / Branch Name
              </label>
              <input
                type="text"
                required
                value={formData.showroomName}
                onChange={(e) => setFormData({ ...formData, showroomName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                Address & Location
              </label>
              <input
                type="text"
                value={formData.showroomAddress}
                onChange={(e) => setFormData({ ...formData, showroomAddress: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                Operating Timezone
              </label>
              <input
                type="text"
                disabled
                value={formData.timezone}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-500 font-mono"
              />
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Default showroom timezone: Asia/Kolkata (IST, UTC+05:30)
              </span>
            </div>
          </div>

          {/* Section 2: Shift Timings & Attendance Thresholds */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-200">
              <Clock className="w-4 h-4 text-black" />
              <h3 className="text-sm font-bold text-black">Shift & Attendance Rules</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Standard Shift Start
                </label>
                <input
                  type="time"
                  value={formData.standardWorkHoursStart}
                  onChange={(e) =>
                    setFormData({ ...formData, standardWorkHoursStart: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Standard Shift End
                </label>
                <input
                  type="time"
                  value={formData.standardWorkHoursEnd}
                  onChange={(e) =>
                    setFormData({ ...formData, standardWorkHoursEnd: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                Half-Day Threshold (Hours)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="12"
                  value={formData.halfDayThresholdHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      halfDayThresholdHours: parseFloat(e.target.value) || 4.5,
                    })
                  }
                  className="w-32 px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none font-mono font-bold"
                />
                <span className="text-xs text-zinc-500">
                  Minimum duty hours required before converting to a half-day
                </span>
              </div>
            </div>

            {/* Enable Check-In / Check-Out Tracking */}
            <div className="pt-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-black">Enable In/Out Timestamps</p>
                <p className="text-[11px] text-zinc-500">
                  Record exact check-in and check-out times in attendance registers
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, enableCheckInOut: !formData.enableCheckInOut })
                }
                className="text-black hover:opacity-80 transition-opacity"
              >
                {formData.enableCheckInOut ? (
                  <ToggleRight className="w-8 h-8 text-black" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-zinc-400" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving Config..." : "Save Attendance Rules"}</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
