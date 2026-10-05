import { formatINR } from "./format";
import { formatDay } from "./time";
import type {
  Check,
  ExceptionRow,
  LifeStep,
  Nomination,
  Payment,
  Profile,
  QueueKey,
  Readiness,
  Receipt,
  Recommendation,
  RiderPreview,
  Shipment,
  Task,
} from "./types";

export function settledTotal(payments: Payment[]): number {
  return payments.reduce((sum, payment) => {
    if (
      payment.state === "confirmed" ||
      payment.state === "collected" ||
      payment.state === "reconciliation_review"
    ) {
      return sum + payment.amount;
    }
    return sum;
  }, 0);
}

export function codDue(amount: number, payments: Payment[]): number {
  return amount - settledTotal(payments);
}

export function prepayConfirmed(payments: Payment[], amount: number): boolean {
  return payments.some(
    (payment) =>
      payment.channel === "platform_prepay" &&
      payment.amount === amount &&
      (payment.state === "confirmed" || payment.state === "reconciliation_review"),
  );
}

export function codCollected(payments: Payment[], amount: number): boolean {
  return payments.some(
    (payment) =>
      payment.channel === "cod_collection" &&
      payment.amount === amount &&
      (payment.state === "collected" || payment.state === "reconciliation_review"),
  );
}

function consentAccepted(consent: Nomination["consent"] | undefined): boolean {
  return consent === "accepted_receive" || consent === "accepted_receive_and_pay";
}

export function neighbourChecks(input: {
  shipment: Shipment;
  nomination: Nomination | null;
  payments: Payment[];
  caps: { meters: number; minutes: number };
  now: number;
}): Check[] {
  const { shipment, nomination, payments, caps, now } = input;
  const atHub =
    shipment.hubReceiptAt != null &&
    shipment.phase !== "in_transit" &&
    shipment.phase !== "cancelled" &&
    shipment.phase !== "delivered";

  const nominationActive = Boolean(
    nomination &&
      nomination.active &&
      nomination.buyerAuthorised &&
      nomination.consent !== "declined" &&
      nomination.consent !== "revoked",
  );

  const accepted = consentAccepted(nomination?.consent);

  let payerPass = false;
  let payerDetail = "Choose a payer arrangement before the hub can approve.";
  if (nomination?.payerArrangement === "buyer_prepay") {
    payerPass = prepayConfirmed(payments, shipment.amount);
    payerDetail = payerPass
      ? `Platform confirmation covers ${formatINR(shipment.amount)}. Rider COD due is ${formatINR(0)}.`
      : "The buyer chose platform payment. Dispatch waits until the server records that confirmation.";
  } else if (nomination?.payerArrangement === "neighbour_cod") {
    payerPass =
      nomination.consent === "accepted_receive_and_pay" &&
      nomination.agreedAmount === shipment.amount;
    payerDetail = payerPass
      ? `${nomination.recipientName} accepted responsibility for ${formatINR(shipment.amount)} COD.`
      : nomination.consent === "accepted_receive"
        ? `${nomination.recipientName} agreed to receive but has not accepted the ${formatINR(shipment.amount)} COD.`
        : "The neighbour has not accepted the disclosed COD amount.";
  }

  const addressClear = shipment.addressException == null;
  const parcelClear = shipment.parcelException == null;
  const accessPass = addressClear && parcelClear;
  const accessDetail = !addressClear
    ? shipment.addressException === "pin_conflict"
      ? "Supplied PIN and locality conflict. Repair the destination before dispatch."
      : "The buyer asked for an address correction. Repair it before dispatch."
    : !parcelClear
      ? "A parcel exception is open. Inspect it before dispatch."
      : "Address, access and parcel eligibility are clear for this pilot order.";

  const withinCaps =
    shipment.routeAddedM <= caps.meters && shipment.routeAddedMin <= caps.minutes;
  const capsDetail = withinCaps
    ? `Added routed travel is ${shipment.routeAddedM} m and ${shipment.routeAddedMin} min, inside the proposed caps of ${caps.meters} m and ${caps.minutes} min.`
    : `Added routed travel is ${shipment.routeAddedM} m and ${shipment.routeAddedMin} min. That exceeds the proposed caps of ${caps.meters} m and ${caps.minutes} min, so the neighbour redirect is blocked.`;

  const fresh = Boolean(
    nomination &&
      now < nomination.expiresAt &&
      nomination.consent !== "expired" &&
      nomination.consent !== "revoked" &&
      nomination.consent !== "declined",
  );

  return [
    {
      id: "at_hub",
      label: "Parcel is physically at this hub",
      pass: atHub,
      detail: atHub
        ? "Local-hub receipt is recorded."
        : "Readiness and alternate handover wait until the parcel is at the local hub.",
    },
    {
      id: "nomination",
      label: "Current buyer nomination is active",
      pass: nominationActive,
      detail: nominationActive
        ? `${nomination?.recipientName} is the named recipient for this order only.`
        : "There is no active buyer nomination.",
    },
    {
      id: "accepted",
      label: "Named neighbour independently accepted",
      pass: accepted && nominationActive,
      detail:
        accepted && nomination
          ? `${nomination.recipientName} responded on the neighbour screen.`
          : "Buyer nomination alone is insufficient.",
    },
    {
      id: "payer",
      label: "Payment is platform-confirmed, or the neighbour accepted the disclosed COD",
      pass: payerPass,
      detail: payerDetail,
    },
    {
      id: "access",
      label: "Address, access and parcel eligibility are clear",
      pass: accessPass,
      detail: accessDetail,
    },
    {
      id: "caps",
      label: "Added route and time are inside the proposed pilot caps",
      pass: withinCaps,
      detail: capsDetail,
    },
    {
      id: "fresh",
      label: "Consent has not expired or been revoked",
      pass: fresh,
      detail: fresh
        ? "This agreement still matches the current run."
        : "Consent is missing, expired, declined or revoked. A neighbour handover needs a current agreement.",
    },
  ];
}

