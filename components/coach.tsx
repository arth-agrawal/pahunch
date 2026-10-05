"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useDemo, type Role } from "@/components/demo-context";
import { riderLabel } from "@/components/story";
import type { OrderDetail } from "@/lib/domain/dto";

const STORAGE_KEY = "pahunch-tour";

export type CoachId =
  | "save"
  | "open-neighbour"
  | "yes-pay"
  | "approve"
  | "collect"
  | "handover"
  | "done";

type Cue = {
  id: CoachId;
  n: number;
  steps: readonly string[];
  title: string;
  where: string;
  detail: string;
};

const PATHS = {
  neighbour: ["Order", "Neighbour", "Hub", "Cash", "Handover"],
  tomorrow: ["Order", "Hub", "Tomorrow"],
  home: ["Order", "Hub", "Cash", "Handover"],
} as const;

type Path = keyof typeof PATHS;

function pathFor(order: OrderDetail, play: string | null): Path {
  const choice = order.readiness?.choice;
  if (order.nomination != null || choice === "nominate") return "neighbour";
  if (choice === "later_day") return "tomorrow";
  if (choice === "receive_today") return "home";
  if (play === "tomorrow" || play === "home") return play;
  return "neighbour";
}

function cueFor(role: Role, order: OrderDetail, play: string | null): Cue {
  const shipment = order.shipment;
  const consent = order.nomination?.consent;
  const nominated =
    order.readiness?.choice === "nominate" && order.nomination != null;
  const neighbourName =
    order.nomination?.recipientName.split(" ")[0] ?? "the neighbour";
  const buyer = shipment.buyerName.split(" ")[0] || shipment.buyerName;
  const rider = riderLabel(shipment.hubName);
  const collected = order.payments.some(
    (payment) => payment.channel === "cod_collection",
  );
  const onRun =
    order.currentTask != null ||
    shipment.phase === "dispatched" ||
    shipment.phase === "delivered";
  const steps: readonly string[] = PATHS[pathFor(order, play)];

  const cue = (
    id: CoachId,
    step: string,
    title: string,
    where: string,
    detail: string,
  ): Cue => ({
    id,
    n: Math.max(1, steps.indexOf(step) + 1),
    steps,
    title,
    where,
    detail,
  });

  if (shipment.phase === "delivered") {
    return {
      id: "done",
      n: steps.length,
      steps,
      title: "That's the whole handoff",
      where: "The phone already shows delivered",
      detail:
        "Cash and the parcel were two separate taps. Pick another story above, or start the morning over.",
    };
  }

  if (shipment.phase === "cancelled") {
    return {
      id: "done",
      n: steps.length,
      steps,
      title: "This order is closed",
      where: "Nothing left to tap here",
      detail: `${buyer} cancelled before the parcel left the hub. Pick another story above, or start the morning over.`,
    };
  }

  if (shipment.phase === "scheduled_later" && !order.currentTask) {
    return {
      id: "done",
      n: steps.length,
      steps,
      title: "Nobody rides today",
      where: `The parcel stays on the shelf at the ${shipment.hubName} hub`,
      detail:
        "That is the point of this story: a wasted trip never happens. Tap Skip to tomorrow to watch it go out, or pick another story.",
    };
  }

  if (!order.readiness) {
    if (play === "tomorrow") {
      return cue(
        "save",
        "Order",
        "Tap Save",
        "Pink button at the bottom of the phone",
        `${buyer} is asking for tomorrow's run. The hub still has to confirm. The parcel stays on the shelf. Nobody rides out for nothing.`,
      );
    }
    if (play === "home") {
      return cue(
        "save",
        "Order",
        "Tap Save",
        "Pink button at the bottom of the phone",
        `${buyer} will be at her own door. ${rider} collects the cash from her, like a normal delivery, but the hub knew before he left.`,
      );
    }
    return cue(
      "save",
      "Order",
      "Tap Save",
      "Pink button at the bottom of the phone",
      "Type who can take it and where the rider should stop. Save sends that person a request. They say yes on their own phone.",
    );
  }

  if (nominated && consent === "pending") {
    if (role === "neighbour") {
      return cue(
        "yes-pay",
        "Neighbour",
        order.nomination?.payerArrangement === "neighbour_cod"
          ? "Tap Yes, I'll take it and pay"
          : "Tap Yes, I'll take it",
        "The pink button on this phone",
        `This is ${neighbourName}'s phone, not ${buyer}'s. Taking the parcel and paying the cash are two separate promises.`,
      );
    }
    return cue(
      "open-neighbour",
      "Neighbour",
      `Open ${neighbourName}'s phone`,
      "The pink button under the steps",
      `${buyer} cannot tick yes on ${neighbourName}'s behalf. The yes has to come from ${neighbourName}.`,
    );
  }

  if (!onRun) {
    if (order.readiness?.choice === "later_day" && !shipment.laterConfirmed) {
      return cue(
        "approve",
        "Hub",
        role === "hub"
          ? "Tap Confirm tomorrow"
          : `Open the ${shipment.hubName} hub`,
        role === "hub"
          ? "The one big button in the local hub portal"
          : "The pink button under the steps",
        "Confirming keeps the parcel at the hub for tomorrow's run. No rider goes out today.",
      );
    }
    if (order.readiness?.choice === "receive_today") {
      return cue(
        "approve",
        "Hub",
        role === "hub"
          ? `Tap Send ${rider} to ${buyer}`
          : `Open the ${shipment.hubName} hub`,
        role === "hub"
          ? "The one big button in the local hub portal"
          : "The pink button under the steps",
        `${buyer} said she is home. ${rider} goes to her address and collects the cash from her.`,
      );
    }
    return cue(
      "approve",
      "Hub",
      role === "hub" ? `Tap Send ${rider}` : `Open the ${shipment.hubName} hub`,
      role === "hub"
        ? "The one big button in the local hub portal"
        : "The pink button under the steps",
      `The hub lets the parcel go only after every check passes. Until then ${rider} has no stop.`,
    );
  }

  const due = order.currentTask?.paymentDue ?? order.codDue;
  if (order.currentTask && due > 0 && !collected) {
    return cue(
      "collect",
      "Cash",
      role === "rider" ? `Tap Collected ₹${due}` : `Open ${rider}'s app`,
      role === "rider"
        ? "The orange button on the stop"
        : "The pink button under the steps",
      "Collect the exact cash first. Handing the parcel over is the next tap, not this one.",
    );
  }

  if (order.currentTask) {
    return cue(
      "handover",
      "Handover",
      role === "rider"
        ? "Type the code, then Hand the parcel over"
        : `Open ${rider}'s app`,
      role === "rider"
        ? "The four boxes, then the pink button"
        : "The pink button under the steps",
      `The code is ${shipment.demoCode}. It is on the receiver's phone, not on a slip in the bag.`,
    );
  }

  return cue(
    "save",
    "Order",
    "Tap the pink button on the phone",
    "Bottom of the order",
    "That is the next move on this order.",
  );
}

