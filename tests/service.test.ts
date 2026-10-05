import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "../lib/db";
import { getDemoState } from "../lib/server/service";
import {
  acknowledgeTask,
  addressRepair,
  advanceClock,
  applyScenario,
  approveNeighbour,
  collectCod,
  confirmLaterRun,
  confirmReceipt,
  dispatch,
  issueNormal,
  markPrompt,
  neighbourRespond,
  parcelInspection,
  resetDemo,
  restoreNormal,
  setOffline,
  setRoute,
  simulatePrepay,
  submitReadiness,
} from "../lib/server/service";
import { tempDb } from "./helpers";

const opened: Array<{ close: () => void }> = [];

function db() {
  const handle = tempDb();
  opened.push(handle);
  return handle.db;
}

afterEach(() => {
  while (opened.length) opened.pop()?.close();
});

function codPath(database: ReturnType<typeof db>, payer: "neighbour_cod" | "buyer_prepay" = "neighbour_cod") {
  submitReadiness(database, {
    shipmentId: "PH-2401",
    choice: "nominate",
    neighbourName: "Riya Sharma",
    neighbourAddress: "Flat 18, Lake View Society, Powai",
    neighbourLandmark: "Opposite the D-Mart",
    payer,
  });
}

describe("neighbour COD handover", () => {
  it("collects ₹299 once and records one physical receipt", () => {
    const database = db();
    codPath(database);
    neighbourRespond(database, { shipmentId: "PH-2401", decision: "accept_receive" });
    expect(() => approveNeighbour(database, { shipmentId: "PH-2401" })).toThrow(/has not accepted/);
    neighbourRespond(database, { shipmentId: "PH-2401", decision: "accept_receive_and_pay" });
    const approved = approveNeighbour(database, { shipmentId: "PH-2401" });
    expect(approved.message).toMatch(/₹299/);
    const state = getDemoState(database, "PH-2401");
    const task = state.selected?.currentTask;
    expect(task?.recipientName).toBe("Riya Sharma");
    expect(task?.paymentDue).toBe(299);

    expect(() =>
      collectCod(database, {
        shipmentId: "PH-2401",
        taskId: task!.id,
        revision: task!.revision,
        amount: 100,
        idempotencyKey: "bad-amount",
      }),
    ).toThrow(/cannot be recorded/);
    expect(getDemoState(database, "PH-2401").selected?.payments).toHaveLength(0);

    collectCod(database, {
      shipmentId: "PH-2401",
      taskId: task!.id,
      revision: task!.revision,
      amount: 299,
      idempotencyKey: "cod-1",
    });
    expect(getDemoState(database, "PH-2401").selected?.shipment.phase).not.toBe("delivered");

    collectCod(database, {
      shipmentId: "PH-2401",
      taskId: task!.id,
      revision: task!.revision,
      amount: 299,
      idempotencyKey: "cod-1",
    });
    collectCod(database, {
      shipmentId: "PH-2401",
      taskId: task!.id,
      revision: task!.revision,
      amount: 299,
      idempotencyKey: "cod-2",
    });
    expect(getDemoState(database, "PH-2401").selected?.payments).toHaveLength(1);

    expect(() =>
      confirmReceipt(database, {
        shipmentId: "PH-2401",
        taskId: task!.id,
        revision: task!.revision,
        code: "0000",
      }),
    ).toThrow(/does not match/);

    confirmReceipt(database, {
      shipmentId: "PH-2401",
      taskId: task!.id,
      revision: task!.revision,
      code: "4821",
    });
    confirmReceipt(database, {
      shipmentId: "PH-2401",
      taskId: task!.id,
      revision: task!.revision,
      code: "4821",
    });
    const done = getDemoState(database, "PH-2401").selected;
    expect(done?.shipment.phase).toBe("delivered");
    expect(done?.shipment.deliveryMode).toBe("neighbour");
    expect(done?.receipt).toBeTruthy();
    expect(database.prepare("SELECT COUNT(*) AS n FROM receipts WHERE shipment_id = 'PH-2401'").get()).toEqual({ n: 1 });
  });

  it("rejects a second receipt from a repeated request", () => {
    const database = db();
    codPath(database);
    neighbourRespond(database, { shipmentId: "PH-2401", decision: "accept_receive_and_pay" });
    approveNeighbour(database, { shipmentId: "PH-2401" });
    const task = getDemoState(database, "PH-2401").selected!.currentTask!;
    collectCod(database, {
      shipmentId: "PH-2401",
      taskId: task.id,
      revision: task.revision,
      amount: 299,
      idempotencyKey: "once",
    });
    const body = { shipmentId: "PH-2401", taskId: task.id, revision: task.revision, code: "4821" };
    confirmReceipt(database, body);
    confirmReceipt(database, body);
    expect(database.prepare("SELECT COUNT(*) AS n FROM receipts").all()).toEqual([{ n: 1 }]);
  });
});

