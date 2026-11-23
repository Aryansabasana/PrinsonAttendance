import fs from "fs";
import readline from "readline";

const rl = readline.createInterface({
  input: fs.createReadStream("C:\\Users\\ARYAN\\.gemini\\antigravity\\brain\\64c4a7f7-2307-44dd-be05-c095c391a768\\.system_generated\\logs\\transcript.jsonl"),
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  try {
    const item = JSON.parse(line);
    if (item.type === "USER_INPUT") {
      console.log(`\n=== STEP ${item.step_index} (${item.created_at}) ===`);
      console.log(item.content);
    }
  } catch {}
});
