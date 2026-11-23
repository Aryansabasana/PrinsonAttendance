import fs from "fs";
import path from "path";

const dump = JSON.parse(fs.readFileSync(path.resolve(__dirname, "oplog_dump.json"), "utf-8"));

console.log("Total entries in dump:", dump.length);

const deletedEmployees: any[] = [];
const deletedUsers: any[] = [];
const insertedEmployees: any[] = [];
const insertedUsers: any[] = [];
const updatedUsers: any[] = [];

for (const op of dump) {
  if (op.ns?.endsWith(".employees")) {
    if (op.op === "i") insertedEmployees.push(op);
    if (op.op === "d") deletedEmployees.push(op);
  }
  if (op.ns?.endsWith(".users")) {
    if (op.op === "i") insertedUsers.push(op);
    if (op.op === "d") deletedUsers.push(op);
    if (op.op === "u") updatedUsers.push(op);
  }
}

console.log("\n--- Unique Inserted Employees ---");
const empMap = new Map();
for (const op of insertedEmployees) {
  if (op.o?.employeeCode) {
    empMap.set(op.o.employeeCode, { ns: op.ns, ts: op.ts, ...op.o });
  }
}
for (const [code, emp] of empMap) {
  console.log(`Code: ${code}, Name: ${emp.fullName}, Email: ${emp.email}, Phone: ${emp.phone}, NS: ${emp.ns}, Created: ${emp.ts}`);
}

console.log("\n--- Unique Inserted Users ---");
const userMap = new Map();
for (const op of insertedUsers) {
  if (op.o?.identifier) {
    userMap.set(op.o.identifier, { ns: op.ns, ts: op.ts, ...op.o });
  }
}
for (const [id, u] of userMap) {
  console.log(`Identifier: ${id}, Name: ${u.name}, Role: ${u.role}, NS: ${u.ns}, Created: ${u.ts}`);
}

console.log("\n--- Deletes on employees/users ---");
console.log(`Deleted employees ops count: ${deletedEmployees.length}`);
console.log(`Deleted users ops count: ${deletedUsers.length}`);
