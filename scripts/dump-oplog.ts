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

async function dumpOplog() {
  console.log("Connecting to Atlas...");
  const conn = await mongoose.createConnection(URI).asPromise();
  const localDb = conn.useDb("local");

  const ops = await localDb.collection("oplog.rs").find({}).sort({ $natural: -1 }).toArray();
  console.log(`Retrieved ${ops.length} oplog entries.`);

  const relevantOps = ops.filter(op => {
    return (
      (op.ns && (op.ns.startsWith("plynest_attendance") || op.ns.startsWith("hytek_attendance"))) ||
      op.op === "i" || op.op === "d" || op.op === "u"
    );
  });

  console.log(`Relevant operations count: ${relevantOps.length}`);

  const formatted = ops.map(op => ({
    ts: op.ts ? new Date(op.ts.getHighBits() * 1000).toISOString() : null,
    op: op.op,
    ns: op.ns,
    o: op.o,
    o2: op.o2,
  }));

  fs.writeFileSync(path.resolve(__dirname, "oplog_dump.json"), JSON.stringify(formatted, null, 2));
  console.log("Wrote full oplog to scripts/oplog_dump.json");

  // Also print all unique employee and user objects found in oplog inserts
  console.log("\n=== ALL INSERTS IN OPLOG ===");
  for (const op of ops) {
    if (op.op === "i") {
      console.log(`[INSERT on ${op.ns} at ${op.ts ? new Date(op.ts.getHighBits() * 1000).toISOString() : ''}]:`, JSON.stringify(op.o).slice(0, 200));
    }
  }

  await conn.close();
}

dumpOplog().catch(console.error);