const TourContext = createContext<{
  on: boolean;
  skip: () => void;
  show: () => void;
} | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const tour = useTour();
  return <TourContext.Provider value={tour}>{children}</TourContext.Provider>;
}

function useTourState() {
  const tour = useContext(TourContext);
  if (!tour) throw new Error("The click guide has to sit inside the demo.");
  return tour;
}

function useCurrentCue(): Cue | null {
  const demo = useDemo();
  const play = useSearchParams().get("play");
  const { on } = useTourState();
  if (!on || !demo.data?.selected) return null;
  return cueFor(demo.role, demo.data.selected, play);
}

export function useHighlight(id: CoachId): boolean {
  return useCurrentCue()?.id === id;
}

function PointerDown() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="tap-nudge h-5 w-5 shrink-0 text-[#ffe14a]"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path
        d="M12 4v14M6 12l6 7 6-7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The speech bubble that sits directly above the button to press. */
export function TapCloud({ id }: { id: CoachId }) {
  const cue = useCurrentCue();
  if (!cue || cue.id !== id) return null;
  return (
    <div className="relative mb-3" role="status">
      <div className="rounded-[22px] border-2 border-[#ffe14a] bg-[#142033] px-3 py-2.5 text-white shadow-[0_14px_32px_rgba(20,32,51,0.4)]">
        <div className="flex items-center gap-2">
          <PointerDown />
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold tracking-[0.14em] text-[#ffe14a] uppercase">
              Tap here · step {cue.n} of {cue.steps.length}
            </p>
            <p className="text-sm font-extrabold">{cue.title}</p>
          </div>
        </div>
        <p className="mt-1 text-xs leading-4 text-white/85">{cue.detail}</p>
      </div>
      <span
        aria-hidden
        className="absolute -bottom-[7px] left-8 h-3.5 w-3.5 rotate-45 border-r-2 border-b-2 border-[#ffe14a] bg-[#142033]"
      />
    </div>
  );
}

export function tourRing(active: boolean): string {
  return active ? "tap-pulse ring-4 ring-[#ffe14a] ring-offset-2" : "";
}

export function useHighlightNext(): boolean {
  const demo = useDemo();
  const cue = useCurrentCue();
  if (!cue) return false;
  if (cue.id === "open-neighbour" && demo.role !== "neighbour") return true;
  if (cue.id === "approve" && demo.role !== "hub") return true;
  if ((cue.id === "collect" || cue.id === "handover") && demo.role !== "rider")
    return true;
  return false;
}

function useTour() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (window.sessionStorage.getItem(STORAGE_KEY) === "off") setOn(false);
  }, []);

  function skip() {
    window.sessionStorage.setItem(STORAGE_KEY, "off");
    setOn(false);
  }

  function show() {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setOn(true);
  }

  return { on, skip, show };
}

