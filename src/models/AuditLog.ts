import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  action:
    | "ATTENDANCE_CREATED"
    | "ATTENDANCE_CORRECTED"
    | "BULK_ATTENDANCE_MARKED"
    | "LEAVE_APPROVED"
    | "LEAVE_REJECTED"
    | "EMPLOYEE_STATUS_CHANGED"
    | "SETTINGS_UPDATED";
  performedBy: mongoose.Types.ObjectId;
  performerName: string;
  targetEmployee?: mongoose.Types.ObjectId;
  employeeCode?: string;
  employeeName?: string;
  dateStr?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  createdAt: Date;
}

export const AuditLogSchema: Schema = new Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performerName: {
      type: String,
      required: true,
    },
    targetEmployee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      index: true,
    },
    employeeCode: {
      type: String,
    },
    employeeName: {
      type: String,
    },
    dateStr: {
      type: String,
      index: true,
    },
    previousValue: {
      type: Schema.Types.Mixed,
    },
    newValue: {
      type: Schema.Types.Mixed,
    },
    reason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
