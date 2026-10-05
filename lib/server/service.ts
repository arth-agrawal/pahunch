import type { Database } from "better-sqlite3";
import type { ActionResult, DemoState, OrderDetail, OrderSummary } from "../domain/dto";
import { DomainError } from "../domain/errors";
import { formatINR } from "../domain/format";
import {
  HUB_CONTEXT_LABEL,
  buildLifecycle,
  buyerInsight,
  checksPass,
  codCollected,
  codDue,
  computeMetrics,
  exceptionLabel,
  neighbourChecks,
  normalBlockReason,
  payerLabel,
  queueKey,
  readinessLabel,
  receiverLabel,
  recommend,
  riderPreview,
  supplierInsight,
  taskLabel,
} from "../domain/order-state";
import { advanceMs, dateKey, endOfRunMs, formatDay, formatStamp, plannedRunDates } from "../domain/time";
import type {
  AuditEvent,
  ConsentState,
  ExceptionRow,
  Nomination,
  Payment,
  PayerArrangement,
  Phase,
  Profile,
  Readiness,
  ReadinessChoice,
  Receipt,
  Shipment,
  Task,
} from "../domain/types";
import { NEIGHBOUR_FIXTURE, reseedShipment, seedDatabase } from "../db/seed";

type Action = Record<string, unknown>;

function asRecord(value: unknown): Action {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DomainError("The request body must be an object.");
  }
  return value as Action;
}

function requiredString(body: Action, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DomainError(`${key} is required.`);
  }
  return value.trim();
}

function requiredNumber(body: Action, key: string): number {
  const value = body[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DomainError(`${key} must be a number.`);
  }
  return value;
}

function requiredBoolean(body: Action, key: string): boolean {
  const value = body[key];
  if (typeof value !== "boolean") throw new DomainError(`${key} must be true or false.`);
  return value;
}

function setting(db: Database, key: string): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  if (!row) throw new DomainError(`Missing setting ${key}.`);
  return row.value;
}

function demoNow(db: Database): number {
  return Number(setting(db, "demo_now"));
}

function capsOf(db: Database): { meters: number; minutes: number } {
  return {
    meters: Number(setting(db, "cap_meters")),
    minutes: Number(setting(db, "cap_minutes")),
  };
}

function riderOffline(db: Database): boolean {
  return setting(db, "rider_offline") === "1";
}

function mapShipment(row: Record<string, unknown>): Shipment {
  return {
    id: String(row.id),
    buyerName: String(row.buyer_name),
    itemName: String(row.item_name),
    sku: String(row.sku),
    amount: Number(row.amount),
    hubName: String(row.hub_name),
    hubContext: row.hub_context as Shipment["hubContext"],
    phase: row.phase as Phase,
    revision: Number(row.revision),
    addressLine: String(row.address_line),
    landmark: String(row.landmark),
    locality: String(row.locality),
    pin: String(row.pin),
    addressException: (row.address_exception as Shipment["addressException"]) ?? null,
    addressExceptionNote: (row.address_exception_note as string | null) ?? null,
    parcelException: (row.parcel_exception as Shipment["parcelException"]) ?? null,
    parcelExceptionOwner: (row.parcel_exception_owner as Shipment["parcelExceptionOwner"]) ?? null,
    parcelExceptionNote: (row.parcel_exception_note as string | null) ?? null,
    hubReceiptAt: row.hub_receipt_at == null ? null : Number(row.hub_receipt_at),
    promiseDate: String(row.promise_date),
    scheduledDate: (row.scheduled_date as string | null) ?? null,
    requestedDate: (row.requested_date as string | null) ?? null,
    laterConfirmed: Number(row.later_confirmed) === 1,
    laterDeclined: Number(row.later_declined) === 1,
    promptAt: row.prompt_at == null ? null : Number(row.prompt_at),
    cancelledAt: row.cancelled_at == null ? null : Number(row.cancelled_at),
    deliveredAt: row.delivered_at == null ? null : Number(row.delivered_at),
    deliveryMode: (row.delivery_mode as Shipment["deliveryMode"]) ?? null,
    routeAddedM: Number(row.route_added_m),
    routeAddedMin: Number(row.route_added_min),
    demoCode: String(row.demo_code),
    buyerProfileId: String(row.buyer_profile_id),
    supplierProfileId: String(row.supplier_profile_id),
    instructionStale: Number(row.instruction_stale) === 1,
  };
}

function mapReadiness(row: Record<string, unknown>): Readiness {
  return {
    id: Number(row.id),
    shipmentId: String(row.shipment_id),
    choice: row.choice as ReadinessChoice,
    requestedDate: (row.requested_date as string | null) ?? null,
    neighbourName: (row.neighbour_name as string | null) ?? null,
    neighbourAddress: (row.neighbour_address as string | null) ?? null,
    neighbourLandmark: (row.neighbour_landmark as string | null) ?? null,
    payerArrangement: (row.payer_arrangement as PayerArrangement | null) ?? null,
    revision: Number(row.revision),
    createdAt: Number(row.created_at),
    active: Number(row.active) === 1,
  };
}

function mapNomination(row: Record<string, unknown>): Nomination {
  return {
    id: Number(row.id),
    shipmentId: String(row.shipment_id),
    recipientName: String(row.recipient_name),
    addressLine: String(row.address_line),
    landmark: String(row.landmark),
    payerArrangement: row.payer_arrangement as PayerArrangement,
    agreedAmount: Number(row.agreed_amount),
    agreedRun: String(row.agreed_run),
    buyerAuthorised: Number(row.buyer_authorised) === 1,
    consent: row.consent as ConsentState,
    expiresAt: Number(row.expires_at),
    revokedAt: row.revoked_at == null ? null : Number(row.revoked_at),
    createdAt: Number(row.created_at),
    active: Number(row.active) === 1,
    revision: Number(row.revision),
  };
}

function mapPayment(row: Record<string, unknown>): Payment {
  return {
    id: Number(row.id),
    shipmentId: String(row.shipment_id),
    channel: row.channel as Payment["channel"],
    amount: Number(row.amount),
    state: row.state as Payment["state"],
    idempotencyKey: String(row.idempotency_key),
    createdAt: Number(row.created_at),
    note: (row.note as string | null) ?? null,
  };
}

function mapTask(row: Record<string, unknown>): Task {
  return {
    id: Number(row.id),
    shipmentId: String(row.shipment_id),
    revision: Number(row.revision),
    kind: row.kind as Task["kind"],
    state: row.state as Task["state"],
    recipientName: String(row.recipient_name),
    recipientRole: row.recipient_role as Task["recipientRole"],
    addressLine: String(row.address_line),
    landmark: String(row.landmark),
    runDate: String(row.run_date),
    paymentDue: Number(row.payment_due),
    routeAddedM: row.route_added_m == null ? null : Number(row.route_added_m),
    routeAddedMin: row.route_added_min == null ? null : Number(row.route_added_min),
    owner: String(row.owner),
    acknowledged: Number(row.acknowledged) === 1,
    issuedAt: Number(row.issued_at),
    closedAt: row.closed_at == null ? null : Number(row.closed_at),
  };
}

function mapReceipt(row: Record<string, unknown>): Receipt {
  return {
    id: Number(row.id),
    shipmentId: String(row.shipment_id),
    taskId: Number(row.task_id),
    recipientName: String(row.recipient_name),
    demoCode: String(row.demo_code),
    createdAt: Number(row.created_at),
  };
}

function mapException(row: Record<string, unknown>): ExceptionRow {
  return {
    id: Number(row.id),
    shipmentId: String(row.shipment_id),
    taskId: row.task_id == null ? null : Number(row.task_id),
    type: String(row.type),
    causeOwner: String(row.cause_owner),
    reviewStatus: row.review_status as ExceptionRow["reviewStatus"],
    resolution: (row.resolution as string | null) ?? null,
    detail: String(row.detail),
    createdAt: Number(row.created_at),
  };
}

