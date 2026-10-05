import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { migrate } from "./schema";
import { seedDatabase } from "./seed";

export function defaultDbPath(): string {
  return path.join(process.cwd(), "data", "pahunch.sqlite");
}

let singleton: Database.Database | null = null;

export function openDatabase(file: string): Database.Database {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  return db;
}

export function getDb(): Database.Database {
  if (!singleton) {
    const file = process.env.PAHUNCH_DB ?? defaultDbPath();
    singleton = openDatabase(file);
    const count = singleton.prepare("SELECT COUNT(*) AS n FROM shipments").get() as { n: number };
    if (count.n === 0) seedDatabase(singleton);
  }
  return singleton;
}

export function resetSingleton(): void {
  singleton?.close();
  singleton = null;
}
