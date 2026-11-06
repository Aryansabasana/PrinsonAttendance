"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Lock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  Mail,
  Phone,
  Clock,
  Calendar,
  KeyRound,
  UserCheck,
  Shield,
  Building,
} from "lucide-react";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile fields state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileMeta, setProfileMeta] = useState<any>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/profile");
      const data = await res.json();
      if (!res.ok || !data.success) {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (!meRes.ok || !meData.authenticated) {
          router.push("/login");
          return;
        }
        setCurrentUser(meData.user);
        setName(meData.user.name || "");
        setEmail(meData.user.email || "");
        return;
      }

      setCurrentUser(data.profile);
      setName(data.profile.name || "");
      setEmail(data.profile.email || data.profile.identifier || "");
      setPhone(data.profile.phone || "");
      setProfileMeta(data.profile);
    } catch (err) {
      console.error("Profile error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!name.trim() || name.trim().length < 2) {
      setNotification({ type: "error", message: "Name must be at least 2 characters long." });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setNotification({ type: "success", message: "Profile details updated successfully!" });
      setCurrentUser((prev: any) => ({
        ...prev,
        name: data.profile.name,
        email: data.profile.email,
        phone: data.profile.phone,
      }));
      setProfileMeta((prev: any) => ({
        ...prev,
        ...data.profile,
      }));
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to update profile" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (newPassword !== confirmPassword) {
      setNotification({ type: "error", message: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setNotification({ type: "error", message: "Password must be at least 6 characters long." });
      return;
    }

    setSubmittingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      setNotification({ type: "success", message: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to change password" });
    } finally {
      setSubmittingPassword(false);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-black tracking-wider uppercase">Loading Profile...</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === "ADMIN";

  return (
    <AppLayout
      title="Profile & Security Settings"
      subtitle="Manage your showroom portal profile details, contact information, and login credentials"
      user={currentUser}
    >
      <div className="max-w-4xl space-y-6">
        {notification && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span className="font-semibold">{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="font-bold hover:underline text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Profile Header Hero Card */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center font-extrabold text-2xl shadow-subtle border border-zinc-800 flex-shrink-0">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-black">{currentUser.name}</h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-900 border border-zinc-200">
                  {isAdmin ? "Showroom Director / Admin" : "Showroom Staff"}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Active
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {currentUser.employeeCode ? `Employee ID: ${currentUser.employeeCode} · ` : ""}
                Prinson Plynest Showroom Portal
              </p>
              {currentUser.email && (
                <p className="text-xs text-zinc-600 font-mono mt-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-black" />
                  {currentUser.email}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:items-end text-xs text-zinc-400 border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto border-zinc-200 space-y-1">
            {profileMeta.lastLogin && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Last login: {new Date(profileMeta.lastLogin).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}</span>
              </div>
            )}
            {profileMeta.createdAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Member since: {new Date(profileMeta.createdAt).toLocaleDateString("en-IN", {
                  month: "short",
                  year: "numeric",
                })}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2-Column Section: Personal Profile Details & Security Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Personal & Account Details */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200">
                <User className="w-4 h-4 text-black" />
                <div>
                  <h3 className="text-sm font-bold text-black">Profile Information</h3>
                  <p className="text-[11px] text-zinc-400">Update your name and primary contact details</p>
                </div>
              </div>

              <form id="profileForm" onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Vikramaditya Roy"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5">
                    Email / Login Username <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@plynest.com"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Used for logging into the Showroom Portal.
                  </p>
                </div>

                {(!isAdmin || profileMeta.phone) && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5">
                    Assigned Role
                  </label>
                  <div className="p-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-800 flex items-center justify-between">
                    <span>{isAdmin ? "Director / Admin (Full System Access)" : "Showroom Staff"}</span>
                    <ShieldCheck className="w-4 h-4 text-black" />
                  </div>
                </div>

                {profileMeta.employeeCode && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5">
                      Employee Code
                    </label>
                    <div className="p-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-mono font-semibold text-zinc-800">
                      {profileMeta.employeeCode}
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="pt-5 mt-4 border-t border-zinc-200">
              <button
                type="submit"
                form="profileForm"
                disabled={savingProfile}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-black hover:bg-zinc-800 shadow-subtle transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingProfile ? "Saving Details..." : "Save Profile Details"}</span>
              </button>
            </div>
          </div>

          {/* Column 2: Password & Security */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200">
                <Lock className="w-4 h-4 text-black" />
                <div>
                  <h3 className="text-sm font-bold text-black">Change Password</h3>
                  <p className="text-[11px] text-zinc-400">Update your account authentication credentials</p>
                </div>
              </div>

              <form id="passwordForm" onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5">
                    Current Password <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5">
                    New Password <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5">
                    Confirm New Password <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                  />
                </div>

                <div className="p-3 rounded-xl bg-zinc-100 border border-zinc-200 text-[11px] text-zinc-600 space-y-1">
                  <p className="font-bold text-black">Password Guidelines:</p>
                  <p>• Must be at least 6 characters long</p>
                  <p>• Recommended: combine letters, numbers, and symbols</p>
                </div>
              </form>
            </div>

            <div className="pt-5 mt-4 border-t border-zinc-200">
              <button
                type="submit"
                form="passwordForm"
                disabled={submittingPassword}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-black hover:bg-zinc-800 shadow-subtle transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{submittingPassword ? "Updating Password..." : "Update Password"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
