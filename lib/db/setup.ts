import fs from "fs";
import path from "path";
import { defaultDbPath, getDb, resetSingleton } from "./index";
import { seedDatabase } from "./seed";

const file = process.env.PAHUNCH_DB ?? defaultDbPath();
const reset = process.argv.includes("--reset");

if (reset) {
  resetSingleton();
  for (const target of [file, `${file}-wal`, `${file}-shm`]) {
    if (fs.existsSync(target)) fs.rmSync(target);
  }
}

fs.mkdirSync(path.dirname(file), { recursive: true });
const db = getDb();
if (reset) seedDatabase(db);

const count = db.prepare("SELECT COUNT(*) AS n FROM shipments").get() as { n: number };
console.log(`Pahunch demo database ready at ${file} (${count.n} orders).`);