export function checksPass(checks: Check[]): boolean {
  return checks.every((check) => check.pass);
}

export function normalBlockReason(input: {
  shipment: Shipment;
  nomination: Nomination | null;
  readiness: Readiness | null;
  today: string;
}): string | null {
  const { shipment, nomination, readiness, today } = input;
  if (shipment.hubReceiptAt == null || shipment.phase === "in_transit") {
    return "The parcel is not at the local hub.";
  }
  if (shipment.phase === "cancelled") return "This order is cancelled.";
  if (shipment.phase === "delivered") return "This order is already delivered.";
  if (shipment.addressException) {
    return "Review destination before dispatch. Supplied PIN and locality conflict.";
  }
  if (shipment.parcelException) return "Review the parcel before dispatch.";
  if (
    shipment.laterConfirmed &&
    shipment.scheduledDate &&
    shipment.scheduledDate > today
  ) {
    return "This parcel is held for a later run. Dispatch opens when that run is due.";
  }
  if (readiness?.choice === "later_day" && !shipment.laterConfirmed && !shipment.laterDeclined) {
    return "A later run is requested and still needs hub confirmation.";
  }
  if (
    nomination &&
    nomination.active &&
    (nomination.consent === "pending" ||
      nomination.consent === "accepted_receive" ||
      nomination.consent === "accepted_receive_and_pay")
  ) {
    return "An alternate receiver is still in progress. Restore normal delivery after a decline or a failed cap, or finish the neighbour checks.";
  }
  return null;
}