describe("buyer prepayment", () => {
  it("confirms ₹299 on the server and completes receipt at ₹0", () => {
    const database = db();
    codPath(database, "buyer_prepay");
    simulatePrepay(database, { shipmentId: "PH-2401", idempotencyKey: "pay-1" });
    simulatePrepay(database, { shipmentId: "PH-2401", idempotencyKey: "pay-2" });
    expect(getDemoState(database, "PH-2401").selected?.payments).toHaveLength(1);
    neighbourRespond(database, { shipmentId: "PH-2401", decision: "accept_receive" });
    approveNeighbour(database, { shipmentId: "PH-2401" });
    const task = getDemoState(database, "PH-2401").selected!.currentTask!;
    expect(task.paymentDue).toBe(0);
    expect(() =>
      collectCod(database, {
        shipmentId: "PH-2401",
        taskId: task.id,
        revision: task.revision,
        amount: 299,
        idempotencyKey: "extra-cod",
      }),
    ).toThrow(/₹0/);
    confirmReceipt(database, { shipmentId: "PH-2401", taskId: task.id, revision: task.revision, code: "4821" });
    const done = getDemoState(database, "PH-2401").selected;
    expect(done?.shipment.phase).toBe("delivered");
    expect(done?.payments).toHaveLength(1);
    expect(done?.codDue).toBe(0);
  });

  it("keeps a settled payment when the buyer changes readiness", () => {
    const database = db();
    codPath(database, "buyer_prepay");
    simulatePrepay(database, { shipmentId: "PH-2401", idempotencyKey: "pay-keep" });
    submitReadiness(database, { shipmentId: "PH-2401", choice: "receive_today" });
    const selected = getDemoState(database, "PH-2401").selected;
    expect(selected?.payments).toHaveLength(1);
    expect(selected?.payments[0]?.state).toBe("confirmed");
    expect(selected?.codDue).toBe(0);
  });
});

describe("later run and normal service", () => {
  it("holds a tomorrow request until the demo clock reaches that run", () => {
    const database = db();
    const tomorrow = getDemoState(database, "PH-2402").runDates[0]?.date;
    submitReadiness(database, { shipmentId: "PH-2402", choice: "later_day", requestedDate: tomorrow });
    expect(() => issueNormal(database, { shipmentId: "PH-2402" })).toThrow(/hub confirmation/);
    confirmLaterRun(database, { shipmentId: "PH-2402", accept: true });
    const held = getDemoState(database, "PH-2402").selected;
    expect(held?.shipment.phase).toBe("scheduled_later");
    expect(held?.currentTask).toBeNull();
    expect(held?.shipment.phase).not.toBe("delivered");
    expect(() => issueNormal(database, { shipmentId: "PH-2402" })).toThrow(/later run/);
    advanceClock(database, { days: 1 });
    issueNormal(database, { shipmentId: "PH-2402" });
    const due = getDemoState(database, "PH-2402").selected;
    expect(due?.shipment.phase).toBe("dispatched");
    expect(due?.shipment.phase).not.toBe("delivered");
    expect(getDemoState(database, "PH-2402").metrics.completedNeighbourHandovers).toBe(0);
    expect(getDemoState(database, "PH-2402").metrics.ordinaryDeliveries).toBe(0);
  });

  it("keeps a new buyer with no response on ordinary service", () => {
    const database = db();
    const before = getDemoState(database, "PH-2405").selected;
    expect(before?.readiness).toBeNull();
    expect(before?.buyerInsight.headline).toMatch(/New buyer/);
    expect(before?.recommendation.reason).toMatch(/No response/);
    issueNormal(database, { shipmentId: "PH-2405" });
    const after = getDemoState(database, "PH-2405").selected;
    expect(after?.currentTask?.recipientRole).toBe("buyer");
    expect(after?.shipment.phase).toBe("dispatched");
  });
});

