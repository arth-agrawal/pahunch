export type HubContext = "dense_lane" | "mixed_town" | "peripheral";

export type Phase =
  | "in_transit"
  | "at_hub"
  | "scheduled_later"
  | "dispatched"
  | "delivered"
  | "cancelled"
  | "held";

export type ReadinessChoice =
  | "receive_today"
  | "later_day"
  | "nominate"
  | "address_correction"
  | "cancel";

export type PayerArrangement = "neighbour_cod" | "buyer_prepay";

export type ConsentState =
  | "pending"
  | "accepted_receive"
  | "accepted_receive_and_pay"
  | "declined"
  | "revoked"
  | "expired";

export type TaskKind = "normal" | "neighbour";
export type TaskState = "current" | "superseded" | "closed";
export type PaymentChannel = "platform_prepay" | "cod_collection";
export type PaymentState = "confirmed" | "collected" | "reconciliation_review";

export type QueueKey =
  | "needs_readiness"
  | "nominee_pending"
  | "ready_for_dispatch"
  | "date_requested"
  | "hub_review"
  | "dispatched"
  | "delivered"
  | "cancelled";

export type Shipment = {
  id: string;
  buyerName: string;
  itemName: string;
  sku: string;
  amount: number;
  hubName: string;
  hubContext: HubContext;
  phase: Phase;
  revision: number;
  addressLine: string;
  landmark: string;
  locality: string;
  pin: string;
  addressException: "pin_conflict" | "unclear" | null;
  addressExceptionNote: string | null;
  parcelException: "packing" | "wrong_item" | "transit" | null;
  parcelExceptionOwner: "supplier" | "logistics" | "unresolved" | null;
  parcelExceptionNote: string | null;
  hubReceiptAt: number | null;
  promiseDate: string;
  scheduledDate: string | null;
  requestedDate: string | null;
  laterConfirmed: boolean;
  laterDeclined: boolean;
  promptAt: number | null;
  cancelledAt: number | null;
  deliveredAt: number | null;
  deliveryMode: "buyer" | "neighbour" | null;
  routeAddedM: number;
  routeAddedMin: number;
  demoCode: string;
  buyerProfileId: string;
  supplierProfileId: string;
  instructionStale: boolean;
};

export type Readiness = {
  id: number;
  shipmentId: string;
  choice: ReadinessChoice;
  requestedDate: string | null;
  neighbourName: string | null;
  neighbourAddress: string | null;
  neighbourLandmark: string | null;
  payerArrangement: PayerArrangement | null;
  revision: number;
  createdAt: number;
  active: boolean;
};

export type Nomination = {
  id: number;
  shipmentId: string;
  recipientName: string;
  addressLine: string;
  landmark: string;
  payerArrangement: PayerArrangement;
  agreedAmount: number;
  agreedRun: string;
  buyerAuthorised: boolean;
  consent: ConsentState;
  expiresAt: number;
  revokedAt: number | null;
  createdAt: number;
  active: boolean;
  revision: number;
};

export type Payment = {
  id: number;
  shipmentId: string;
  channel: PaymentChannel;
  amount: number;
  state: PaymentState;
  idempotencyKey: string;
  createdAt: number;
  note: string | null;
};

export type Task = {
  id: number;
  shipmentId: string;
  revision: number;
  kind: TaskKind;
  state: TaskState;
  recipientName: string;
  recipientRole: "buyer" | "neighbour";
  addressLine: string;
  landmark: string;
  runDate: string;
  paymentDue: number;
  routeAddedM: number | null;
  routeAddedMin: number | null;
  owner: string;
  acknowledged: boolean;
  issuedAt: number;
  closedAt: number | null;
};

export type Receipt = {
  id: number;
  shipmentId: string;
  taskId: number;
  recipientName: string;
  demoCode: string;
  createdAt: number;
};

export type ExceptionRow = {
  id: number;
  shipmentId: string;
  taskId: number | null;
  type: string;
  causeOwner: string;
  reviewStatus: "open" | "resolved";
  resolution: string | null;
  detail: string;
  createdAt: number;
};

export type Profile = {
  id: string;
  kind: "buyer" | "supplier";
  name: string;
  windowLabel: string;
  accepted: number | null;
  buyerRefusals: number | null;
  excluded: number | null;
  delivered: number | null;
  wrongItems: number | null;
  inspected: number | null;
  packingDefects: number | null;
  shadowMode: boolean;
};

export type AuditEvent = {
  id: number;
  shipmentId: string;
  actor: string;
  action: string;
  revision: number;
  detail: string;
  createdAt: number;
  taskId: number | null;
  invalidated: boolean;
};

export type Check = {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
};

export type Recommendation = {
  title: string;
  reason: string;
  tone: "gold" | "plum" | "teal" | "rose";
};

export type LifeStep = {
  id: string;
  label: string;
  state: "done" | "current" | "skipped" | "upcoming";
};

export type RiderPreview = {
  recipient: string;
  role: "buyer" | "neighbour";
  address: string;
  landmark: string;
  payer: string;
  codDue: number;
  version: number;
};
