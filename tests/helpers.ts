import fs from "fs";
import os from "os";
import path from "path";
import type { Database } from "better-sqlite3";
import { openDatabase } from "../lib/db";
import { seedDatabase } from "../lib/db/seed";

export function tempDb(): { db: Database; close: () => void } {
  const file = path.join(os.tmpdir(), `pahunch-${process.pid}-${Math.random().toString(16).slice(2)}.sqlite`);
  const db = openDatabase(file);
  seedDatabase(db);
  return {
    db,
    close: () => {
      db.close();
      for (const target of [file, `${file}-wal`, `${file}-shm`]) {
        if (fs.existsSync(target)) fs.rmSync(target);
      }
    },
  };
}