function mapEvent(row: Record<string, unknown>): AuditEvent {
  return {
    id: Number(row.id),
    shipmentId: String(row.shipment_id),
    actor: String(row.actor),
    action: String(row.action),
    revision: Number(row.revision),
    detail: String(row.detail),
    createdAt: Number(row.created_at),
    taskId: row.task_id == null ? null : Number(row.task_id),
    invalidated: Number(row.invalidated) === 1,
  };
}

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    kind: row.kind as Profile["kind"],
    name: String(row.name),
    windowLabel: String(row.window_label),
    accepted: row.accepted == null ? null : Number(row.accepted),
    buyerRefusals: row.buyer_refusals == null ? null : Number(row.buyer_refusals),
    excluded: row.excluded == null ? null : Number(row.excluded),
    delivered: row.delivered == null ? null : Number(row.delivered),
    wrongItems: row.wrong_items == null ? null : Number(row.wrong_items),
    inspected: row.inspected == null ? null : Number(row.inspected),
    packingDefects: row.packing_defects == null ? null : Number(row.packing_defects),
    shadowMode: Number(row.shadow_mode) === 1,
  };
}

function rows<T>(db: Database, sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

function mustShipment(db: Database, id: string): Shipment {
  const row = db.prepare("SELECT * FROM shipments WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) throw new DomainError(`Order ${id} was not found.`, 404, "not_found");
  return mapShipment(row);
}

function activeReadiness(db: Database, shipmentId: string): Readiness | null {
  const row = db
    .prepare("SELECT * FROM readiness_responses WHERE shipment_id = ? AND active = 1 ORDER BY id DESC LIMIT 1")
    .get(shipmentId) as Record<string, unknown> | undefined;
  return row ? mapReadiness(row) : null;
}

function activeNomination(db: Database, shipmentId: string): Nomination | null {
  const row = db
    .prepare("SELECT * FROM nominations WHERE shipment_id = ? AND active = 1 ORDER BY id DESC LIMIT 1")
    .get(shipmentId) as Record<string, unknown> | undefined;
  return row ? mapNomination(row) : null;
}

function paymentsFor(db: Database, shipmentId: string): Payment[] {
  return rows<Record<string, unknown>>(
    db,
    "SELECT * FROM payments WHERE shipment_id = ? ORDER BY id",
    shipmentId,
  ).map(mapPayment);
}

function tasksFor(db: Database, shipmentId: string): Task[] {
  return rows<Record<string, unknown>>(db, "SELECT * FROM tasks WHERE shipment_id = ? ORDER BY id", shipmentId).map(mapTask);
}

function currentTask(tasks: Task[]): Task | null {
  return tasks.find((task) => task.state === "current") ?? null;
}

function latestTask(tasks: Task[]): Task | null {
  return tasks.length ? tasks[tasks.length - 1] : null;
}

function addEvent(
  db: Database,
  input: {
    shipmentId: string;
    actor: string;
    action: string;
    revision: number;
    detail: string;
    createdAt: number;
    taskId?: number | null;
  },
): void {
  db.prepare(`
    INSERT INTO events (shipment_id, actor, action, revision, detail, created_at, task_id, invalidated)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    input.shipmentId,
    input.actor,
    input.action,
    input.revision,
    input.detail,
    input.createdAt,
    input.taskId ?? null,
  );
}

function addException(
  db: Database,
  input: {
    shipmentId: string;
    taskId?: number | null;
    type: string;
    causeOwner: string;
    detail: string;
    createdAt: number;
    reviewStatus?: "open" | "resolved";
    resolution?: string | null;
  },
): void {
  db.prepare(`
    INSERT INTO exceptions (shipment_id, task_id, type, cause_owner, review_status, resolution, detail, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.shipmentId,
    input.taskId ?? null,
    input.type,
    input.causeOwner,
    input.reviewStatus ?? "open",
    input.resolution ?? null,
    input.detail,
    input.createdAt,
  );
}

function bump(db: Database, shipmentId: string): number {
  db.prepare("UPDATE shipments SET revision = revision + 1 WHERE id = ?").run(shipmentId);
  return mustShipment(db, shipmentId).revision;
}

function supersedeCurrent(db: Database, shipmentId: string, at: number, revision: number): boolean {
  const current = rows<Record<string, unknown>>(
    db,
    "SELECT * FROM tasks WHERE shipment_id = ? AND state = 'current'",
    shipmentId,
  ).map(mapTask);
  if (current.length === 0) return false;
  db.prepare("UPDATE tasks SET state = 'superseded', closed_at = ? WHERE shipment_id = ? AND state = 'current'").run(
    at,
    shipmentId,
  );
  for (const task of current) {
    db.prepare("UPDATE events SET invalidated = 1 WHERE task_id = ?").run(task.id);
    addEvent(db, {
      shipmentId,
      actor: "system",
      action: "task_superseded",
      revision,
      detail: `Rider instruction v${task.revision} for ${task.recipientName} is invalidated and cannot authorise handover.`,
      createdAt: at,
      taskId: task.id,
    });
  }
  const shipment = mustShipment(db, shipmentId);
  if (shipment.phase === "dispatched") {
    db.prepare("UPDATE shipments SET phase = 'at_hub' WHERE id = ?").run(shipmentId);
  }
  return true;
}

function deactivateReadiness(db: Database, shipmentId: string): void {
  db.prepare("UPDATE readiness_responses SET active = 0 WHERE shipment_id = ? AND active = 1").run(shipmentId);
}

function retireNomination(db: Database, shipmentId: string, at: number): void {
  db.prepare(`
    UPDATE nominations
    SET active = 0,
        consent = CASE WHEN consent IN ('declined', 'expired', 'revoked') THEN consent ELSE 'revoked' END,
        revoked_at = COALESCE(revoked_at, ?)
    WHERE shipment_id = ? AND active = 1
  `).run(at, shipmentId);
}

function assertMutable(shipment: Shipment): void {
  if (shipment.phase === "delivered") {
    throw new DomainError("This order is already delivered. A later change cannot undo the physical handover.");
  }
  if (shipment.phase === "cancelled") {
    throw new DomainError("This order is cancelled. Outstanding instructions stay invalid.");
  }
  if (shipment.hubReceiptAt == null || shipment.phase === "in_transit") {
    throw new DomainError("Readiness opens when the parcel reaches the local hub. It is not there yet.");
  }
}

function insertReadiness(
  db: Database,
  input: {
    shipmentId: string;
    choice: ReadinessChoice;
    requestedDate?: string | null;
    neighbourName?: string | null;
    neighbourAddress?: string | null;
    neighbourLandmark?: string | null;
    payerArrangement?: PayerArrangement | null;
    revision: number;
    createdAt: number;
  },
): void {
  db.prepare(`
    INSERT INTO readiness_responses (
      shipment_id, choice, requested_date, neighbour_name, neighbour_address, neighbour_landmark,
      payer_arrangement, revision, created_at, active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    input.shipmentId,
    input.choice,
    input.requestedDate ?? null,
    input.neighbourName ?? null,
    input.neighbourAddress ?? null,
    input.neighbourLandmark ?? null,
    input.payerArrangement ?? null,
    input.revision,
    input.createdAt,
  );
}

function syncExpiry(db: Database): void {
  const now = demoNow(db);
  const due = rows<Record<string, unknown>>(
    db,
    `SELECT * FROM nominations
     WHERE active = 1
       AND consent IN ('pending', 'accepted_receive', 'accepted_receive_and_pay')
       AND expires_at <= ?`,
    now,
  ).map(mapNomination);
  for (const nomination of due) {
    db.prepare("UPDATE nominations SET consent = 'expired' WHERE id = ?").run(nomination.id);
    const shipment = mustShipment(db, nomination.shipmentId);
    supersedeCurrent(db, nomination.shipmentId, now, shipment.revision);
    addEvent(db, {
      shipmentId: nomination.shipmentId,
      actor: "system",
      action: "consent_expired",
      revision: shipment.revision,
      detail: `${nomination.recipientName}'s agreement expired at the run cutoff. Alternate handover is blocked.`,
      createdAt: now,
    });
  }
}

function issueTask(
  db: Database,
  shipment: Shipment,
  spec: {
    kind: "normal" | "neighbour";
    recipientName: string;
    recipientRole: "buyer" | "neighbour";
    addressLine: string;
    landmark: string;
    runDate: string;
    paymentDue: number;
    routeAddedM: number | null;
    routeAddedMin: number | null;
  },
): Task {
  const at = demoNow(db);
  supersedeCurrent(db, shipment.id, at, shipment.revision);
  const info = db
    .prepare(`
      INSERT INTO tasks (
        shipment_id, revision, kind, state, recipient_name, recipient_role, address_line, landmark,
        run_date, payment_due, route_added_m, route_added_min, owner, acknowledged, issued_at, closed_at
      ) VALUES (?, ?, ?, 'current', ?, ?, ?, ?, ?, ?, ?, ?, 'hub', 0, ?, NULL)
    `)
    .run(
      shipment.id,
      shipment.revision,
      spec.kind,
      spec.recipientName,
      spec.recipientRole,
      spec.addressLine,
      spec.landmark,
      spec.runDate,
      spec.paymentDue,
      spec.routeAddedM,
      spec.routeAddedMin,
      at,
    );
  const taskId = Number(info.lastInsertRowid);
  db.prepare("UPDATE shipments SET phase = 'dispatched', instruction_stale = 0 WHERE id = ?").run(shipment.id);
  addEvent(db, {
    shipmentId: shipment.id,
    actor: "hub",
    action: "task_issued",
    revision: shipment.revision,
    detail: `Current task v${shipment.revision}: ${spec.recipientName}, COD due ${formatINR(spec.paymentDue)}.`,
    createdAt: at,
    taskId,
  });
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Record<string, unknown>;
  return mapTask(row);
}

function requireOnline(db: Database, kind: Task["kind"]): void {
  if (!riderOffline(db)) return;
  if (kind === "neighbour") {
    throw new DomainError(
      "The rider link is offline. A neighbour handover cannot be authorised from uncertain payment or consent. Reconnect and refresh the current instruction.",
      409,
      "offline",
    );
  }
  throw new DomainError(
    "The rider link is offline, so this handover cannot be authorised. Reconnect and refresh the current instruction.",
    409,
    "offline",
  );
}

function requireCurrentTask(db: Database, shipmentId: string, taskId: number, revision: number): { shipment: Shipment; task: Task } {
  const shipment = mustShipment(db, shipmentId);
  const row = db.prepare("SELECT * FROM tasks WHERE id = ? AND shipment_id = ?").get(taskId, shipmentId) as
    | Record<string, unknown>
    | undefined;
  if (!row) throw new DomainError("That rider task does not belong to this order.", 404, "not_found");
  const task = mapTask(row);
  if (task.state !== "current") {
    throw new DomainError(
      "This rider instruction is no longer valid. Retain parcel custody and wait for a current hub task.",
      409,
      "stale_task",
    );
  }
  if (task.revision !== revision || task.revision !== shipment.revision) {
    throw new DomainError("This task version is stale. Refresh the current instruction before handover.", 409, "stale_revision");
  }
  return { shipment, task };
}

export function submitReadiness(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    syncExpiry(db);
    const shipmentId = requiredString(body, "shipmentId");
    const choice = requiredString(body, "choice") as ReadinessChoice;
    const shipment = mustShipment(db, shipmentId);
    assertMutable(shipment);
    const at = demoNow(db);
    const hadTask = tasksFor(db, shipmentId).some((task) => task.state === "current");

    if (choice === "cancel") {
      const revision = bump(db, shipmentId);
      deactivateReadiness(db, shipmentId);
      insertReadiness(db, { shipmentId, choice, revision, createdAt: at });
      retireNomination(db, shipmentId, at);
      supersedeCurrent(db, shipmentId, at, revision);
      const payments = paymentsFor(db, shipmentId);
      const collected = payments.length > 0 && !db.prepare("SELECT id FROM receipts WHERE shipment_id = ?").get(shipmentId);
      db.prepare(`
        UPDATE shipments
        SET phase = 'cancelled', cancelled_at = ?, instruction_stale = 0, later_confirmed = 0
        WHERE id = ?
      `).run(at, shipmentId);
      if (collected) {
        addException(db, {
          shipmentId,
          type: "cancellation_reconciliation",
          causeOwner: "unresolved",
          detail: "Cancellation after collection and before receipt. Payment is retained for reconciliation. No automatic refund was made.",
          createdAt: at,
        });
      }
      addEvent(db, {
        shipmentId,
        actor: "customer",
        action: "cancelled",
        revision,
        detail: collected
          ? "Buyer cancelled. Tasks and alternate consent are invalid. The payment record stays open for reconciliation."
          : "Buyer cancelled. Tasks and alternate consent are invalid. Parcel custody stays with the hub or rider.",
        createdAt: at,
      });
      return { ok: true as const, message: "Order cancelled. Earlier rider instructions can no longer authorise handover.", shipmentId };
    }

    if (choice === "receive_today") {
      const revision = bump(db, shipmentId);
      deactivateReadiness(db, shipmentId);
      retireNomination(db, shipmentId, at);
      const removed = supersedeCurrent(db, shipmentId, at, revision);
      insertReadiness(db, { shipmentId, choice, revision, createdAt: at });
      db.prepare(`
        UPDATE shipments
        SET phase = 'at_hub', requested_date = NULL, scheduled_date = NULL,
            later_confirmed = 0, later_declined = 0, instruction_stale = ?
        WHERE id = ?
      `).run(removed || hadTask ? 1 : 0, shipmentId);
      addEvent(db, {
        shipmentId,
        actor: "customer",
        action: "readiness_submitted",
        revision,
        detail: "Buyer confirmed availability for the planned run. No exact time slot is promised.",
        createdAt: at,
      });
      return { ok: true as const, message: "Availability recorded. The hub can keep the planned route.", shipmentId };
    }

    if (choice === "later_day") {
      const requestedDate = requiredString(body, "requestedDate");
      const today = dateKey(at);
      if (!plannedRunDates(today).includes(requestedDate)) {
        throw new DomainError("Choose one of the illustrative planned runs.");
      }
      const revision = bump(db, shipmentId);
      deactivateReadiness(db, shipmentId);
      retireNomination(db, shipmentId, at);
      supersedeCurrent(db, shipmentId, at, revision);
      insertReadiness(db, { shipmentId, choice, requestedDate, revision, createdAt: at });
      db.prepare(`
        UPDATE shipments
        SET phase = 'at_hub', requested_date = ?, scheduled_date = NULL,
            later_confirmed = 0, later_declined = 0, instruction_stale = 0
        WHERE id = ?
      `).run(requestedDate, shipmentId);
      addEvent(db, {
        shipmentId,
        actor: "customer",
        action: "readiness_submitted",
        revision,
        detail: `Buyer requested ${formatDay(requestedDate, today)}. Awaiting hub confirmation. This is not a delivery.`,
        createdAt: at,
      });
      return { ok: true as const, message: "Request sent — awaiting hub confirmation.", shipmentId };
    }

    if (choice === "nominate") {
      const neighbourName = requiredString(body, "neighbourName");
      const neighbourAddress = requiredString(body, "neighbourAddress");
      const neighbourLandmark = requiredString(body, "neighbourLandmark");
      const payer = requiredString(body, "payer") as PayerArrangement;
      if (payer !== "neighbour_cod" && payer !== "buyer_prepay") {
        throw new DomainError("Choose platform payment or neighbour COD.");
      }
      const today = dateKey(at);
      const revision = bump(db, shipmentId);
      deactivateReadiness(db, shipmentId);
      retireNomination(db, shipmentId, at);
      supersedeCurrent(db, shipmentId, at, revision);
      insertReadiness(db, {
        shipmentId,
        choice,
        neighbourName,
        neighbourAddress,
        neighbourLandmark,
        payerArrangement: payer,
        revision,
        createdAt: at,
      });
      db.prepare(`
        INSERT INTO nominations (
          shipment_id, recipient_name, address_line, landmark, payer_arrangement, agreed_amount,
          agreed_run, buyer_authorised, consent, expires_at, revoked_at, created_at, active, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'pending', ?, NULL, ?, 1, ?)
      `).run(
        shipmentId,
        neighbourName,
        neighbourAddress,
        neighbourLandmark,
        payer,
        shipment.amount,
        today,
        endOfRunMs(today),
        at,
        revision,
      );
      db.prepare(`
        UPDATE shipments
        SET phase = 'at_hub', requested_date = NULL, scheduled_date = NULL,
            later_confirmed = 0, later_declined = 0, instruction_stale = 0
        WHERE id = ?
      `).run(shipmentId);
      addEvent(db, {
        shipmentId,
        actor: "customer",
        action: "nomination_created",
        revision,
        detail: `Buyer authorised ${neighbourName} for this order only. Payer arrangement: ${payer === "buyer_prepay" ? "buyer pays through the platform" : "neighbour COD"}. The neighbour must agree independently.`,
        createdAt: at,
      });
      return {
        ok: true as const,
        message: `Nomination sent to ${neighbourName}. The hub will not dispatch until they agree.`,
        shipmentId,
      };
    }

    if (choice === "address_correction") {
      const note = requiredString(body, "note");
      const revision = bump(db, shipmentId);
      deactivateReadiness(db, shipmentId);
      retireNomination(db, shipmentId, at);
      supersedeCurrent(db, shipmentId, at, revision);
      insertReadiness(db, { shipmentId, choice, revision, createdAt: at });
      db.prepare(`
        UPDATE shipments
        SET phase = 'held', address_exception = COALESCE(address_exception, 'unclear'),
            address_exception_note = ?, instruction_stale = 0
        WHERE id = ?
      `).run(note, shipmentId);
      addException(db, {
        shipmentId,
        type: "address_access",
        causeOwner: "destination",
        detail: `Buyer asked to correct the address: ${note}`,
        createdAt: at,
      });
      addEvent(db, {
        shipmentId,
        actor: "customer",
        action: "readiness_submitted",
        revision,
        detail: "Address correction sent to hub review. This is not treated as a buyer refusal.",
        createdAt: at,
      });
      return { ok: true as const, message: "Address note sent to the hub. Dispatch stays held.", shipmentId };
    }

    throw new DomainError("Choose receive today, another day, a neighbour, an address correction, or cancel.");
  })();
}

