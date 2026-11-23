import fs from "fs";
import path from "path";

const dump = JSON.parse(fs.readFileSync(path.resolve(__dirname, "oplog_dump.json"), "utf-8"));

console.log("=== ALL AUDITLOG INSERTS IN OPLOG ===");
for (const op of dump) {
  if (op.ns?.endsWith(".auditlogs") && op.op === "i") {
    console.log(`[${op.ts}] ${op.ns}:`, JSON.stringify(op.o));
  }
}