export function recommend(input: {
  shipment: Shipment;
  nomination: Nomination | null;
  readiness: Readiness | null;
  currentTask: Task | null;
  checks: Check[];
  today: string;
}): Recommendation {
  const { shipment, nomination, readiness, currentTask, checks, today } = input;
  const ready = checksPass(checks);

  if (shipment.phase === "delivered") {
    return {
      title: "Delivered",
      reason: "Physical receipt is recorded. Payment alone did not close the order.",
      tone: "teal",
    };
  }
  if (shipment.phase === "cancelled") {
    return {
      title: "Cancelled",
      reason:
        "Outstanding alternate authorisation is revoked. Retain parcel custody. Any collection stays on the order for reconciliation. No automatic refund is claimed.",
      tone: "rose",
    };
  }
  if (shipment.parcelException) {
    const reason =
      shipment.parcelException === "packing"
        ? "Packing issue must be resolved before dispatch."
        : shipment.parcelException === "wrong_item"
          ? "A wrong-item concern must be reviewed before dispatch."
          : "A transit concern must be reviewed before dispatch.";
    return { title: "Review parcel", reason, tone: "rose" };
  }
  if (shipment.addressException) {
    return {
      title: "Review destination",
      reason:
        shipment.addressException === "pin_conflict"
          ? "Supplied PIN and locality conflict."
          : "The buyer asked for an address correction.",
      tone: "rose",
    };
  }
  if (readiness?.choice === "later_day" && !shipment.laterConfirmed && !shipment.laterDeclined) {
    const when = shipment.requestedDate ? formatDay(shipment.requestedDate, today) : "another day";
    return {
      title: "Confirm a later run",
      reason: `Buyer requested ${when.toLowerCase()}.`,
      tone: "gold",
    };
  }
  if (shipment.phase === "scheduled_later" && shipment.scheduledDate && shipment.scheduledDate > today) {
    return {
      title: "Held for a later run",
      reason: `Dispatch stays closed until ${formatDay(shipment.scheduledDate, today)}. A later date is not a delivery and not an RTO prevented.`,
      tone: "gold",
    };
  }
  if (
    shipment.laterConfirmed &&
    shipment.scheduledDate &&
    shipment.scheduledDate <= today &&
    !currentTask
  ) {
    return {
      title: "Later run is due",
      reason: "The confirmed run date has arrived. Issue the buyer delivery when the parcel is otherwise eligible.",
      tone: "gold",
    };
  }
  if (nomination?.active && nomination.consent === "pending") {
    return {
      title: `Wait for ${nomination.recipientName}'s acceptance`,
      reason: "Buyer nomination alone is insufficient.",
      tone: "gold",
    };
  }
  if (nomination?.active && nomination.consent === "expired") {
    return {
      title: "Consent expired",
      reason: "Alternate handover is blocked. Restore normal delivery or collect a new agreement.",
      tone: "rose",
    };
  }
  if (
    nomination?.active &&
    (nomination.consent === "declined" || nomination.consent === "revoked")
  ) {
    return {
      title: "Neighbour declined",
      reason: "Normal buyer delivery is available if the shipment is otherwise eligible.",
      tone: "plum",
    };
  }
  if (ready && !currentTask) {
    return {
      title: "Ready for neighbour dispatch",
      reason: "Receiver, payer and route checks passed.",
      tone: "gold",
    };
  }
  if (shipment.instructionStale && !currentTask && readiness?.choice === "receive_today") {
    return {
      title: "Refresh rider instruction",
      reason: "The buyer changed the choice.",
      tone: "gold",
    };
  }
  if (!readiness && !currentTask) {
    return {
      title: "Normal delivery",
      reason: "No response; keep promised service.",
      tone: "plum",
    };
  }
  if (readiness?.choice === "receive_today" && !currentTask) {
    return {
      title: shipment.instructionStale ? "Refresh rider instruction" : "Normal delivery",
      reason: shipment.instructionStale
        ? "The buyer changed the choice."
        : "Buyer confirmed availability for the planned run. This does not promise an exact time slot.",
      tone: "plum",
    };
  }
  if (currentTask) {
    return {
      title: "Current rider task",
      reason: `Version ${currentTask.revision} is with the rider for ${currentTask.recipientName}. COD due ${formatINR(currentTask.paymentDue)}.`,
      tone: "plum",
    };
  }
  return {
    title: "Hub review",
    reason: "Use the checklist before releasing a rider instruction.",
    tone: "plum",
  };
}

export function queueKey(input: {
  shipment: Shipment;
  nomination: Nomination | null;
  readiness: Readiness | null;
  currentTask: Task | null;
  checks: Check[];
  today: string;
}): QueueKey {
  const { shipment, nomination, readiness, currentTask, checks, today } = input;
  if (shipment.phase === "delivered") return "delivered";
  if (shipment.phase === "cancelled") return "cancelled";
  if (shipment.parcelException || shipment.addressException) return "hub_review";
  if (
    (readiness?.choice === "later_day" && !shipment.laterConfirmed && !shipment.laterDeclined) ||
    (shipment.laterConfirmed && shipment.scheduledDate && shipment.scheduledDate > today)
  ) {
    return "date_requested";
  }
  if (nomination?.active && nomination.consent === "pending") return "nominee_pending";
  if (currentTask) return "dispatched";
  if (!readiness && !currentTask) return "needs_readiness";
  if (
    checksPass(checks) ||
    readiness?.choice === "receive_today" ||
    nomination?.consent === "declined" ||
    nomination?.consent === "expired" ||
    nomination?.consent === "revoked" ||
    (shipment.laterConfirmed && shipment.scheduledDate && shipment.scheduledDate <= today)
  ) {
    return "ready_for_dispatch";
  }
  return "needs_readiness";
}