describe("controls", () => {
  it("blocks neighbour dispatch without independent acceptance", () => {
    const database = db();
    codPath(database);
    expect(() => approveNeighbour(database, { shipmentId: "PH-2401" })).toThrow(/insufficient|not accepted|agree/i);
  });

  it("offers normal delivery after the neighbour declines", () => {
    const database = db();
    codPath(database);
    neighbourRespond(database, { shipmentId: "PH-2401", decision: "decline" });
    const restored = restoreNormal(database, { shipmentId: "PH-2401" });
    expect(restored.message).toMatch(/Saanvi Verma/);
    expect(getDemoState(database, "PH-2401").selected?.currentTask?.recipientRole).toBe("buyer");
  });

  it("blocks a redirect that exceeds either proposed cap and still allows normal delivery", () => {
    const database = db();
    codPath(database);
    neighbourRespond(database, { shipmentId: "PH-2401", decision: "accept_receive_and_pay" });
    setRoute(database, { shipmentId: "PH-2401", addedMeters: 180, addedMinutes: 1 });
    expect(() => approveNeighbour(database, { shipmentId: "PH-2401" })).toThrow(/caps/);
    setRoute(database, { shipmentId: "PH-2401", addedMeters: 40, addedMinutes: 4 });
    expect(() => approveNeighbour(database, { shipmentId: "PH-2401" })).toThrow(/caps/);
    const restored = restoreNormal(database, { shipmentId: "PH-2401" });
    expect(restored.message).toMatch(/Normal delivery/);
    expect(getDemoState(database, "PH-2401").selected?.shipment.phase).not.toBe("cancelled");
  });

  it("holds PIN and parcel issues until review, without changing buyer refusals", () => {
    const database = db();
    expect(() => issueNormal(database, { shipmentId: "PH-2403" })).toThrow(/destination/i);
    addressRepair(database, { shipmentId: "PH-2403", note: "Caller confirmed Chandivali, Powai. Manual review only." });
    issueNormal(database, { shipmentId: "PH-2403" });
    expect(getDemoState(database, "PH-2403").selected?.currentTask).toBeTruthy();

    const before = database.prepare("SELECT accepted, buyer_refusals, excluded FROM profiles WHERE id = 'buyer-imran'").get();
    expect(() => issueNormal(database, { shipmentId: "PH-2404" })).toThrow(/parcel/i);
    parcelInspection(database, {
      shipmentId: "PH-2404",
      cause: "supplier",
      note: "Torn carton. Routed to the supplier. Not a buyer refusal.",
    });
    const after = database.prepare("SELECT accepted, buyer_refusals, excluded FROM profiles WHERE id = 'buyer-imran'").get();
    expect(after).toEqual(before);
    issueNormal(database, { shipmentId: "PH-2404" });
  });

  it("invalidates a dispatched task after cancellation, including a direct replay", () => {
    const database = db();
    applyScenario(database, { scenario: "stale_task" });
    const task = getDemoState(database, "PH-2406").selected!.currentTask!;
    submitReadiness(database, { shipmentId: "PH-2406", choice: "cancel" });
    expect(getDemoState(database, "PH-2406").selected?.currentTask).toBeNull();
    expect(() =>
      confirmReceipt(database, {
        shipmentId: "PH-2406",
        taskId: task.id,
        revision: task.revision,
        code: "8086",
      }),
    ).toThrow(/no longer valid/);
    expect(() =>
      dispatch(database, {
        action: "confirmReceipt",
        shipmentId: "PH-2406",
        taskId: task.id,
        revision: task.revision,
        code: "8086",
      }),
    ).toThrow(/no longer valid/);
  });

  it("requires a new agreement when the recipient changes", () => {
    const database = db();
    codPath(database);
    neighbourRespond(database, { shipmentId: "PH-2401", decision: "accept_receive_and_pay" });
    approveNeighbour(database, { shipmentId: "PH-2401" });
    const first = getDemoState(database, "PH-2401").selected!.currentTask!;
    submitReadiness(database, {
      shipmentId: "PH-2401",
      choice: "nominate",
      neighbourName: "Neel Sharma",
      neighbourAddress: "Flat 19, Lake View Society, Powai",
      neighbourLandmark: "Next to the flour mill",
      payer: "neighbour_cod",
    });
    expect(getDemoState(database, "PH-2401").selected?.currentTask).toBeNull();
    expect(() =>
      confirmReceipt(database, {
        shipmentId: "PH-2401",
        taskId: first.id,
        revision: first.revision,
        code: "4821",
      }),
    ).toThrow(/no longer valid/);
    expect(() => approveNeighbour(database, { shipmentId: "PH-2401" })).toThrow(/insufficient|not accepted/i);
  });

  it("blocks alternate handover after consent expires", () => {
    const database = db();
    codPath(database);
    neighbourRespond(database, { shipmentId: "PH-2401", decision: "accept_receive_and_pay" });
    advanceClock(database, { days: 1 });
    expect(() => approveNeighbour(database, { shipmentId: "PH-2401" })).toThrow(/expired|Consent/);
  });

  it("rejects neighbour handover while the rider link is offline, then allows it after reconnect", () => {
    const database = db();
    codPath(database);
    neighbourRespond(database, { shipmentId: "PH-2401", decision: "accept_receive_and_pay" });
    approveNeighbour(database, { shipmentId: "PH-2401" });
    const task = getDemoState(database, "PH-2401").selected!.currentTask!;
    setOffline(database, { offline: true });
    expect(() =>
      collectCod(database, {
        shipmentId: "PH-2401",
        taskId: task.id,
        revision: task.revision,
        amount: 299,
        idempotencyKey: "offline",
      }),
    ).toThrow(/offline/);
    setOffline(database, { offline: false });
    collectCod(database, {
      shipmentId: "PH-2401",
      taskId: task.id,
      revision: task.revision,
      amount: 299,
      idempotencyKey: "online",
    });
    expect(getDemoState(database, "PH-2401").selected?.shipment.phase).toBe("dispatched");
  });

  it("preserves collection and opens reconciliation when the buyer cancels before receipt", () => {
    const database = db();
    codPath(database);
    neighbourRespond(database, { shipmentId: "PH-2401", decision: "accept_receive_and_pay" });
    approveNeighbour(database, { shipmentId: "PH-2401" });
    const task = getDemoState(database, "PH-2401").selected!.currentTask!;
    collectCod(database, {
      shipmentId: "PH-2401",
      taskId: task.id,
      revision: task.revision,
      amount: 299,
      idempotencyKey: "collected",
    });
    submitReadiness(database, { shipmentId: "PH-2401", choice: "cancel" });
    const selected = getDemoState(database, "PH-2401").selected;
    expect(selected?.shipment.phase).toBe("cancelled");
    expect(selected?.payments[0]?.amount).toBe(299);
    expect(selected?.payments[0]?.state).toBe("collected");
    expect(selected?.exceptions.some((item) => item.type === "cancellation_reconciliation")).toBe(true);
    expect(selected?.receipt).toBeNull();
  });

  it("reloads payment and task state from a fresh connection", () => {
    const database = db();
    codPath(database, "buyer_prepay");
    simulatePrepay(database, { shipmentId: "PH-2401", idempotencyKey: "reload" });
    const listed = database.prepare("PRAGMA database_list").get() as { file: string };
    const again = openDatabase(listed.file);
    opened.push({ close: () => again.close() });
    const selected = getDemoState(again, "PH-2401").selected;
    expect(selected?.payments).toHaveLength(1);
    expect(selected?.nomination?.recipientName).toBe("Riya Sharma");
  });
});

