"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { AlertCircle, ArrowRight, Building2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (data.company === "hytek") {
        router.push("/hytek/admin/dashboard");
      } else if (data.user.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/employee/dashboard");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-between selection:bg-black selection:text-white">
      {/* Top Navbar */}
      <nav className="h-16 px-6 md:px-12 flex items-center justify-between border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <BrandLogo href="/login" variant="light" name="Prinson" />
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 bg-zinc-100 px-3 py-1.5 rounded-full border border-zinc-200">
          <Building2 className="w-3.5 h-3.5 text-black" />
          <span>Attendance Portal</span>
        </div>
      </nav>

      {/* Main Login Card Section */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-white rounded-2xl shadow-elevated border border-zinc-200 p-6 sm:p-8 relative overflow-hidden">
            {/* Top decorative black accent strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-black" />

            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-black tracking-tight font-sans">
                Sign in to your portal
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Enter your credentials to access the Prinson Attendance Portal.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Email, Username, or Employee ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. employee ID or email"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:border-black focus:ring-1 focus:ring-black bg-zinc-50/50 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-300 focus:border-black focus:ring-1 focus:ring-black bg-zinc-50/50 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 focus:outline-none p-1 rounded-md transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-sm tracking-wide transition-all duration-150 flex items-center justify-center gap-2 shadow-subtle disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>


          </div>

          {/* Security badge footer */}
          <div className="mt-4 text-center">
            <p className="text-xs text-zinc-500">
              Prinson Attendance Management System · Automated Organization Routing
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-zinc-500 border-t border-zinc-200 bg-white/60">
        © {new Date().getFullYear()} Prinson Group. Attendance & Leave Portal.
      </footer>
    </div>
  );
}
