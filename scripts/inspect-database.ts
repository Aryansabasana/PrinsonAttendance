import dns from "dns";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

// Load .env
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq !== -1) {
        process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

const URI = process.env.MONGODB_URI || "";

async function inspect() {
  console.log("Connecting to Atlas...");
  const conn = await mongoose.createConnection(URI).asPromise();
  console.log("Connected.");

  const admin = conn.db.admin();
  const dbs = await admin.listDatabases();
  console.log("Databases on cluster:", dbs.databases.map((d: any) => `${d.name} (${d.sizeOnDisk} bytes)`));

  for (const dbInfo of dbs.databases) {
    if (["admin", "config"].includes(dbInfo.name)) continue;
    console.log(`\n--- Inspecting database: ${dbInfo.name} ---`);
    const db = conn.useDb(dbInfo.name);
    const collections = await db.db.listCollections().toArray();
    console.log("Collections:", collections.map((c) => c.name));

    for (const c of collections) {
      const count = await db.collection(c.name).countDocuments();
      console.log(`  Collection ${c.name}: ${count} documents`);
      if (["users", "employees", "auditlogs"].includes(c.name)) {
        const docs = await db.collection(c.name).find({}).limit(10).toArray();
        console.log(`  Sample ${c.name} documents:`);
        docs.forEach((doc) => {
          if (c.name === "users") {
            console.log(`    User: id=${doc._id}, identifier=${doc.identifier}, name=${doc.name}, role=${doc.role}`);
          } else if (c.name === "employees") {
            console.log(`    Employee: id=${doc._id}, code=${doc.employeeCode}, name=${doc.fullName}, email=${doc.email}`);
          } else if (c.name === "auditlogs") {
            console.log(`    AuditLog: action=${doc.action}, performedBy=${doc.performerName}, employee=${doc.employeeName}, target=${doc.employeeCode}, date=${doc.dateStr}`);
          }
        });
      }
    }
  }

  // Check oplog if accessible
  console.log("\n--- Checking Replica Set Oplog ---");
  try {
    const localDb = conn.useDb("local");
    const oplogCount = await localDb.collection("oplog.rs").estimatedDocumentCount();
    console.log(`local.oplog.rs has ~${oplogCount} operations`);

    // Look for inserts or deletes on plynest_attendance or hytek_attendance in oplog
    const ops = await localDb
      .collection("oplog.rs")
      .find({
        ns: { $regex: /_attendance\.(employees|users)/ },
      })
      .sort({ $natural: -1 })
      .limit(50)
      .toArray();

    console.log(`Found ${ops.length} recent operations on employees/users:`);
    for (const op of ops) {
      console.log(`  Op ${op.op} on ${op.ns} at ${new Date(op.ts.getHighBits() * 1000).toISOString()}:`, JSON.stringify(op.o || op.o2).slice(0, 150));
    }
  } catch (err: any) {
    console.log("Could not read oplog:", err.message);
  }

  await conn.close();
  console.log("\nInspection complete.");
}

inspect().catch(console.error);