export function neighbourRespond(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    syncExpiry(db);
    const shipmentId = requiredString(body, "shipmentId");
    const decision = requiredString(body, "decision");
    const shipment = mustShipment(db, shipmentId);
    const nomination = activeNomination(db, shipmentId);
    if (!nomination) throw new DomainError("There is no nomination for this order.");
    const at = demoNow(db);

    if (shipment.phase === "delivered") {
      addException(db, {
        shipmentId,
        type: "post_delivery_dispute",
        causeOwner: "unresolved",
        detail: `${nomination.recipientName} responded after physical handover. Delivery stands. The hub has the dispute.`,
        createdAt: at,
      });
      addEvent(db, {
        shipmentId,
        actor: "neighbour",
        action: "neighbour_declined",
        revision: shipment.revision,
        detail: "A later response cannot undo the physical delivery.",
        createdAt: at,
      });
      return {
        ok: true as const,
        message: "The parcel was already handed over. The dispute is with the hub. Delivery stands.",
        shipmentId,
      };
    }

    if (shipment.phase === "cancelled") {
      throw new DomainError("The buyer cancelled this order. The nomination is no longer valid.");
    }
    if (nomination.consent === "expired" || at >= nomination.expiresAt) {
      throw new DomainError("This agreement has expired. The hub will not use it for handover.");
    }

    if (decision === "decline") {
      db.prepare("UPDATE nominations SET consent = 'declined', revoked_at = ? WHERE id = ?").run(at, nomination.id);
      supersedeCurrent(db, shipmentId, at, shipment.revision);
      db.prepare("UPDATE shipments SET phase = 'at_hub', instruction_stale = 0 WHERE id = ? AND phase = 'dispatched'").run(shipmentId);
      addEvent(db, {
        shipmentId,
        actor: "neighbour",
        action: "neighbour_declined",
        revision: shipment.revision,
        detail: `${nomination.recipientName} declined. They are not retried automatically. Normal buyer delivery remains available.`,
        createdAt: at,
      });
      return { ok: true as const, message: `${nomination.recipientName} declined. The hub can restore normal delivery.`, shipmentId };
    }

    if (decision === "accept_receive") {
      db.prepare("UPDATE nominations SET consent = 'accepted_receive' WHERE id = ?").run(nomination.id);
      addEvent(db, {
        shipmentId,
        actor: "neighbour",
        action: "neighbour_accepted",
        revision: shipment.revision,
        detail:
          nomination.payerArrangement === "neighbour_cod"
            ? `${nomination.recipientName} agreed to receive, but not to pay ${formatINR(nomination.agreedAmount)} COD.`
            : `${nomination.recipientName} agreed to receive. Platform payment must still be confirmed before dispatch.`,
        createdAt: at,
      });
      return {
        ok: true as const,
        message:
          nomination.payerArrangement === "neighbour_cod"
            ? "Receive-only consent is recorded. COD dispatch stays blocked until payment responsibility is accepted."
            : "Receive consent is recorded. Dispatch waits for platform payment confirmation and the hub checks.",
        shipmentId,
      };
    }

    if (decision === "accept_receive_and_pay") {
      if (nomination.payerArrangement !== "neighbour_cod") {
        throw new DomainError("This order is on buyer prepayment. Agree to receive, and do not pay the rider once payment is confirmed.");
      }
      db.prepare("UPDATE nominations SET consent = 'accepted_receive_and_pay' WHERE id = ?").run(nomination.id);
      addEvent(db, {
        shipmentId,
        actor: "neighbour",
        action: "neighbour_accepted",
        revision: shipment.revision,
        detail: `${nomination.recipientName} agreed to receive the parcel and pay ${formatINR(nomination.agreedAmount)} through the approved COD process.`,
        createdAt: at,
      });
      return { ok: true as const, message: `${nomination.recipientName} agreed to receive and pay ${formatINR(nomination.agreedAmount)}.`, shipmentId };
    }

    throw new DomainError("Choose agree to receive, agree to receive and pay, or decline.");
  })();
}

