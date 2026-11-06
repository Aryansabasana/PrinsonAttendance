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
  Filter,
  ArrowUpDown,
  MoreVertical,
  Edit,
  Eye,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { formatReadableDate } from "@/lib/utils";

function EmployeeDirectoryContent() {
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
    department: "Sales & Client Advisory",
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
      const authRes = await fetch("/api/auth/me");
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
      });

      const res = await fetch(`/api/employees?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Failed to fetch employees", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormData({
      employeeCode: `PP-${100 + employees.length + 1}`,
      fullName: "",
      email: "",
      phone: "+91 ",
      designation: "",
      department: "Sales & Client Advisory",
      joiningDate: new Date().toISOString().split("T")[0],
      password: "Plynest@123",
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
        const res = await fetch(`/api/employees/${editingEmployee._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update employee");
      } else {
        // Create
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`/api/employees/${statusDialog.employee._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
      title="Showroom Employee Directory"
      subtitle="Complete showroom roster, designations, departments & employment status"
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
              placeholder="Search by name, ID, phone, or email..."
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
                <span>Add Employee</span>
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
                      No employees found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/employees/${emp._id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-zinc-100 text-black font-bold flex items-center justify-center text-sm border border-zinc-300 flex-shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                            {emp.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-black group-hover:text-zinc-600 transition-colors">
                              {emp.fullName}
                            </p>
                            <span className="text-[10px] text-zinc-400 font-mono tracking-wider">
                              {emp.employeeCode}
                            </span>
                          </div>
                        </Link>
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-zinc-900">{emp.designation}</p>
                        <p className="text-[10px] text-zinc-400">{emp.department}</p>
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="text-zinc-700 font-mono text-[11px]">{emp.phone}</p>
                        {emp.email && (
                          <p className="text-[10px] text-zinc-400 truncate max-w-[150px]">
                            {emp.email}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[11px] text-zinc-600">
                        {emp.joiningDate}
                      </td>

                      <td className="py-3.5 px-3">
                        {emp.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/employees/${emp._id}`}
                            title="View Full Profile"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(emp)}
                                title="Edit Employee Info"
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setStatusDialog({ isOpen: true, employee: emp })}
                                title={emp.isActive ? "Deactivate Employee" : "Re-activate Employee"}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  emp.isActive
                                    ? "text-zinc-400 hover:text-red-600 hover:bg-red-50"
                                    : "text-emerald-600 hover:bg-emerald-50"
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

          <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
            <span>Showing {employees.length} employees</span>
            <span className="font-medium">Workforce Register</span>
          </div>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200">
              <h3 className="text-base font-bold text-black">
                {editingEmployee ? "Edit Employee Information" : "Register New Employee"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-black rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingEmployee}
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    placeholder="e.g. PP-109"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-mono uppercase focus:border-black outline-none disabled:bg-zinc-100"
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
                    placeholder="e.g. Rahul Sharma"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs focus:border-black outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98450 12345"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="staff@plynest.com"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs focus:border-black outline-none"
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
                    placeholder="e.g. Interior Consultant"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs focus:border-black outline-none bg-white"
                  >
                    <option value="Sales & Client Advisory">Sales & Client Advisory</option>
                    <option value="Store Operations">Store Operations</option>
                    <option value="Logistics & Materials">Logistics & Materials</option>
                    <option value="Billing & Front Desk">Billing & Front Desk</option>
                    <option value="Executive Management">Executive Management</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Joining Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs focus:border-black outline-none"
                />
              </div>

              {!editingEmployee && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Portal Initial Password
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Default: Plynest@123"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-mono focus:border-black outline-none"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    The employee can sign in using their Employee ID or Email and this password.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 mt-5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg"
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
                    : "Create Employee Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={statusDialog.isOpen}
        title={
          statusDialog.employee?.isActive
            ? "Deactivate Employee"
            : "Re-activate Employee"
        }
        description={
          statusDialog.employee?.isActive
            ? `Are you sure you want to deactivate ${statusDialog.employee?.fullName}? Their historical attendance and leave records will remain preserved, but they will not be able to log in.`
            : `Are you sure you want to re-activate ${statusDialog.employee?.fullName}? They will be able to log in and attend the showroom again.`
        }
        confirmLabel={statusDialog.employee?.isActive ? "Deactivate" : "Re-activate"}
        variant={statusDialog.employee?.isActive ? "danger" : "primary"}
        onConfirm={handleToggleActive}
        onCancel={() => setStatusDialog({ isOpen: false, employee: null })}
      />
    </AppLayout>
  );
}

export default function EmployeeDirectoryPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <EmployeeDirectoryContent />
    </React.Suspense>
  );
}
