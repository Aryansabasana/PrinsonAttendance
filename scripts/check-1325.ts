import fs from "fs";
import path from "path";

const dump = JSON.parse(fs.readFileSync(path.resolve(__dirname, "oplog_dump.json"), "utf-8"));
const filtered = dump.filter(op => op.ts && op.ts >= "2026-11-22T13:25:00.000Z" && op.ts <= "2026-11-22T13:25:20.000Z");

console.log(`Found ${filtered.length} operations around 13:25:`);
for (const op of filtered) {
  console.log(`[${op.ts}] ${op.op} on ${op.ns}:`, JSON.stringify(op.o));
}
