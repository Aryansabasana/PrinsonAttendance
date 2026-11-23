import fs from "fs";
import path from "path";

const dump = JSON.parse(fs.readFileSync(path.resolve(__dirname, "oplog_dump.json"), "utf-8"));

for (const op of dump) {
  if (op.op === "d" || op.op === "u") {
    console.log(`[OP ${op.op} on ${op.ns} at ${op.ts}]:`, JSON.stringify(op));
  }
}
