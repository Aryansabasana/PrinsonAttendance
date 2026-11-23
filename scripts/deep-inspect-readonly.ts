import dns from "dns";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

// Load .env in memory only
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

// Cutoff time: 2026-11-22 18:55:00 IST = 2026-11-22 13:25:00 UTC
const CUTOFF_TIMESTAMP = new Date("2026-11-22T13:25:00.000Z");

async function deepInspect() {
  console.log("=== STRICT READ-ONLY DATABASE FORENSICS ===");
  console.log("Connecting to MongoDB Atlas cluster...");

  const conn = await mongoose.createConnection(URI, {
    readPreference: "primaryPreferred",
  }).asPromise();

  const admin = conn.db.admin();
  const dbList = await admin.listDatabases();
  console.log(`Discovered ${dbList.databases.length} databases on cluster.\n`);

  const results: any = {
    databases: {},
    hytekInspection: {},
    preCutoffAttendanceRecords: [],
    localFiles: [],
  };

  for (const dbInfo of dbList.databases) {
    const dbName = dbInfo.name;
    if (["admin", "config", "local"].includes(dbName)) continue;

    console.log(`--- Checking Database: ${dbName} (${(dbInfo.sizeOnDisk / 1024).toFixed(1)} KB) ---`);
    const db = conn.useDb(dbName);
    const collections = await db.db.listCollections().toArray();

    results.databases[dbName] = {
      sizeOnDisk: dbInfo.sizeOnDisk,
      collections: {},
    };

    for (const col of collections) {
      const colName = col.name;
      const count = await db.collection(colName).countDocuments();

      // Sample first 5 documents to inspect schema and creation time
      const sample = await db.collection(colName).find({}).limit(5).toArray();
      let hasEmployeeFields = false;
      let hasAttendanceFields = false;
      let hasUserFields = false;

      let oldestDocDate: Date | null = null;
      let newestDocDate: Date | null = null;
      let docsBeforeCutoff = 0;

      // Scan all docs in small collections, or sample in large ones
      const allDocs = count <= 500 ? await db.collection(colName).find({}).toArray() : sample;
      for (const doc of allDocs) {
        let docDate: Date | null = null;
        if (doc._id && typeof doc._id.getTimestamp === "function") {
          docDate = doc._id.getTimestamp();
        } else if (doc.createdAt) {
          docDate = new Date(doc.createdAt);
        }

        if (docDate) {
          if (!oldestDocDate || docDate < oldestDocDate) oldestDocDate = docDate;
          if (!newestDocDate || docDate > newestDocDate) newestDocDate = docDate;
          if (docDate < CUTOFF_TIMESTAMP) {
            docsBeforeCutoff++;
          }
        }

        if (doc.employeeCode || doc.designation || (doc.department && doc.fullName)) {
          hasEmployeeFields = true;
        }
        if (doc.dateStr && (doc.status || doc.checkInTime !== undefined)) {
          hasAttendanceFields = true;
        }
        if (doc.identifier && doc.passwordHash) {
          hasUserFields = true;
        }
      }

      results.databases[dbName].collections[colName] = {
        count,
        hasEmployeeFields,
        hasAttendanceFields,
        hasUserFields,
        docsBeforeCutoff: count <= 500 ? docsBeforeCutoff : "sampled",
        oldestDocDate: oldestDocDate ? oldestDocDate.toISOString() : null,
        newestDocDate: newestDocDate ? newestDocDate.toISOString() : null,
      };

      console.log(`  [${colName}] count: ${count} | empFields: ${hasEmployeeFields} | attFields: ${hasAttendanceFields} | userFields: ${hasUserFields} | oldest: ${oldestDocDate ? oldestDocDate.toISOString() : "none"}`);

      // If this collection has employee or attendance data, log details
      if (hasEmployeeFields || hasAttendanceFields || hasUserFields) {
        console.log(`    -> RELEVANT DATA DETECTED in ${dbName}.${colName}! Scanning docs...`);
        for (const doc of allDocs) {
          const docDate = doc._id?.getTimestamp ? doc._id.getTimestamp().toISOString() : doc.createdAt;
          const summary: any = {
            _id: doc._id?.toString(),
            created: docDate,
          };
          if (doc.employeeCode) summary.employeeCode = doc.employeeCode;
          if (doc.fullName) summary.fullName = doc.fullName;
          if (doc.email) summary.email = doc.email;
          if (doc.identifier) summary.identifier = doc.identifier;
          if (doc.role) summary.role = doc.role;
          if (doc.dateStr) summary.dateStr = doc.dateStr;
          if (doc.status) summary.status = doc.status;

          console.log(`       Doc:`, JSON.stringify(summary));
          if (new Date(docDate) < CUTOFF_TIMESTAMP) {
            results.preCutoffAttendanceRecords.push({
              db: dbName,
              collection: colName,
              doc: summary,
            });
          }
        }
      }
    }
    console.log("");
  }

  // Phase 3: Detailed inspection of hytek_attendance
  console.log("=== DETAILED INSPECTION OF hytek_attendance ===");
  const hytekDb = conn.useDb("hytek_attendance");
  const hytekEmps = await hytekDb.collection("employees").find({}).toArray();
  const hytekUsers = await hytekDb.collection("users").find({}).toArray();
  const hytekAttendances = await hytekDb.collection("attendances").find({}).toArray();
  const hytekSettings = await hytekDb.collection("settings").find({}).toArray();

  console.log(`hytek_attendance employees count: ${hytekEmps.length}`);
  hytekEmps.forEach(e => {
    console.log(`  Employee: code=${e.employeeCode}, name=${e.fullName}, email=${e.email}, phone=${e.phone}, created=${e._id.getTimestamp().toISOString()}`);
  });

  console.log(`hytek_attendance users count: ${hytekUsers.length}`);
  hytekUsers.forEach(u => {
    console.log(`  User: identifier=${u.identifier}, name=${u.name}, role=${u.role}, created=${u._id.getTimestamp().toISOString()}`);
  });

  console.log(`hytek_attendance settings count: ${hytekSettings.length}`);
  hytekSettings.forEach(s => {
    console.log(`  Setting: showroomName=${s.showroomName}, created=${s._id.getTimestamp().toISOString()}`);
  });

  console.log(`hytek_attendance attendances count: ${hytekAttendances.length}`);

  // Phase 4: Local project folder scan for backup / export files
  console.log("\n=== LOCAL PROJECT FOLDER FILE SCAN ===");
  const projectRoot = path.resolve(__dirname, "..");
  const allowedExts = [".csv", ".json", ".bson", ".dump", ".sql", ".bak", ".tar", ".gz", ".zip"];

  function walkDir(dir: string, depth: number = 0) {
    if (depth > 4) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath, depth + 1);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (allowedExts.includes(ext) && !entry.name.startsWith("package") && !entry.name.startsWith("tsconfig")) {
            const stat = fs.statSync(fullPath);
            console.log(`  Found file: ${path.relative(projectRoot, fullPath)} (${stat.size} bytes, modified: ${stat.mtime.toISOString()})`);
            results.localFiles.push({
              path: path.relative(projectRoot, fullPath),
              size: stat.size,
              mtime: stat.mtime.toISOString(),
            });
          }
        }
      }
    } catch (e: any) {
      console.log(`  Could not read ${dir}:`, e.message);
    }
  }

  walkDir(projectRoot);

  await conn.close();

  fs.writeFileSync(
    path.resolve(__dirname, "deep_inspection_report.json"),
    JSON.stringify(results, null, 2)
  );

  console.log("\nForensics complete. Wrote structured results to scripts/deep_inspection_report.json");
}

deepInspect().catch(err => {
  console.error("Forensic error:", err);
  process.exit(1);
});
