import fs from "fs";
import path from "path";

const dump = JSON.parse(fs.readFileSync(path.resolve(__dirname, "oplog_dump.json"), "utf-8"));

console.log("=== ALL OPS ON plynest_attendance.users AND plynest_attendance.employees ===");
for (const op of dump) {
  if (op.ns === "plynest_attendance.users" || op.ns === "plynest_attendance.employees") {
    console.log(`[${op.ts}] ${op.op} on ${op.ns}:`, JSON.stringify(op.o || op.o2).slice(0, 150));
  }
}
