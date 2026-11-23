import dns from "dns";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

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

async function checkAtlas() {
  const conn = await mongoose.createConnection(URI).asPromise();
  const admin = conn.db.admin();

  // Check serverStatus and buildInfo
  const buildInfo = await admin.buildInfo();
  console.log("MongoDB Version:", buildInfo.version);

  // Check all collections across all DBs for any backup/dump/old/temp collections
  const dbs = await admin.listDatabases();
  for (const dbInfo of dbs.databases) {
    const db = conn.useDb(dbInfo.name);
    const cols = await db.db.listCollections().toArray();
    for (const c of cols) {
      if (c.name.includes("backup") || c.name.includes("old") || c.name.includes("temp") || c.name.includes("copy") || c.name.includes("archive")) {
        console.log(`FOUND potential backup collection: ${dbInfo.name}.${c.name}`);
      }
    }
  }

  await conn.close();
}

checkAtlas().catch(console.error);