export function readinessLabel(shipment: Shipment, readiness: Readiness | null, today: string): string {
  if (shipment.phase === "cancelled") return "Cancelled";
  if (!readiness) return "No response";
  if (readiness.choice === "receive_today") return "Receive today";
  if (readiness.choice === "later_day") {
    if (shipment.laterConfirmed && shipment.scheduledDate) {
      return `Confirmed ${formatDay(shipment.scheduledDate, today)}`;
    }
    if (shipment.laterDeclined) return "Later run declined";
    return shipment.requestedDate
      ? `Requested ${formatDay(shipment.requestedDate, today)}`
      : "Later run requested";
  }
  if (readiness.choice === "nominate") return `Nominated ${readiness.neighbourName ?? "neighbour"}`;
  if (readiness.choice === "address_correction") return "Address correction";
  return "Cancelled";
}

export function receiverLabel(shipment: Shipment, nomination: Nomination | null): string {
  if (!nomination || !nomination.active) return shipment.buyerName;
  if (nomination.consent === "pending") return `${nomination.recipientName} · pending`;
  if (nomination.consent === "accepted_receive") return `${nomination.recipientName} · receive only`;
  if (nomination.consent === "accepted_receive_and_pay") return `${nomination.recipientName} · accepted`;
  if (nomination.consent === "declined") return `${nomination.recipientName} · declined`;
  if (nomination.consent === "expired") return `${nomination.recipientName} · expired`;
  return `${nomination.recipientName} · revoked`;
}

export function payerLabel(shipment: Shipment, nomination: Nomination | null, payments: Payment[]): string {
  if (prepayConfirmed(payments, shipment.amount)) return "Platform confirmed";
  if (nomination?.payerArrangement === "buyer_prepay") return "Buyer prepay pending";
  if (nomination?.consent === "accepted_receive_and_pay") return "Neighbour COD";
  if (nomination?.payerArrangement === "neighbour_cod") return "COD not accepted";
  return "Buyer COD";
}

export function taskLabel(currentTask: Task | null, latestTask: Task | null): string {
  if (currentTask) return `v${currentTask.revision} current · ${currentTask.owner}`;
  if (latestTask?.state === "superseded") return `v${latestTask.revision} invalidated`;
  if (latestTask?.state === "closed") return `v${latestTask.revision} closed`;
  return "No task";
}

export function exceptionLabel(shipment: Shipment, exceptions: ExceptionRow[]): string | null {
  if (shipment.addressException === "pin_conflict") return "PIN and locality conflict";
  if (shipment.addressException === "unclear") return "Address correction";
  if (shipment.parcelException === "packing") return "Packing issue";
  if (shipment.parcelException === "wrong_item") return "Wrong item";
  if (shipment.parcelException === "transit") return "Transit damage";
  const open = exceptions.find((item) => item.reviewStatus === "open");
  return open ? open.detail : null;
}

export function riderPreview(input: {
  shipment: Shipment;
  nomination: Nomination | null;
  payments: Payment[];
}): RiderPreview {
  const due = Math.max(0, codDue(input.shipment.amount, input.payments));
  if (
    input.nomination &&
    input.nomination.active &&
    input.nomination.consent !== "declined" &&
    input.nomination.consent !== "revoked" &&
    input.nomination.consent !== "expired"
  ) {
    const payer =
      input.nomination.payerArrangement === "buyer_prepay"
        ? prepayConfirmed(input.payments, input.shipment.amount)
          ? `Platform confirmed · collect ${formatINR(0)}`
          : "Buyer prepay still pending"
        : input.nomination.consent === "accepted_receive_and_pay"
          ? `${input.nomination.recipientName} pays ${formatINR(input.shipment.amount)} COD`
          : "Neighbour has not accepted COD";
    return {
      recipient: input.nomination.recipientName,
      role: "neighbour",
      address: input.nomination.addressLine,
      landmark: input.nomination.landmark,
      payer,
      codDue: due,
      version: input.shipment.revision,
    };
  }
  return {
    recipient: input.shipment.buyerName,
    role: "buyer",
    address: input.shipment.addressLine,
    landmark: input.shipment.landmark,
    payer: prepayConfirmed(input.payments, input.shipment.amount)
      ? `Platform confirmed · collect ${formatINR(0)}`
      : `${input.shipment.buyerName} pays ${formatINR(due)} COD`,
    codDue: due,
    version: input.shipment.revision,
  };
}

