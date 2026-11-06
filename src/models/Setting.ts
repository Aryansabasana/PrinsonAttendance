import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISetting extends Document {
  key: string;
  showroomName: string;
  showroomAddress: string;
  timezone: string;
  enableCheckInOut: boolean;
  halfDayThresholdHours: number;
  standardWorkHoursStart: string;
  standardWorkHoursEnd: string;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

export const SettingSchema: Schema = new Schema(
  {
    key: {
      type: String,
      default: "default_config",
      unique: true,
      index: true,
    },
    showroomName: {
      type: String,
      default: "Prinson Plynest Showroom",
    },
    showroomAddress: {
      type: String,
      default: "Prinson Plynest Showroom, Architectural Panels & Veneer Arcade, Bangalore",
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    enableCheckInOut: {
      type: Boolean,
      default: true,
    },
    halfDayThresholdHours: {
      type: Number,
      default: 4.5,
    },
    standardWorkHoursStart: {
      type: String,
      default: "09:30",
    },
    standardWorkHoursEnd: {
      type: String,
      default: "18:30",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const Setting: Model<ISetting> =
  mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);
