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
  KeyRound,
  Shield,
  Building,
} from "lucide-react";

export default function HytekProfileSettingsPage() {
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
      const res = await fetch("/api/auth/profile?company=hytek", {
        headers: { "x-company": "hytek" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const meRes = await fetch("/api/auth/me?company=hytek", {
          headers: { "x-company": "hytek" },
        });
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
      const res = await fetch("/api/auth/profile?company=hytek", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-company": "hytek",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setNotification({ type: "success", message: "Prinson Hytek profile updated successfully!" });
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
      const res = await fetch("/api/auth/change-password?company=hytek", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company": "hytek",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");

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
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = currentUser.role === "ADMIN";

  return (
    <AppLayout
      company="hytek"
      title="Prinson Hytek Admin Profile"
      subtitle="Manage your admin profile details, contact information, and security credentials"
      user={currentUser}
    >
      <div className="space-y-6 max-w-4xl">
        {/* Notifications */}
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

        {/* Profile Card Summary Banner */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-black text-white font-extrabold text-2xl flex items-center justify-center border border-zinc-800">
              {name ? name.charAt(0).toUpperCase() : "A"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-black">{name || "Prinson Hytek Admin"}</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-black border border-zinc-300">
                  Hytek Admin
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{email}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400 font-mono">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-zinc-400" />
                  Prinson Hytek
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                  Dedicated Atlas Database
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Forms: Profile Info + Password Change */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form 1: Profile Information */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-black" />
                <h3 className="text-sm font-bold text-black">Personal & Contact Info</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-5">
                Update your name, contact phone, and official login email address.
              </p>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aryan Patel"
                      className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Email / Login Identifier *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@hytek.com"
                      className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none font-medium font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingProfile ? "Saving Profile..." : "Save Profile Details"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Form 2: Password & Credentials */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-black" />
                <h3 className="text-sm font-bold text-black">Security & Password</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-5">
                Change your account password for accessing Prinson Hytek.
              </p>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none"
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={submittingPassword}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{submittingPassword ? "Updating..." : "Update Password"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
