"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Users2,
  Plus,
  Search,
  ArrowUpDown,
  Edit,
  Eye,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
  Building,
  AlertCircle,
  X,
} from "lucide-react";
import { formatReadableDate } from "@/lib/utils";

function HytekEmployeeDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [designation, setDesignation] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [formData, setFormData] = useState({
    employeeCode: "",
    fullName: "",
    email: "",
    phone: "",
    designation: "",
    department: "Precision Assembly & Engineering",
    joiningDate: new Date().toISOString().split("T")[0],
    password: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Status toggle confirmation dialog
  const [statusDialog, setStatusDialog] = useState<{
    isOpen: boolean;
    employee: any;
  }>({ isOpen: false, employee: null });

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchEmployees();
  }, [search, status, designation, sortBy, sortOrder]);

  const fetchEmployees = async () => {
    try {
      const authRes = await fetch("/api/auth/me?company=hytek", {
        headers: { "x-company": "hytek" },
      });
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push("/login");
        return;
      }
      setCurrentUser(authData.user);

      const params = new URLSearchParams({
        search,
        status,
        designation,
        sortBy,
        sortOrder,
        company: "hytek",
      });

      const res = await fetch(`/api/employees?${params.toString()}`, {
        headers: { "x-company": "hytek" },
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Failed to fetch Hytek employees", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormData({
      employeeCode: `PH-${100 + employees.length + 1}`,
      fullName: "",
      email: "",
      phone: "+91 ",
      designation: "",
      department: "Precision Assembly & Engineering",
      joiningDate: new Date().toISOString().split("T")[0],
      password: "Hytek@123",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (emp: any) => {
    setEditingEmployee(emp);
    setFormData({
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      email: emp.email || "",
      phone: emp.phone,
      designation: emp.designation,
      department: emp.department,
      joiningDate: emp.joiningDate,
      password: "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      if (editingEmployee) {
        // Update
        const res = await fetch(`/api/employees/${editingEmployee._id}?company=hytek`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-company": "hytek",
          },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update employee");
      } else {
        // Create
        const res = await fetch("/api/employees?company=hytek", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-company": "hytek",
          },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add employee");
      }

      setModalOpen(false);
      await fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!statusDialog.employee) return;
    try {
      const newStatus = !statusDialog.employee.isActive;
      const res = await fetch(`/api/employees/${statusDialog.employee._id}?company=hytek`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-company": "hytek",
        },
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (res.ok) {
        setStatusDialog({ isOpen: false, employee: null });
        await fetchEmployees();
      }
    } catch (err) {
      console.error("Toggle status error", err);
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
      title="Prinson Hytek Employee Directory"
      subtitle="Complete industrial roster, designations, departments & employment status"
      user={currentUser}
    >
      <div className="space-y-5">
        {/* Top Control Bar */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Hytek staff by name, ID, phone, or email..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black text-xs outline-none bg-zinc-50/50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 bg-white text-black focus:border-black outline-none"
            >
              <option value="all">All Employment Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Deactivated Staff</option>
            </select>

            {/* Sort By */}
            <button
              onClick={() => {
                if (sortBy === "name") setSortBy("joiningDate");
                else if (sortBy === "joiningDate") setSortBy("employeeCode");
                else setSortBy("name");
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 flex items-center gap-1.5 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-black" />
              <span>
                Sort: {sortBy === "name" ? "Name" : sortBy === "joiningDate" ? "Joining Date" : "ID"}
              </span>
            </button>

            {isAdmin && (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl shadow-subtle flex items-center gap-1.5 transition-colors ml-auto md:ml-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Hytek Employee</span>
              </button>
            )}
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-600 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Designation & Department</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Joining Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400">
                      No Prinson Hytek employees found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/hytek/employees/${emp._id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-zinc-100 text-black font-bold flex items-center justify-center text-sm border border-zinc-300 flex-shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                            {emp.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-black group-hover:text-zinc-600 transition-colors">
                              {emp.fullName}
                            </p>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {emp.employeeCode}
                            </span>
                          </div>
                        </Link>
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="font-bold text-black">{emp.designation}</p>
                        <p className="text-[10px] text-zinc-400">{emp.department}</p>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-mono text-zinc-700 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-zinc-400" />
                            {emp.phone}
                          </span>
                          {emp.email && (
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-zinc-400" />
                              {emp.email}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-zinc-600 font-mono text-[11px]">
                        {formatReadableDate(emp.joiningDate)}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            emp.isActive
                              ? "bg-zinc-100 text-black border border-zinc-300"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              emp.isActive ? "bg-black" : "bg-red-500"
                            }`}
                          />
                          <span>{emp.isActive ? "Active" : "Deactivated"}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/hytek/employees/${emp._id}`}
                            title="View Full Profile"
                            className="p-1.5 text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(emp)}
                                title="Edit Employee"
                                className="p-1.5 text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setStatusDialog({ isOpen: true, employee: emp })}
                                title={emp.isActive ? "Deactivate" : "Activate"}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  emp.isActive
                                    ? "text-zinc-400 hover:text-red-600 hover:bg-red-50"
                                    : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
                                }`}
                              >
                                {emp.isActive ? (
                                  <UserX className="w-4 h-4" />
                                ) : (
                                  <UserCheck className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-black rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-black mb-1">
              {editingEmployee ? "Edit Hytek Employee" : "Register New Hytek Employee"}
            </h3>
            <p className="text-xs text-zinc-500 mb-5">
              Enter employee information to save in the dedicated Prinson Hytek database.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    placeholder="e.g. PH-101"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Vikram Sharma"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Production Specialist"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Precision Assembly"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vikram@hytek.com"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none font-mono"
                  />
                </div>

                {!editingEmployee && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Initial Password
                    </label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Hytek@123"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-black focus:border-black outline-none font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl shadow-sm transition-colors"
                >
                  {formSubmitting
                    ? "Saving..."
                    : editingEmployee
                    ? "Update Employee"
                    : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        isOpen={statusDialog.isOpen}
        title={statusDialog.employee?.isActive ? "Deactivate Employee?" : "Activate Employee?"}
        description={`Are you sure you want to ${
          statusDialog.employee?.isActive ? "deactivate" : "activate"
        } ${statusDialog.employee?.fullName} (${statusDialog.employee?.employeeCode})?`}
        confirmLabel={statusDialog.employee?.isActive ? "Deactivate" : "Activate"}
        variant={statusDialog.employee?.isActive ? "danger" : "primary"}
        onConfirm={handleToggleActive}
        onCancel={() => setStatusDialog({ isOpen: false, employee: null })}
      />
    </AppLayout>
  );
}

export default function HytekEmployeeDirectoryPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HytekEmployeeDirectoryContent />
    </React.Suspense>
  );
}