export function simulatePrepay(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    syncExpiry(db);
    const shipmentId = requiredString(body, "shipmentId");
    const idempotencyKey = requiredString(body, "idempotencyKey");
    const shipment = mustShipment(db, shipmentId);
    assertMutable(shipment);
    const nomination = activeNomination(db, shipmentId);
    if (!nomination || nomination.payerArrangement !== "buyer_prepay") {
      throw new DomainError("Platform payment is available when the buyer has nominated a neighbour and chosen to pay through the platform.");
    }
    const at = demoNow(db);
    const existingKey = db.prepare("SELECT * FROM payments WHERE idempotency_key = ?").get(idempotencyKey) as
      | Record<string, unknown>
      | undefined;
    if (existingKey) {
      const payment = mapPayment(existingKey);
      if (payment.shipmentId !== shipmentId || payment.amount !== shipment.amount || payment.channel !== "platform_prepay") {
        throw new DomainError("This idempotency key was already used for a different payment.");
      }
      return { ok: true as const, message: `Platform confirmation ${payment.id} was already recorded for ${formatINR(payment.amount)}.`, shipmentId };
    }
    const existing = paymentsFor(db, shipmentId).find((payment) => payment.channel === "platform_prepay");
    if (existing) {
      return { ok: true as const, message: `Platform confirmation ${existing.id} already covers this order. No second charge was created.`, shipmentId };
    }
    const revision = bump(db, shipmentId);
    const hadTask = supersedeCurrent(db, shipmentId, at, revision);
    if (hadTask) {
      db.prepare("UPDATE shipments SET instruction_stale = 1, phase = 'at_hub' WHERE id = ?").run(shipmentId);
    }
    const info = db
      .prepare(`
        INSERT INTO payments (shipment_id, channel, amount, state, idempotency_key, created_at, note)
        VALUES (?, 'platform_prepay', ?, 'confirmed', ?, ?, 'Platform payment simulator. Not a live gateway.')
      `)
      .run(shipmentId, shipment.amount, idempotencyKey, at);
    addEvent(db, {
      shipmentId,
      actor: "customer",
      action: "payment_confirmed",
      revision,
      detail: `Platform payment simulator confirmed ${formatINR(shipment.amount)} for this order. The order is not delivered.`,
      createdAt: at,
    });
    return {
      ok: true as const,
      message: `Platform confirmation ${Number(info.lastInsertRowid)} recorded for ${formatINR(shipment.amount)}.`,
      shipmentId,
    };
  })();
}

