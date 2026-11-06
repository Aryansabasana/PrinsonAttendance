import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendance extends Document {
  employee: mongoose.Types.ObjectId;
  dateStr: string; // YYYY-MM-DD format
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "APPROVED_LEAVE" | "NOT_MARKED";
  checkInTime?: string; // HH:mm format
  checkOutTime?: string; // HH:mm format
  remarks?: string;
  markedBy?: mongoose.Types.ObjectId;
  leaveRequest?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const AttendanceSchema: Schema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    dateStr: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "HALF_DAY", "APPROVED_LEAVE", "NOT_MARKED"],
      default: "NOT_MARKED",
      required: true,
      index: true,
    },
    checkInTime: {
      type: String,
      trim: true,
      default: "",
    },
    checkOutTime: {
      type: String,
      trim: true,
      default: "",
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    leaveRequest: {
      type: Schema.Types.ObjectId,
      ref: "LeaveRequest",
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: prevents duplicate attendance record for same employee on same date
AttendanceSchema.index({ employee: 1, dateStr: 1 }, { unique: true });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>("Attendance", AttendanceSchema);
