import type { Database } from "better-sqlite3";

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  window_label TEXT NOT NULL,
  accepted INTEGER,
  buyer_refusals INTEGER,
  excluded INTEGER,
  delivered INTEGER,
  wrong_items INTEGER,
  inspected INTEGER,
  packing_defects INTEGER,
  shadow_mode INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  buyer_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  amount INTEGER NOT NULL,
  hub_name TEXT NOT NULL,
  hub_context TEXT NOT NULL,
  phase TEXT NOT NULL,
  revision INTEGER NOT NULL,
  address_line TEXT NOT NULL,
  landmark TEXT NOT NULL,
  locality TEXT NOT NULL,
  pin TEXT NOT NULL,
  address_exception TEXT,
  address_exception_note TEXT,
  parcel_exception TEXT,
  parcel_exception_owner TEXT,
  parcel_exception_note TEXT,
  hub_receipt_at INTEGER,
  promise_date TEXT NOT NULL,
  scheduled_date TEXT,
  requested_date TEXT,
  later_confirmed INTEGER NOT NULL DEFAULT 0,
  later_declined INTEGER NOT NULL DEFAULT 0,
  prompt_at INTEGER,
  cancelled_at INTEGER,
  delivered_at INTEGER,
  delivery_mode TEXT,
  route_added_m INTEGER NOT NULL,
  route_added_min INTEGER NOT NULL,
  demo_code TEXT NOT NULL,
  buyer_profile_id TEXT NOT NULL,
  supplier_profile_id TEXT NOT NULL,
  instruction_stale INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS readiness_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id TEXT NOT NULL,
  choice TEXT NOT NULL,
  requested_date TEXT,
  neighbour_name TEXT,
  neighbour_address TEXT,
  neighbour_landmark TEXT,
  payer_arrangement TEXT,
  revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  active INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS nominations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  address_line TEXT NOT NULL,
  landmark TEXT NOT NULL,
  payer_arrangement TEXT NOT NULL,
  agreed_amount INTEGER NOT NULL,
  agreed_run TEXT NOT NULL,
  buyer_authorised INTEGER NOT NULL,
  consent TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL,
  active INTEGER NOT NULL,
  revision INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  amount INTEGER NOT NULL,
  state TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  kind TEXT NOT NULL,
  state TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  address_line TEXT NOT NULL,
  landmark TEXT NOT NULL,
  run_date TEXT NOT NULL,
  payment_due INTEGER NOT NULL,
  route_added_m INTEGER,
  route_added_min INTEGER,
  owner TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  issued_at INTEGER NOT NULL,
  closed_at INTEGER
);

CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id TEXT NOT NULL UNIQUE,
  task_id INTEGER NOT NULL,
  recipient_name TEXT NOT NULL,
  demo_code TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS exceptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id TEXT NOT NULL,
  task_id INTEGER,
  type TEXT NOT NULL,
  cause_owner TEXT NOT NULL,
  review_status TEXT NOT NULL,
  resolution TEXT,
  detail TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  revision INTEGER NOT NULL,
  detail TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  task_id INTEGER,
  invalidated INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS events_by_shipment ON events (shipment_id, id);
CREATE INDEX IF NOT EXISTS tasks_by_shipment ON tasks (shipment_id, id);
CREATE INDEX IF NOT EXISTS payments_by_shipment ON payments (shipment_id, id);
CREATE INDEX IF NOT EXISTS nominations_by_shipment ON nominations (shipment_id, active);
`;

export function migrate(db: Database): void {
  db.exec(SCHEMA);
}