export function confirmLaterRun(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    syncExpiry(db);
    const shipmentId = requiredString(body, "shipmentId");
    const accept = requiredBoolean(body, "accept");
    const shipment = mustShipment(db, shipmentId);
    assertMutable(shipment);
    const readiness = activeReadiness(db, shipmentId);
    if (readiness?.choice !== "later_day" || !shipment.requestedDate) {
      throw new DomainError("There is no later-run request to confirm.");
    }
    const at = demoNow(db);
    if (!accept) {
      db.prepare("UPDATE shipments SET later_declined = 1, later_confirmed = 0, phase = 'at_hub' WHERE id = ?").run(shipmentId);
      addEvent(db, {
        shipmentId,
        actor: "hub",
        action: "later_declined",
        revision: shipment.revision,
        detail: `Hub could not confirm ${formatDay(shipment.requestedDate, dateKey(at))}. Ordinary delivery remains available.`,
        createdAt: at,
      });
      return { ok: true as const, message: "Later run declined. The buyer can choose again, or the hub can issue normal delivery.", shipmentId };
    }
    supersedeCurrent(db, shipmentId, at, shipment.revision);
    db.prepare(`
      UPDATE shipments
      SET later_confirmed = 1, later_declined = 0, scheduled_date = ?, phase = 'scheduled_later', instruction_stale = 0
      WHERE id = ?
    `).run(shipment.requestedDate, shipmentId);
    addEvent(db, {
      shipmentId,
      actor: "hub",
      action: "later_confirmed",
      revision: shipment.revision,
      detail: `Hub confirmed ${formatDay(shipment.requestedDate, dateKey(at))}. The parcel stays at the hub until that run. No rider task was issued.`,
      createdAt: at,
    });
    return { ok: true as const, message: `Later run confirmed for ${formatDay(shipment.requestedDate, dateKey(at))}. Dispatch stays closed until then.`, shipmentId };
  })();
}

export function addressRepair(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    const shipmentId = requiredString(body, "shipmentId");
    const note = requiredString(body, "note");
    const shipment = mustShipment(db, shipmentId);
    if (!shipment.addressException && activeReadiness(db, shipmentId)?.choice !== "address_correction") {
      throw new DomainError("This order has no destination exception to repair.");
    }
    const at = demoNow(db);
    const revision = bump(db, shipmentId);
    db.prepare(`
      UPDATE shipments
      SET address_exception = NULL, address_exception_note = ?, phase = CASE WHEN phase = 'held' THEN 'at_hub' ELSE phase END
      WHERE id = ?
    `).run(note, shipmentId);
    db.prepare(`
      UPDATE exceptions SET review_status = 'resolved', resolution = ?
      WHERE shipment_id = ? AND review_status = 'open' AND cause_owner = 'destination'
    `).run(note, shipmentId);
    addEvent(db, {
      shipmentId,
      actor: "hub",
      action: "address_repaired",
      revision,
      detail: `Hub recorded an address repair: ${note}. No geocoding service was called.`,
      createdAt: at,
    });
    return { ok: true as const, message: "Destination repair recorded. Dispatch can be considered again.", shipmentId };
  })();
}

export function parcelInspection(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    const shipmentId = requiredString(body, "shipmentId");
    const cause = requiredString(body, "cause");
    const note = requiredString(body, "note");
    if (cause !== "supplier" && cause !== "logistics" && cause !== "unresolved") {
      throw new DomainError("Route the parcel cause to supplier, logistics, or unresolved review.");
    }
    const shipment = mustShipment(db, shipmentId);
    if (!shipment.parcelException) throw new DomainError("This order has no parcel exception to inspect.");
    const before = db.prepare("SELECT * FROM profiles WHERE id = ?").get(shipment.buyerProfileId);
    const at = demoNow(db);
    const revision = bump(db, shipmentId);
    db.prepare(`
      UPDATE shipments
      SET parcel_exception = NULL, parcel_exception_owner = ?, parcel_exception_note = ?,
          phase = CASE WHEN phase = 'held' THEN 'at_hub' ELSE phase END
      WHERE id = ?
    `).run(cause, note, shipmentId);
    addException(db, {
      shipmentId,
      type: "parcel_concern",
      causeOwner: cause,
      reviewStatus: "resolved",
      resolution: note,
      detail: `Inspection routed to ${cause}. Not added to buyer-refusal history. ${note}`,
      createdAt: at,
    });
    addEvent(db, {
      shipmentId,
      actor: "hub",
      action: "parcel_reviewed",
      revision,
      detail: `Parcel inspection recorded. Owner: ${cause}. Buyer refusal counts were not changed.`,
      createdAt: at,
    });
    const after = db.prepare("SELECT * FROM profiles WHERE id = ?").get(shipment.buyerProfileId);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new DomainError("Buyer history must not change during parcel inspection.");
    }
    return { ok: true as const, message: `Parcel reviewed and routed to ${cause}. Buyer history was left unchanged.`, shipmentId };
  })();
}

export function issueNormal(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    syncExpiry(db);
    const shipmentId = requiredString(body, "shipmentId");
    const shipment = mustShipment(db, shipmentId);
    const readiness = activeReadiness(db, shipmentId);
    const nomination = activeNomination(db, shipmentId);
    const today = dateKey(demoNow(db));
    const block = normalBlockReason({ shipment, nomination, readiness, today });
    if (block) throw new DomainError(block);
    const due = Math.max(0, codDue(shipment.amount, paymentsFor(db, shipmentId)));
    const runDate = shipment.scheduledDate && shipment.scheduledDate <= today ? shipment.scheduledDate : today;
    const task = issueTask(db, shipment, {
      kind: "normal",
      recipientName: shipment.buyerName,
      recipientRole: "buyer",
      addressLine: shipment.addressLine,
      landmark: shipment.landmark,
      runDate,
      paymentDue: due,
      routeAddedM: null,
      routeAddedMin: null,
    });
    return {
      ok: true as const,
      message: `Normal delivery task v${task.revision} issued to ${shipment.buyerName}. COD due ${formatINR(task.paymentDue)}.`,
      shipmentId,
    };
  })();
}

export function approveNeighbour(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    syncExpiry(db);
    const shipmentId = requiredString(body, "shipmentId");
    const shipment = mustShipment(db, shipmentId);
    const nomination = activeNomination(db, shipmentId);
    const payments = paymentsFor(db, shipmentId);
    const checks = neighbourChecks({
      shipment,
      nomination,
      payments,
      caps: capsOf(db),
      now: demoNow(db),
    });
    const failed = checks.filter((check) => !check.pass);
    if (failed.length > 0) {
      throw new DomainError(failed.map((check) => check.detail).join(" "));
    }
    if (!nomination) throw new DomainError("There is no active nomination.");
    const today = dateKey(demoNow(db));
    if (nomination.agreedRun > today) {
      throw new DomainError("The agreed run is not due yet. The hub will not dispatch early.");
    }
    const due = Math.max(0, codDue(shipment.amount, payments));
    const task = issueTask(db, mustShipment(db, shipmentId), {
      kind: "neighbour",
      recipientName: nomination.recipientName,
      recipientRole: "neighbour",
      addressLine: nomination.addressLine,
      landmark: nomination.landmark,
      runDate: nomination.agreedRun,
      paymentDue: due,
      routeAddedM: shipment.routeAddedM,
      routeAddedMin: shipment.routeAddedMin,
    });
    return {
      ok: true as const,
      message: `Neighbour dispatch approved. ${nomination.recipientName} is the receiver. COD due ${formatINR(task.paymentDue)}. Task v${task.revision}.`,
      shipmentId,
    };
  })();
}

