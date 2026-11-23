import fs from "fs";
import path from "path";

const dump = JSON.parse(fs.readFileSync(path.resolve(__dirname, "oplog_dump.json"), "utf-8"));
console.log("Oldest op in oplog:", dump[dump.length - 1]);
console.log("Newest op in oplog:", dump[0]);