/** The big card on the right that always says what to do next and how far along you are. */
export function CoachCard() {
  const tour = useTourState();
  const cue = useCurrentCue();

  if (!tour.on || !cue) {
    return (
      <button
        type="button"
        onClick={tour.show}
        className="mb-3 text-sm font-extrabold text-meesho"
      >
        Show me what to tap
      </button>
    );
  }

  const finished = cue.id === "done";

  return (
    <div className="relative mb-4">
      <div className="rounded-[28px] border-2 border-[#ffe14a] bg-[#142033] px-4 py-4 text-white shadow-[0_16px_40px_rgba(20,32,51,0.3)]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-extrabold tracking-[0.14em] text-[#ffe14a] uppercase">
            {finished
              ? "Story finished"
              : `Your next tap · step ${cue.n} of ${cue.steps.length}`}
          </p>
          <button
            type="button"
            onClick={tour.skip}
            className="shrink-0 text-sm font-extrabold text-white/70"
          >
            Hide guide
          </button>
        </div>
        <div className="mt-2 flex gap-1" aria-label="Progress">
          {cue.steps.map((label, index) => {
            const done = index + 1 < cue.n || finished;
            const now = index + 1 === cue.n && !finished;
            return (
              <div key={label} className="min-w-0 flex-1">
                <div
                  className={`h-1.5 rounded-full ${done ? "bg-[#7dffa1]" : now ? "bg-[#ffe14a]" : "bg-white/20"}`}
                />
                <p
                  className={`mt-1 truncate text-[10px] font-extrabold ${now ? "text-[#ffe14a]" : done ? "text-[#7dffa1]" : "text-white/55"}`}
                >
                  {label}
                </p>
              </div>
            );
          })}
        </div>
        <h2 className="mt-3 text-lg leading-6 font-extrabold">{cue.title}</h2>
        <p className="mt-1 text-sm font-bold text-[#ffe14a]">{cue.where}</p>
        <p className="mt-1 text-sm leading-5 text-white/85">{cue.detail}</p>
      </div>
    </div>
  );
}