export function restoreNormal(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    syncExpiry(db);
    const shipmentId = requiredString(body, "shipmentId");
    const shipment = mustShipment(db, shipmentId);
    if (shipment.phase === "cancelled") throw new DomainError("The buyer cancelled. Normal delivery is not restored.");
    if (shipment.phase === "delivered") throw new DomainError("This order is already delivered.");
    const nomination = activeNomination(db, shipmentId);
    const caps = capsOf(db);
    const capsFail = shipment.routeAddedM > caps.meters || shipment.routeAddedMin > caps.minutes;
    const declined = nomination?.consent === "declined" || nomination?.consent === "expired" || nomination?.consent === "revoked";
    if (nomination && nomination.active && !declined && !capsFail) {
      throw new DomainError("The neighbour path is still open. Restore normal delivery after a decline, expiry, or a failed route cap.");
    }
    const at = demoNow(db);
    if (nomination?.active) {
      db.prepare("UPDATE nominations SET active = 0, consent = 'revoked', revoked_at = COALESCE(revoked_at, ?) WHERE id = ?").run(at, nomination.id);
    }
    db.prepare(`
      UPDATE shipments
      SET phase = 'at_hub', scheduled_date = NULL, later_confirmed = 0, instruction_stale = 0
      WHERE id = ?
    `).run(shipmentId);
    addEvent(db, {
      shipmentId,
      actor: "hub",
      action: "readiness_submitted",
      revision: shipment.revision,
      detail: "Hub restored normal buyer delivery. The alternate receiver is no longer authorised.",
      createdAt: at,
    });
    return issueNormal(db, { shipmentId });
  })();
}

export function refreshTask(db: Database, body: Action): ActionResult {
  const shipmentId = requiredString(body, "shipmentId");
  const shipment = mustShipment(db, shipmentId);
  const tasks = tasksFor(db, shipmentId);
  const current = currentTask(tasks);
  if (current && current.revision === shipment.revision) {
    return { ok: true, message: "The rider already has the current instruction.", shipmentId };
  }
  const nomination = activeNomination(db, shipmentId);
  const checks = neighbourChecks({
    shipment,
    nomination,
    payments: paymentsFor(db, shipmentId),
    caps: capsOf(db),
    now: demoNow(db),
  });
  if (checksPass(checks)) return approveNeighbour(db, { shipmentId });
  return issueNormal(db, { shipmentId });
}

export function acknowledgeTask(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    syncExpiry(db);
    const shipmentId = requiredString(body, "shipmentId");
    const taskId = requiredNumber(body, "taskId");
    const revision = requiredNumber(body, "revision");
    const { task } = requireCurrentTask(db, shipmentId, taskId, revision);
    const at = demoNow(db);
    db.prepare("UPDATE tasks SET acknowledged = 1, owner = 'rider' WHERE id = ?").run(task.id);
    addEvent(db, {
      shipmentId,
      actor: "rider",
      action: "task_acknowledged",
      revision,
      detail: `Rider opened task v${revision} for ${task.recipientName}.`,
      createdAt: at,
      taskId: task.id,
    });
    return { ok: true as const, message: `Task v${revision} acknowledged.`, shipmentId };
  })();
}

export function collectCod(db: Database, body: Action): ActionResult {
  try {
    return collectCodTransaction(db, body);
  } catch (error) {
    if (error instanceof DomainError && error.code === "payment_mismatch") {
      const shipmentId = requiredString(body, "shipmentId");
      const at = demoNow(db);
      addException(db, {
        shipmentId,
        taskId: typeof body.taskId === "number" ? body.taskId : null,
        type: "payment_mismatch",
        causeOwner: "unresolved",
        detail: error.message,
        createdAt: at,
      });
    }
    throw error;
  }
}

function collectCodTransaction(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    syncExpiry(db);
    const shipmentId = requiredString(body, "shipmentId");
    const taskId = requiredNumber(body, "taskId");
    const revision = requiredNumber(body, "revision");
    const amount = requiredNumber(body, "amount");
    const idempotencyKey = requiredString(body, "idempotencyKey");
    const { shipment, task } = requireCurrentTask(db, shipmentId, taskId, revision);
    requireOnline(db, task.kind);
    if (task.paymentDue === 0) {
      throw new DomainError("COD due is ₹0. Do not collect cash for this task.");
    }
    if (amount !== task.paymentDue) {
      throw new DomainError(
        `The approved COD due is ${formatINR(task.paymentDue)}. ${formatINR(amount)} cannot be recorded as collection.`,
        409,
        "payment_mismatch",
      );
    }
    const at = demoNow(db);
    const existingKey = db.prepare("SELECT * FROM payments WHERE idempotency_key = ?").get(idempotencyKey) as
      | Record<string, unknown>
      | undefined;
    if (existingKey) {
      const payment = mapPayment(existingKey);
      if (payment.shipmentId !== shipmentId || payment.amount !== amount || payment.channel !== "cod_collection") {
        throw new DomainError("This idempotency key was already used for a different payment.");
      }
      return { ok: true as const, message: `COD collection ${payment.id} was already recorded. It was not collected again.`, shipmentId };
    }
    const prior = paymentsFor(db, shipmentId).find((payment) => payment.channel === "cod_collection" && payment.amount === amount);
    if (prior) {
      return { ok: true as const, message: `COD collection ${prior.id} already covers this order. No second collection was created.`, shipmentId };
    }
    if (codDue(shipment.amount, paymentsFor(db, shipmentId)) <= 0) {
      throw new DomainError("This order is already settled. Do not collect COD again.");
    }
    db.prepare(`
        INSERT INTO payments (shipment_id, channel, amount, state, idempotency_key, created_at, note)
        VALUES (?, 'cod_collection', ?, 'collected', ?, ?, 'Simulated approved COD collection. Not a live payment gateway.')
      `).run(shipmentId, amount, idempotencyKey, at);
    addEvent(db, {
      shipmentId,
      actor: "rider",
      action: "payment_collected",
      revision,
      detail: `Rider recorded ${formatINR(amount)} COD for task v${revision}. Physical receipt is still required.`,
      createdAt: at,
      taskId: task.id,
    });
    return { ok: true as const, message: `Collected ${formatINR(amount)}. The order is not delivered until physical receipt.`, shipmentId: shipmentId, };
  })();
}

