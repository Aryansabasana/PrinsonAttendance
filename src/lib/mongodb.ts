import mongoose, { Model } from "mongoose";
import dns from "dns";
import { UserSchema, IUser } from "@/models/User";
import { EmployeeSchema, IEmployee } from "@/models/Employee";
import { AttendanceSchema, IAttendance } from "@/models/Attendance";
import { LeaveRequestSchema, ILeaveRequest } from "@/models/LeaveRequest";
import { SettingSchema, ISetting } from "@/models/Setting";
import { AuditLogSchema, IAuditLog } from "@/models/AuditLog";

// Fix querySrv ECONNREFUSED on Windows / local ISPs for MongoDB Atlas SRV records
export function ensureDnsServers() {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  } catch {
    // Ignore in environments where setting DNS servers is not supported
  }
}
ensureDnsServers();

export type CompanyTenant = "plynest" | "hytek";

export function getDatabaseUri(company: CompanyTenant = "plynest"): string {
  if (company === "hytek" && process.env.HYTEK_MONGODB_URI) {
    return process.env.HYTEK_MONGODB_URI;
  }

  const baseUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/plynest_attendance";
  const targetDb = company === "hytek" ? "hytek_attendance" : "plynest_attendance";

  // MongoDB Atlas cluster URI: mongodb+srv://...mongodb.net/plynest_attendance?retryWrites=true...
  if (baseUri.includes(".mongodb.net/")) {
    return baseUri.replace(/\.mongodb\.net\/([^?]+)/, `.mongodb.net/${targetDb}`);
  }

  // Standard MongoDB URI: mongodb://host:port/plynest_attendance...
  return baseUri.replace(/\/[^/?]+(\?|$)/, `/${targetDb}$1`);
}

interface ConnectionCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

interface MongooseGlobalCache {
  defaultConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
  tenants: Record<CompanyTenant, ConnectionCache>;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseGlobalCache: MongooseGlobalCache | undefined;
}

const globalCache: MongooseGlobalCache = global.__mongooseGlobalCache || {
  defaultConn: { conn: null, promise: null },
  tenants: {
    plynest: { conn: null, promise: null },
    hytek: { conn: null, promise: null },
  },
};

if (!global.__mongooseGlobalCache) {
  global.__mongooseGlobalCache = globalCache;
}

const connectionOptions: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
  bufferCommands: true,
};

/**
 * Connect to default database (for backward compatibility)
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  const cache = globalCache.defaultConn;
  if (cache.conn && mongoose.connection.readyState === 1) {
    return cache.conn;
  }

  if (cache.conn && (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3)) {
    cache.conn = null;
    cache.promise = null;
  }

  if (!cache.promise) {
    ensureDnsServers();
    const uri = getDatabaseUri("plynest");
    cache.promise = mongoose.connect(uri, connectionOptions).then((m) => {
      cache.conn = m;
      return m;
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.conn = null;
    cache.promise = null;
    throw e;
  }

  return cache.conn;
}

/**
 * Connects to a specific tenant's database (plynest_attendance or hytek_attendance).
 * Handles automatic reconnection, connection pooling, and resilient event listener cleanup.
 */
export async function getTenantConnection(company: CompanyTenant = "plynest"): Promise<mongoose.Connection> {
  const cache = globalCache.tenants[company];

  // 1. If connection is already open and ready, return it immediately
  if (cache.conn && cache.conn.readyState === 1) {
    return cache.conn;
  }

  // 2. If existing connection is dead or closing, reset cache to force fresh reconnect
  if (cache.conn && (cache.conn.readyState === 0 || cache.conn.readyState === 3)) {
    cache.conn = null;
    cache.promise = null;
  }

  // 3. If there is no active connection in progress, start connecting
  if (!cache.promise) {
    ensureDnsServers();
    const uri = getDatabaseUri(company);

    const conn = mongoose.createConnection(uri, connectionOptions);

    conn.on("disconnected", () => {
      cache.conn = null;
      cache.promise = null;
    });

    conn.on("close", () => {
      cache.conn = null;
      cache.promise = null;
    });

    conn.on("error", (err) => {
      console.error(`[MongoDB] ${company} connection error:`, err?.message || err);
      cache.conn = null;
      cache.promise = null;
    });

    cache.promise = conn.asPromise().then((readyConn) => {
      cache.conn = readyConn;
      return readyConn;
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.conn = null;
    cache.promise = null;
    throw e;
  }

  return cache.conn;
}

export interface TenantModels {
  User: Model<IUser>;
  Employee: Model<IEmployee>;
  Attendance: Model<IAttendance>;
  LeaveRequest: Model<ILeaveRequest>;
  Setting: Model<ISetting>;
  AuditLog: Model<IAuditLog>;
}

/**
 * Returns models dynamically bound to the tenant's isolated database.
 * This guarantees zero cross-database queries between Plynest and Hytek.
 */
export async function getTenantModels(company: CompanyTenant = "plynest"): Promise<TenantModels> {
  const conn = await getTenantConnection(company);

  return {
    User: conn.models.User || conn.model<IUser>("User", UserSchema),
    Employee: conn.models.Employee || conn.model<IEmployee>("Employee", EmployeeSchema),
    Attendance: conn.models.Attendance || conn.model<IAttendance>("Attendance", AttendanceSchema),
    LeaveRequest: conn.models.LeaveRequest || conn.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema),
    Setting: conn.models.Setting || conn.model<ISetting>("Setting", SettingSchema),
    AuditLog: conn.models.AuditLog || conn.model<IAuditLog>("AuditLog", AuditLogSchema),
  };
}