describe("metrics", () => {
  it("does not count repeated responses or prompts as extra orders", () => {
    const database = db();
    const start = getDemoState(database, "PH-2401").metrics;
    expect(start.eligible).toBe(6);
    expect(start.prompts).toBe(6);
    expect(start.responses).toBe(0);
    submitReadiness(database, { shipmentId: "PH-2401", choice: "receive_today" });
    const tomorrow = getDemoState(database, "PH-2401").runDates[0]?.date;
    submitReadiness(database, { shipmentId: "PH-2401", choice: "later_day", requestedDate: tomorrow });
    markPrompt(database, { shipmentId: "PH-2401" });
    markPrompt(database, { shipmentId: "PH-2401" });
    const metrics = getDemoState(database, "PH-2401").metrics;
    expect(metrics.responses).toBe(1);
    expect(metrics.prompts).toBe(6);
    expect(metrics.completedNeighbourHandovers).toBe(0);
    expect(metrics.ordinaryDeliveries).toBe(0);
  });
});

describe("demo reset", () => {
  it("requires confirmation and restores the seed", () => {
    const database = db();
    submitReadiness(database, { shipmentId: "PH-2405", choice: "receive_today" });
    expect(() => resetDemo(database, { confirm: false })).toThrow(/confirmation/);
    resetDemo(database, { confirm: true });
    expect(getDemoState(database, "PH-2405").selected?.readiness).toBeNull();
    expect(getDemoState(database, "PH-2405").orders).toHaveLength(6);
  });
});

describe("acknowledgement", () => {
  it("records that the rider opened the current task", () => {
    const database = db();
    issueNormal(database, { shipmentId: "PH-2405" });
    const task = getDemoState(database, "PH-2405").selected!.currentTask!;
    acknowledgeTask(database, { shipmentId: "PH-2405", taskId: task.id, revision: task.revision });
    expect(getDemoState(database, "PH-2405").selected?.currentTask?.acknowledged).toBe(true);
  });
});
