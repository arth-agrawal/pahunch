import type { Metrics } from "./order-state";
import type {
  AuditEvent,
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

export type OrderSummary = {
  id: string;
  buyerName: string;
  hubName: string;
  hubContext: string;
  hubContextLabel: string;
  amount: number;
  readinessLabel: string;
  receiverLabel: string;
  payerLabel: string;
  exceptionLabel: string | null;
  taskLabel: string;
  queue: QueueKey;
};

export type BuyerInsight = {
  headline: string;
  rate: number | null;
  showRate: boolean;
  accepted: number;
  refusals: number;
  excluded: number;
};

export type SupplierInsight = {
  wrongItemRate: number | null;
  packingRate: number | null;
  delivered: number;
  wrongItems: number;
  inspected: number;
  packingDefects: number;
};

export type OrderDetail = {
  shipment: Shipment;
  readiness: Readiness | null;
  nomination: Nomination | null;
  payments: Payment[];
  tasks: Task[];
  currentTask: Task | null;
  latestTask: Task | null;
  receipt: Receipt | null;
  exceptions: ExceptionRow[];
  events: AuditEvent[];
  buyerProfile: Profile;
  supplierProfile: Profile;
  recommendation: Recommendation;
  checks: Check[];
  checksPass: boolean;
  queue: QueueKey;
  lifecycle: LifeStep[];
  codDue: number;
  riderPreview: RiderPreview;
  buyerInsight: BuyerInsight;
  supplierInsight: SupplierInsight;
  readinessLabel: string;
  receiverLabel: string;
  payerLabel: string;
  taskLabel: string;
  exceptionLabel: string | null;
  normalBlockReason: string | null;
  restoreAvailable: boolean;
  hubContextLabel: string;
};

export type DemoState = {
  now: number;
  nowLabel: string;
  today: string;
  runDates: Array<{ date: string; label: string }>;
  caps: { meters: number; minutes: number };
  riderOffline: boolean;
  orders: OrderSummary[];
  selected: OrderDetail | null;
  metrics: Metrics;
};

export type ActionResult = {
  ok: true;
  message: string;
  shipmentId?: string;
};