export function confirmReceipt(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    syncExpiry(db);
    const shipmentId = requiredString(body, "shipmentId");
    const taskId = requiredNumber(body, "taskId");
    const revision = requiredNumber(body, "revision");
    const code = requiredString(body, "code");
    const existing = db.prepare("SELECT * FROM receipts WHERE shipment_id = ?").get(shipmentId) as
      | Record<string, unknown>
      | undefined;
    if (existing) {
      return { ok: true as const, message: "Physical receipt was already recorded for this order.", shipmentId };
    }
    const { shipment, task } = requireCurrentTask(db, shipmentId, taskId, revision);
    requireOnline(db, task.kind);
    if (code !== shipment.demoCode) {
      throw new DomainError("That demo receipt code does not match the authorised recipient.");
    }
    const payments = paymentsFor(db, shipmentId);
    if (task.paymentDue > 0 && !codCollected(payments, task.paymentDue)) {
      throw new DomainError(`Collect ${formatINR(task.paymentDue)} through the approved COD process before recording handover.`);
    }
    const at = demoNow(db);
    try {
      db.prepare(`
        INSERT INTO receipts (shipment_id, task_id, recipient_name, demo_code, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(shipmentId, task.id, task.recipientName, code, at);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("UNIQUE")) {
        return { ok: true as const, message: "Physical receipt was already recorded.", shipmentId };
      }
      throw error;
    }
    db.prepare("UPDATE tasks SET state = 'closed', closed_at = ?, owner = 'rider' WHERE id = ?").run(at, task.id);
    db.prepare(`
      UPDATE shipments
      SET phase = 'delivered', delivered_at = ?, delivery_mode = ?, instruction_stale = 0
      WHERE id = ?
    `).run(at, task.recipientRole, shipmentId);
    addEvent(db, {
      shipmentId,
      actor: "rider",
      action: "receipt_recorded",
      revision,
      detail: `Physical handover to ${task.recipientName} recorded on task v${revision}. Payment and receipt are reconciled once.`,
      createdAt: at,
      taskId: task.id,
    });
    return { ok: true as const, message: `Handed to ${task.recipientName}. The order is delivered.`, shipmentId };
  })();
}

export function riderException(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    const shipmentId = requiredString(body, "shipmentId");
    const taskId = requiredNumber(body, "taskId");
    const revision = requiredNumber(body, "revision");
    const type = requiredString(body, "type");
    const allowed = ["recipient_unavailable", "payment_mismatch", "address_access", "parcel_concern"];
    if (!allowed.includes(type)) throw new DomainError("Choose a rider exception the hub can act on.");
    const { task } = requireCurrentTask(db, shipmentId, taskId, revision);
    const at = demoNow(db);
    const detail =
      type === "recipient_unavailable"
        ? "Recipient unavailable. Retain parcel custody and contact the hub. Do not leave an unpaid parcel."
        : type === "payment_mismatch"
          ? "Payment mismatch. Do not complete handover. The hub must reconcile the amount."
          : type === "address_access"
            ? "Address or access issue. Retain custody and return the instruction to hub review."
            : "Parcel concern. Retain custody until the hub inspects the shipment.";
    addException(db, {
      shipmentId,
      taskId: task.id,
      type,
      causeOwner: type === "parcel_concern" ? "unresolved" : type === "address_access" ? "destination" : "logistics",
      detail,
      createdAt: at,
    });
    addEvent(db, {
      shipmentId,
      actor: "rider",
      action: "exception_opened",
      revision,
      detail,
      createdAt: at,
      taskId: task.id,
    });
    return { ok: true as const, message: detail, shipmentId };
  })();
}

export function setOffline(db: Database, body: Action): ActionResult {
  const offline = requiredBoolean(body, "offline");
  db.prepare("UPDATE settings SET value = ? WHERE key = 'rider_offline'").run(offline ? "1" : "0");
  return {
    ok: true,
    message: offline
      ? "Rider link marked offline. Handover mutations will be rejected until you reconnect."
      : "Rider link restored. Refreshing the current instruction.",
  };
}

export function advanceClock(db: Database, body: Action): ActionResult {
  const days = requiredNumber(body, "days");
  if (!Number.isInteger(days) || days === 0 || Math.abs(days) > 30) {
    throw new DomainError("Advance the demo clock by a whole number of days.");
  }
  const next = advanceMs(demoNow(db), days);
  db.prepare("UPDATE settings SET value = ? WHERE key = 'demo_now'").run(String(next));
  syncExpiry(db);
  return { ok: true, message: `Demo clock is now ${formatStamp(next)}.` };
}

export function setRoute(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    const shipmentId = requiredString(body, "shipmentId");
    const addedMeters = requiredNumber(body, "addedMeters");
    const addedMinutes = requiredNumber(body, "addedMinutes");
    if (addedMeters < 0 || addedMinutes < 0) throw new DomainError("Route measurements cannot be negative.");
    const shipment = mustShipment(db, shipmentId);
    const at = demoNow(db);
    const revision = bump(db, shipmentId);
    const removed = supersedeCurrent(db, shipmentId, at, revision);
    db.prepare("UPDATE shipments SET route_added_m = ?, route_added_min = ?, instruction_stale = ? WHERE id = ?").run(
      addedMeters,
      addedMinutes,
      removed ? 1 : shipment.instructionStale ? 1 : 0,
      shipmentId,
    );
    addEvent(db, {
      shipmentId,
      actor: "hub",
      action: "route_updated",
      revision,
      detail: `Scenario input updated to ${addedMeters} m added route and ${addedMinutes} min. This is not a live routing result.`,
      createdAt: at,
    });
    return { ok: true as const, message: `Route scenario set to ${addedMeters} m and ${addedMinutes} min.`, shipmentId };
  })();
}

export function setCaps(db: Database, body: Action): ActionResult {
  return db.transaction(() => {
    const meters = requiredNumber(body, "meters");
    const minutes = requiredNumber(body, "minutes");
    if (meters < 0 || minutes < 0) throw new DomainError("Pilot caps cannot be negative.");
    db.prepare("UPDATE settings SET value = ? WHERE key = 'cap_meters'").run(String(meters));
    db.prepare("UPDATE settings SET value = ? WHERE key = 'cap_minutes'").run(String(minutes));
    const shipments = rows<Record<string, unknown>>(db, "SELECT * FROM shipments").map(mapShipment);
    const at = demoNow(db);
    for (const shipment of shipments) {
      const task = currentTask(tasksFor(db, shipment.id));
      if (task?.kind === "neighbour" && (shipment.routeAddedM > meters || shipment.routeAddedMin > minutes)) {
        const revision = bump(db, shipment.id);
        supersedeCurrent(db, shipment.id, at, revision);
        db.prepare("UPDATE shipments SET instruction_stale = 1 WHERE id = ?").run(shipment.id);
      }
    }
    return { ok: true as const, message: `Proposed caps set to ${meters} m and ${minutes} min.` };
  })();
}

export function markPrompt(db: Database, body: Action): ActionResult {
  const shipmentId = requiredString(body, "shipmentId");
  const shipment = mustShipment(db, shipmentId);
  if (shipment.promptAt != null) {
    return { ok: true, message: "The prompt was already delivered for this order.", shipmentId };
  }
  const at = demoNow(db);
  db.prepare("UPDATE shipments SET prompt_at = ? WHERE id = ?").run(at, shipmentId);
  addEvent(db, {
    shipmentId,
    actor: "system",
    action: "prompt_delivered",
    revision: shipment.revision,
    detail: "Delivery update opened in the demo. No live SMS was sent.",
    createdAt: at,
  });
  return { ok: true, message: "Prompt recorded once.", shipmentId };
}

export function applyScenario(db: Database, body: Action): ActionResult {
  const scenario = requiredString(body, "scenario");
  const now = demoNow(db);
  if (scenario === "neighbour_cod") {
    reseedShipment(db, "PH-2401", now);
    return {
      ok: true,
      shipmentId: "PH-2401",
      message: "Prepared PH-2401. Saanvi's ₹299 order is at the Dewas hub with readiness pending. Nothing has been nominated or delivered.",
    };
  }
  if (scenario === "buyer_prepay") {
    reseedShipment(db, "PH-2401", now);
    return {
      ok: true,
      shipmentId: "PH-2401",
      message: "Prepared PH-2401 for the prepay path. Choose a neighbour and platform payment yourself. No payment has been confirmed.",
    };
  }
  if (scenario === "nominee_decline") {
    reseedShipment(db, "PH-2401", now);
    submitReadiness(db, {
      shipmentId: "PH-2401",
      choice: "nominate",
      neighbourName: NEIGHBOUR_FIXTURE.name,
      neighbourAddress: NEIGHBOUR_FIXTURE.address,
      neighbourLandmark: NEIGHBOUR_FIXTURE.landmark,
      payer: "neighbour_cod",
    });
    return {
      ok: true,
      shipmentId: "PH-2401",
      message: "Saanvi nominated someone nearby for neighbour COD. They have not responded. Decline is still yours to record.",
    };
  }
  if (scenario === "stale_task") {
    reseedShipment(db, "PH-2406", now);
    submitReadiness(db, { shipmentId: "PH-2406", choice: "receive_today" });
    issueNormal(db, { shipmentId: "PH-2406" });
    return {
      ok: true,
      shipmentId: "PH-2406",
      message: "Prepared Dev's ₹199 order with a current rider task. The order has not been cancelled.",
    };
  }
  if (scenario === "no_response") {
    reseedShipment(db, "PH-2405", now);
    return {
      ok: true,
      shipmentId: "PH-2405",
      message: "Prepared Pooja's order. The prompt is delivered and there is no response. Normal service stays available.",
    };
  }
  if (scenario === "address_repair") {
    reseedShipment(db, "PH-2403", now);
    return {
      ok: true,
      shipmentId: "PH-2403",
      message: "Prepared Meera's order with a PIN and locality conflict. The destination has not been repaired.",
    };
  }
  throw new DomainError("Unknown demo preparation.");
}

export function resetDemo(db: Database, body: Action): ActionResult {
  if (!requiredBoolean(body, "confirm")) {
    throw new DomainError("Reset needs confirmation. This only clears Pahunch demo records.");
  }
  seedDatabase(db);
  return { ok: true, message: "Demo records reset to the six fictional orders. Nothing outside this database was touched." };
}

const HANDLERS: Record<string, (db: Database, body: Action) => ActionResult> = {
  submitReadiness,
  neighbourRespond,
  simulatePrepay,
  confirmLaterRun,
  addressRepair,
  parcelInspection,
  issueNormal,
  approveNeighbour,
  restoreNormal,
  refreshTask,
  acknowledgeTask,
  collectCod,
  confirmReceipt,
  riderException,
  setOffline,
  advanceClock,
  setRoute,
  setCaps,
  markPrompt,
  applyScenario,
  resetDemo,
};

export function dispatch(db: Database, input: unknown): ActionResult {
  const body = asRecord(input);
  const action = requiredString(body, "action");
  const handler = HANDLERS[action];
  if (!handler) throw new DomainError(`Unknown action ${action}.`);
  return handler(db, body);
}

function profileById(db: Database, id: string): Profile {
  const row = db.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) throw new DomainError(`Missing profile ${id}.`);
  return mapProfile(row);
}

function buildDetail(db: Database, shipment: Shipment, today: string, now: number): OrderDetail {
  const readiness = activeReadiness(db, shipment.id);
  const nomination = activeNomination(db, shipment.id);
  const payments = paymentsFor(db, shipment.id);
  const tasks = tasksFor(db, shipment.id);
  const current = currentTask(tasks);
  const latest = latestTask(tasks);
  const receiptRow = db.prepare("SELECT * FROM receipts WHERE shipment_id = ?").get(shipment.id) as Record<string, unknown> | undefined;
  const receipt = receiptRow ? mapReceipt(receiptRow) : null;
  const exceptions = rows<Record<string, unknown>>(
    db,
    "SELECT * FROM exceptions WHERE shipment_id = ? ORDER BY id",
    shipment.id,
  ).map(mapException);
  const events = rows<Record<string, unknown>>(
    db,
    "SELECT * FROM events WHERE shipment_id = ? ORDER BY id",
    shipment.id,
  ).map(mapEvent);
  const caps = capsOf(db);
  const checks = neighbourChecks({ shipment, nomination, payments, caps, now });
  const recommendation = recommend({ shipment, nomination, readiness, currentTask: current, checks, today });
  const queue = queueKey({ shipment, nomination, readiness, currentTask: current, checks, today });
  const capsFail = shipment.routeAddedM > caps.meters || shipment.routeAddedMin > caps.minutes;
  const restoreAvailable =
    shipment.phase !== "cancelled" &&
    shipment.phase !== "delivered" &&
    Boolean(
      nomination &&
        nomination.active &&
        (nomination.consent === "declined" ||
          nomination.consent === "expired" ||
          nomination.consent === "revoked" ||
          capsFail),
    );
  return {
    shipment,
    readiness,
    nomination,
    payments,
    tasks,
    currentTask: current,
    latestTask: latest,
    receipt,
    exceptions,
    events,
    buyerProfile: profileById(db, shipment.buyerProfileId),
    supplierProfile: profileById(db, shipment.supplierProfileId),
    recommendation,
    checks,
    checksPass: checksPass(checks),
    queue,
    lifecycle: buildLifecycle({ shipment, readiness, nomination, payments, tasks, receipt, currentTask: current }),
    codDue: Math.max(0, codDue(shipment.amount, payments)),
    riderPreview: riderPreview({ shipment, nomination, payments }),
    buyerInsight: buyerInsight(profileById(db, shipment.buyerProfileId)),
    supplierInsight: supplierInsight(profileById(db, shipment.supplierProfileId)),
    readinessLabel: readinessLabel(shipment, readiness, today),
    receiverLabel: receiverLabel(shipment, nomination),
    payerLabel: payerLabel(shipment, nomination, payments),
    taskLabel: taskLabel(current, latest),
    exceptionLabel: exceptionLabel(shipment, exceptions),
    normalBlockReason: normalBlockReason({ shipment, nomination, readiness, today }),
    restoreAvailable,
    hubContextLabel: HUB_CONTEXT_LABEL[shipment.hubContext],
  };
}

export function getDemoState(db: Database, orderId: string | null): DemoState {
  syncExpiry(db);
  const now = demoNow(db);
  const today = dateKey(now);
  const shipments = rows<Record<string, unknown>>(db, "SELECT * FROM shipments ORDER BY id").map(mapShipment);
  const orders: OrderSummary[] = shipments.map((shipment) => {
    const detail = buildDetail(db, shipment, today, now);
    return {
      id: shipment.id,
      buyerName: shipment.buyerName,
      hubName: shipment.hubName,
      hubContext: shipment.hubContext,
      hubContextLabel: detail.hubContextLabel,
      amount: shipment.amount,
      readinessLabel: detail.readinessLabel,
      receiverLabel: detail.receiverLabel,
      payerLabel: detail.payerLabel,
      exceptionLabel: detail.exceptionLabel,
      taskLabel: detail.taskLabel,
      queue: detail.queue,
    };
  });
  const selectedId = orderId && shipments.some((shipment) => shipment.id === orderId) ? orderId : shipments[0]?.id ?? null;
  const selectedShipment = shipments.find((shipment) => shipment.id === selectedId) ?? null;
  const responseIds = rows<{ shipment_id: string }>(db, "SELECT DISTINCT shipment_id FROM readiness_responses").map(
    (row) => row.shipment_id,
  );
  const nominations = rows<{ shipment_id: string; active: number; consent: string }>(
    db,
    "SELECT shipment_id, active, consent FROM nominations",
  ).map((row) => ({ shipmentId: row.shipment_id, active: row.active === 1, consent: row.consent }));
  const neighbourTaskShipmentIds = rows<{ shipment_id: string }>(
    db,
    "SELECT DISTINCT shipment_id FROM tasks WHERE kind = 'neighbour'",
  ).map((row) => row.shipment_id);
  const openExceptions = (
    db.prepare("SELECT COUNT(*) AS n FROM exceptions WHERE review_status = 'open'").get() as { n: number }
  ).n;
  return {
    now,
    nowLabel: formatStamp(now),
    today,
    runDates: plannedRunDates(today).map((date) => ({ date, label: formatDay(date, today) })),
    caps: capsOf(db),
    riderOffline: riderOffline(db),
    orders,
    selected: selectedShipment ? buildDetail(db, selectedShipment, today, now) : null,
    metrics: computeMetrics({
      shipments: shipments.map((shipment) => ({
        id: shipment.id,
        promptAt: shipment.promptAt,
        phase: shipment.phase,
        deliveryMode: shipment.deliveryMode,
      })),
      responseShipmentIds: responseIds,
      nominations,
      neighbourTaskShipmentIds,
      openExceptions,
    }),
  };
}

export function exportAudit(db: Database): unknown {
  syncExpiry(db);
  return {
    generatedAt: formatStamp(demoNow(db)),
    shipments: rows(db, "SELECT * FROM shipments ORDER BY id"),
    events: rows(db, "SELECT * FROM events ORDER BY id"),
    payments: rows(db, "SELECT * FROM payments ORDER BY id"),
    tasks: rows(db, "SELECT * FROM tasks ORDER BY id"),
    receipts: rows(db, "SELECT * FROM receipts ORDER BY id"),
    nominations: rows(db, "SELECT * FROM nominations ORDER BY id"),
  };
}