export function buildLifecycle(input: {
  shipment: Shipment;
  readiness: Readiness | null;
  nomination: Nomination | null;
  payments: Payment[];
  tasks: Task[];
  receipt: Receipt | null;
  currentTask: Task | null;
}): LifeStep[] {
  const { shipment, readiness, nomination, payments, tasks, receipt, currentTask } = input;
  const nominatePath = readiness?.choice === "nominate" || Boolean(nomination);
  const hubDone = shipment.hubReceiptAt != null;
  const promptDone = shipment.promptAt != null;
  const buyerDone = Boolean(readiness);
  const neighbourDone = Boolean(
    nomination &&
      (consentAccepted(nomination.consent) ||
        nomination.consent === "declined" ||
        nomination.consent === "expired" ||
        nomination.consent === "revoked"),
  );
  const payerDone = nominatePath
    ? nomination?.payerArrangement === "buyer_prepay"
      ? prepayConfirmed(payments, shipment.amount)
      : nomination?.consent === "accepted_receive_and_pay" ||
        codCollected(payments, shipment.amount)
    : false;
  const approved = tasks.length > 0;
  const riderDone = Boolean(currentTask?.acknowledged || receipt || tasks.some((task) => task.acknowledged));
  const collectionDone =
    prepayConfirmed(payments, shipment.amount) || codCollected(payments, shipment.amount);
  const receiptDone = Boolean(receipt);

  const pending: LifeStep[] = [
    { id: "hub", label: "Local-hub receipt", state: hubDone ? "done" : "current" },
    { id: "prompt", label: "Prompt", state: promptDone ? "done" : "upcoming" },
    { id: "buyer", label: "Buyer response", state: buyerDone ? "done" : "upcoming" },
    {
      id: "neighbour",
      label: "Neighbour response",
      state: nominatePath ? (neighbourDone ? "done" : "upcoming") : "skipped",
    },
    {
      id: "payer",
      label: "Payer confirmation",
      state: nominatePath ? (payerDone ? "done" : "upcoming") : "skipped",
    },
    { id: "approval", label: "Hub approval", state: approved ? "done" : "upcoming" },
    { id: "rider", label: "Rider task", state: riderDone || approved ? "done" : "upcoming" },
    {
      id: "collection",
      label: "Payment collection",
      state: collectionDone ? "done" : "upcoming",
    },
    { id: "receipt", label: "Physical receipt", state: receiptDone ? "done" : "upcoming" },
  ];

  let markedCurrent = false;
  return pending.map((step) => {
    if (step.state === "skipped" || step.state === "done") return step;
    if (!markedCurrent) {
      markedCurrent = true;
      return { ...step, state: "current" };
    }
    return { ...step, state: "upcoming" };
  });
}

export function buyerInsight(profile: Profile): {
  headline: string;
  rate: number | null;
  showRate: boolean;
  accepted: number;
  refusals: number;
  excluded: number;
} {
  const accepted = profile.accepted ?? 0;
  const refusals = profile.buyerRefusals ?? 0;
  const excluded = profile.excluded ?? 0;
  const denominator = accepted + refusals;
  if (denominator === 0) {
    return {
      headline: "New buyer — insufficient history",
      rate: null,
      showRate: false,
      accepted,
      refusals,
      excluded,
    };
  }
  if (denominator < 5) {
    return {
      headline: "Small sample — counts only, not a rating",
      rate: null,
      showRate: false,
      accepted,
      refusals,
      excluded,
    };
  }
  return {
    headline: `${accepted} ÷ (${accepted} + ${refusals}) × 100 = ${Math.round((accepted / denominator) * 100)}%`,
    rate: accepted / denominator,
    showRate: true,
    accepted,
    refusals,
    excluded,
  };
}

