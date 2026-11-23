import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHoliday extends Document {
  dateStr: string; // YYYY-MM-DD format
  name: string; // e.g. "Sunday Off", "Diwali", "Public Holiday"
  declaredBy?: mongoose.Types.ObjectId;
  declaredByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const HolidaySchema: Schema = new Schema(
  {
    dateStr: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: "Holiday",
    },
    declaredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    declaredByName: {
      type: String,
      trim: true,
      default: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: only one holiday record per date in a tenant database
HolidaySchema.index({ dateStr: 1 }, { unique: true });

export const Holiday: Model<IHoliday> =
  mongoose.models.Holiday || mongoose.model<IHoliday>("Holiday", HolidaySchema);
