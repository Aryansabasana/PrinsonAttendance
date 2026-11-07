import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  identifier: string; // employeeCode or email e.g. "admin@plynest.com" or "PP-101"
  passwordHash: string;
  role: "ADMIN" | "EMPLOYEE";
  employee?: mongoose.Types.ObjectId;
  name: string;
  isActive: boolean;
  tokenVersion: number;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema: Schema = new Schema(
  {
    identifier: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "EMPLOYEE"],
      default: "EMPLOYEE",
      required: true,
      index: true,
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: false,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      required: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
