import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { migrate } from "./schema";
import { seedDatabase } from "./seed";

/**
 * Where the SQLite file lives when PAHUNCH_DB is not set.
 * Serverless hosts (Vercel, Netlify, Lambda) mount the project read-only and only
 * allow writes under /tmp, so fall back there instead of crashing with EROFS.
 * State on those hosts resets on cold start; a host with a disk keeps it.
 */
export function defaultDbPath(): string {
  const local = path.join(process.cwd(), "data", "pahunch.sqlite");
  if (process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "pahunch.sqlite");
  }
  try {
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.accessSync(path.dirname(local), fs.constants.W_OK);
    return local;
  } catch {
    return path.join("/tmp", "pahunch.sqlite");
  }
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
