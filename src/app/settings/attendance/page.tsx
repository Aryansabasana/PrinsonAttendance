"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Settings,
  Save,
  Clock,
  Building,
  Globe,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function AttendanceSettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formData, setFormData] = useState({
    showroomName: "Prinson Plynest Showroom",
    showroomAddress: "Plot 42, 100ft Timber & Architectural Panels Arcade, Indiranagar, Bangalore",
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
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated || authData.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }
      setCurrentUser(authData.user);

      const res = await fetch("/api/settings");
      const data = await res.json();
      if (res.ok && data.setting) {
        setFormData({
          showroomName: data.setting.showroomName || "Prinson Plynest Showroom",
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
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update settings");

      setNotification({
        type: "success",
        message: "Showroom attendance configuration saved successfully.",
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
      title="Attendance Configuration & Rules"
      subtitle="Showroom operating hours, time tracking rules, and timezone settings"
      user={currentUser}
    >
      <div className="max-w-3xl space-y-5">
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
            <button onClick={() => setNotification(null)} className="font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-zinc-200 pb-4">
            <h3 className="text-base font-bold text-black">Showroom Business Identity</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              General display settings for the showroom portal
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Showroom Name
              </label>
              <input
                type="text"
                required
                value={formData.showroomName}
                onChange={(e) => setFormData({ ...formData, showroomName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:border-black outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Showroom Location & Address
              </label>
              <input
                type="text"
                value={formData.showroomAddress}
                onChange={(e) => setFormData({ ...formData, showroomAddress: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:border-black outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Business Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:border-black outline-none bg-white font-mono"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30) — Default</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT +08:00)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
              </select>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-5">
            <h3 className="text-base font-bold text-black mb-1">Time Tracking & Thresholds</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Decide whether attendance is status-only or includes check-in/out time recording
            </p>

            <div className="space-y-4">
              {/* Check-In/Check-Out toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <p className="text-xs font-bold text-black">Enable Check-In / Check-Out Time Tracking</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Allow recording arrival and departure timestamps on the daily register
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, enableCheckInOut: !formData.enableCheckInOut })
                  }
                  className="text-black hover:text-zinc-700 transition-colors"
                >
                  {formData.enableCheckInOut ? (
                    <ToggleRight className="w-8 h-8 text-black" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-zinc-300" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Standard Opening Time
                  </label>
                  <input
                    type="time"
                    value={formData.standardWorkHoursStart}
                    onChange={(e) =>
                      setFormData({ ...formData, standardWorkHoursStart: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-900 focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Standard Closing Time
                  </label>
                  <input
                    type="time"
                    value={formData.standardWorkHoursEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, standardWorkHoursEnd: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-900 focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Half-Day Hours Threshold
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={formData.halfDayThresholdHours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        halfDayThresholdHours: parseFloat(e.target.value) || 4.5,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:border-black outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-black hover:bg-zinc-800 shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving Configuration..." : "Save Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