export function supplierInsight(profile: Profile): {
  wrongItemRate: number | null;
  packingRate: number | null;
  delivered: number;
  wrongItems: number;
  inspected: number;
  packingDefects: number;
} {
  const delivered = profile.delivered ?? 0;
  const wrongItems = profile.wrongItems ?? 0;
  const inspected = profile.inspected ?? 0;
  const packingDefects = profile.packingDefects ?? 0;
  return {
    delivered,
    wrongItems,
    inspected,
    packingDefects,
    wrongItemRate: delivered === 0 ? null : wrongItems / delivered,
    packingRate: inspected === 0 ? null : packingDefects / inspected,
  };
}

export type MetricsInput = {
  shipments: Array<{
    id: string;
    promptAt: number | null;
    phase: string;
    deliveryMode: string | null;
  }>;
  responseShipmentIds: string[];
  nominations: Array<{ shipmentId: string; active: boolean; consent: string }>;
  neighbourTaskShipmentIds: string[];
  openExceptions: number;
};

export type Metrics = {
  eligible: number;
  prompts: number;
  responses: number;
  nominations: number;
  confirmedNominations: number;
  approvedRedirects: number;
  completedNeighbourHandovers: number;
  ordinaryDeliveries: number;
  openParcels: number;
  cancelled: number;
  openExceptions: number;
  rates: {
    promptReach: number | null;
    buyerResponse: number | null;
    nomineeConsent: number | null;
    handoverSuccess: number | null;
  };
};

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function computeMetrics(input: MetricsInput): Metrics {
  const eligible = input.shipments.length;
  const prompts = input.shipments.filter((shipment) => shipment.promptAt != null).length;
  const responses = new Set(input.responseShipmentIds).size;
  const currentNominations = input.nominations.filter((nomination) => nomination.active);
  const confirmedNominations = currentNominations.filter(
    (nomination) =>
      nomination.consent === "accepted_receive" ||
      nomination.consent === "accepted_receive_and_pay",
  ).length;
  const approvedRedirects = new Set(input.neighbourTaskShipmentIds).size;
  const completedNeighbourHandovers = input.shipments.filter(
    (shipment) => shipment.phase === "delivered" && shipment.deliveryMode === "neighbour",
  ).length;
  const ordinaryDeliveries = input.shipments.filter(
    (shipment) => shipment.phase === "delivered" && shipment.deliveryMode === "buyer",
  ).length;
  const cancelled = input.shipments.filter((shipment) => shipment.phase === "cancelled").length;
  const openParcels = input.shipments.filter(
    (shipment) => shipment.phase !== "delivered" && shipment.phase !== "cancelled",
  ).length;

  return {
    eligible,
    prompts,
    responses,
    nominations: currentNominations.length,
    confirmedNominations,
    approvedRedirects,
    completedNeighbourHandovers,
    ordinaryDeliveries,
    openParcels,
    cancelled,
    openExceptions: input.openExceptions,
    rates: {
      promptReach: ratio(prompts, eligible),
      buyerResponse: ratio(responses, prompts),
      nomineeConsent: ratio(confirmedNominations, currentNominations.length),
      handoverSuccess: ratio(completedNeighbourHandovers, approvedRedirects),
    },
  };
}

export const HUB_CONTEXT_LABEL: Record<Shipment["hubContext"], string> = {
  dense_lane: "Dense lane",
  mixed_town: "Mixed town",
  peripheral: "Peripheral route",
};

export const QUEUE_FILTERS: Array<{ id: "all" | QueueKey; label: string }> = [
  { id: "all", label: "All" },
  { id: "needs_readiness", label: "Needs readiness" },
  { id: "nominee_pending", label: "Nominee pending" },
  { id: "ready_for_dispatch", label: "Ready for dispatch" },
  { id: "date_requested", label: "Date requested" },
  { id: "hub_review", label: "Hub review" },
  { id: "dispatched", label: "Dispatched" },
  { id: "delivered", label: "Delivered" },
];
