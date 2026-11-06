# Prinson Plynest — Employee Attendance Portal

An exclusive, high-end, responsive employee attendance and leave management web application tailored specifically for **Prinson Plynest Showroom** (Architectural Wood Panels, Veneers & Interior Surfaces).

> **Pure Workforce Attendance & Leave Management**: This portal is intentionally architected exclusively for employee attendance tracking and leave administration. Absolutely no salary calculations, payroll, wages, payments, or financial records are included.

---

## 1. Brand Identity & Design System

The application features a contemporary retail showroom aesthetic with clean editorial layouts, Plus Jakarta Sans typography, restrained shadows, and subtle interactions:

- **Warm Ivory Background**: `#F7F5EF` (`bg-ivory`)
- **Deep Forest Green**: `#173D32` (`bg-forest`)
- **Jade Green** (Present Status): `#23856D` (`bg-jade`)
- **Muted Terracotta** (Absent Status): `#D97757` (`bg-terracotta`)
- **Soft Amber** (Half-Day & Pending Leave): `#E9B44C` (`bg-amberSoft`)
- **Slate Blue** (Approved Leave Status): `#6686A4` (`bg-slateBlue`)
- **Primary Text**: `#24332E` (`text-charcoal`)
- **Geometric Monogram**: Layered veneer/plywood architectural sheets emblem

---

## 2. Technology Stack

- **Framework**: Next.js 14 with App Router (Full SSR + Client Components)
- **Language**: TypeScript & TSX
- **Styling**: Tailwind CSS with custom brand palette & Plus Jakarta Sans typography
- **Icons**: Lucide Icons
- **Database & ODM**: MongoDB with Mongoose
- **Analytics & Data Visualizations**: Recharts (7-day stacked trend & status distribution pie charts)
- **Authentication**: Secure HTTP-only JWT sessions with `jose` and `bcryptjs` password hashing
- **Validation**: Server-side and client-side Zod validation

---

## 3. Roles & Security

### Admin Role (`ADMIN`)
- **Showroom Dashboard**: Live overview with 8 interactive metric cards, 7-day attendance trend, status distribution, and quick leave decision widgets.
- **Daily Attendance Register**: Date picker navigation (previous/next/today), 1-click status chips (Present, Half Day, Leave, Absent), check-in/out times, and remarks.
- **Bulk Attendance Marking**: Multi-select employees with confirmation modal, unsaved changes highlight, and batch database upsert.
- **Monthly Attendance Calendar**: Company-wide monthly attendance grid with employee switcher.
- **Attendance History**: Date range, status, and employee filters with pagination.
- **Leave Request Management**: Review applications, conflict detection with existing attendance, and atomic attendance synchronization upon approval.
- **Employee Directory**: Register new staff, edit profile, and deactivate employees while strictly preserving historical records.
- **Attendance Reports**: Comprehensive analytics by designation and date range, print layout, and RFC 4180 CSV export.
- **Governance & Audit Trail**: Chronological audit logs recording administrative corrections, timestamps, and before/after values.
- **Attendance Rules & Configuration**: Toggle check-in/out time tracking, customize half-day threshold, and set showroom business timezone (Asia/Kolkata).

### Employee Role (`EMPLOYEE`)
- **Personal Dashboard**: Greeting with today's status, monthly summary metrics (Present, Absent, Half Day, Approved Leave, Attendance %), and upcoming approved leaves.
- **Personal Monthly Calendar**: Day-by-day attendance status grid for the employee.
- **Personal Attendance Logs**: Complete historical log with date range and status filters.
- **Apply for Leave**: Form supporting Casual, Sick, Personal, and Other leave types with reason and date range.
- **Leave History & Review**: Check pending review status, manager remarks, and cancel pending applications.
- **Profile & Password**: Secure password update form.
- **Strict Data Privacy**: Server-side role authorization blocks employees from viewing or modifying other employees' private records or administrative routes (HTTP 403 Forbidden).

---

## 4. Default Seed Credentials

The database comes pre-seeded with 8 showroom employees, 100+ attendance records, sample leave requests, audit trails, and showroom settings:

### Admin Login
- **Identifier**: `admin@plynest.com`
- **Password**: `AdminPassword123!`

### Employee Demo Accounts
- **Rajesh Sharma (PP-101)**: `rajesh@plynest.com` or `PP-101` / `Employee123!`
- **Ananya Verma (PP-102)**: `ananya@plynest.com` or `PP-102` / `Employee123!`
- **Karthik Nair (PP-103)**: `karthik@plynest.com` or `PP-103` / `Employee123!`
- **Sneha Patel (PP-104)**: `sneha@plynest.com` or `PP-104` / `Employee123!`
- **Mohammed Farhan (PP-105)**: `farhan@plynest.com` or `PP-105` / `Employee123!`
- **Pooja Sundaram (PP-106)**: `pooja@plynest.com` or `PP-106` / `Employee123!`
- **Amitav Sengupta (PP-107)**: `amitav@plynest.com` or `PP-107` / `Employee123!`
- **Divya Kulkarni (PP-108)**: `divya@plynest.com` or `PP-108` / `Employee123!` *(Deactivated test record)*

---

## 5. Getting Started & Running Locally

### 1. Prerequisites
- Node.js (v18+)
- MongoDB running locally on port 27017 or a MongoDB Atlas URI

### 2. Environment Configuration
Create a `.env` file in the project root:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/plynest_attendance
JWT_SECRET=prinson_plynest_showroom_jwt_secret_secure_key_2026_9876543210
DEFAULT_TIMEZONE=Asia/Kolkata
NEXT_PUBLIC_APP_NAME="Prinson Plynest Attendance"
NEXT_PUBLIC_SHOWROOM_NAME="Prinson Plynest Showroom"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Seed Database
```bash
npm run seed
```

### 5. Run Automated Verification Tests
```bash
npm run test
```

### 6. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Production Build
```bash
npm run build
npm run start
```

---

## 6. Verification Test Suite Results

The automated test runner (`npm run test`) validates all critical business rules:
- ✓ Employee creation and persistence in database
- ✓ Attendance marking and persistence after refresh
- ✓ Attendance corrections and audit log generation
- ✓ Prevention of duplicate attendance entries via compound unique index
- ✓ Clear distinction between Absent and Not Marked
- ✓ Accurate half-day 0.5 day weighting in attendance percentage
- ✓ Leave submission and overlap detection
- ✓ Consistency: Approving leave atomically syncs attendance records to `APPROVED_LEAVE`
- ✓ Consistency: Rejecting leave does not create approved-leave attendance
- ✓ Historical record preservation after employee deactivation
- ✓ Server-side role enforcement (HTTP 403 Forbidden for unauthorized access)
