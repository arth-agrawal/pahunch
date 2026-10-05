"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useDemo, type Role } from "@/components/demo-context";
import type { OrderDetail } from "@/lib/domain/dto";

const STORAGE_KEY = "pahunch-tour";

export type CoachId = "save" | "open-neighbour" | "yes-pay" | "approve" | "collect" | "handover" | "done";

type Cue = {
  id: CoachId;
  n: number;
  total: number;
  title: string;
  where: string;
  detail: string;
};

const TOTAL = 5;

function cueFor(role: Role, order: OrderDetail): Cue {
  const shipment = order.shipment;
  const consent = order.nomination?.consent;
  const nominated = order.readiness?.choice === "nominate" && order.nomination != null;
  const neighbourName = order.nomination?.recipientName.split(" ")[0] ?? "the neighbour";
  const collected = order.payments.some((payment) => payment.channel === "cod_collection");
  const onRun = order.currentTask != null || shipment.phase === "dispatched" || shipment.phase === "delivered";

  if (shipment.phase === "delivered") {
    return {
      id: "done",
      n: TOTAL,
      total: TOTAL,
      title: "That's the whole handoff",
      where: "The phone already shows delivered",
      detail: "Cash and the parcel were two separate taps. You can reset the morning and play it again.",
    };
  }

  if (!order.readiness && shipment.phase !== "cancelled") {
    return {
      id: "save",
      n: 1,
      total: TOTAL,
      title: "Tap Save",
      where: "Pink button at the bottom of the phone",
      detail: "Someone nearby is already selected. The name and the house are filled in. Save sends the request. It does not send the rider.",
    };
  }

  if (nominated && consent === "pending") {
    if (role === "neighbour") {
      return {
        id: "yes-pay",
        n: 2,
        total: TOTAL,
        title: order.nomination?.payerArrangement === "neighbour_cod" ? "Tap Yes, I'll take it and pay" : "Tap Yes, I'll take it",
        where: "The pink button on this phone",
        detail: "This is not the buyer's screen. Receiving the parcel and agreeing to the cash are separate.",
      };
    }
    return {
      id: "open-neighbour",
      n: 2,
      total: TOTAL,
      title: `Open ${neighbourName}'s phone`,
      where: "The pink button under this card",
      detail: `${shipment.buyerName.split(" ")[0]} cannot tick yes for ${neighbourName}.`,
    };
  }

  if (!onRun && shipment.phase !== "cancelled") {
    return {
      id: "approve",
      n: 3,
      total: TOTAL,
      title: role === "hub" ? "Tap Approve neighbour dispatch" : "Open the Dewas desk",
      where: role === "hub" ? "The button on the open ticket" : "The pink button under this card",
      detail: "The desk releases the parcel only after the checks pass. Until then the rider has no stop.",
    };
  }

  const due = order.currentTask?.paymentDue ?? order.codDue;
  if (order.currentTask && due > 0 && !collected) {
    return {
      id: "collect",
      n: 4,
      total: TOTAL,
      title: role === "rider" ? `Tap Collected ₹${due}` : "Open the rider",
      where: role === "rider" ? "The orange button on the stop" : "The pink button under this card",
      detail: "Collect the exact cash first. Handing the parcel over is the next tap, not this one.",
    };
  }

  if (order.currentTask) {
    return {
      id: "handover",
      n: 5,
      total: TOTAL,
      title: role === "rider" ? "Type the code, then Hand the parcel over" : "Open the rider",
      where: role === "rider" ? "The four boxes, then the pink button" : "The pink button under this card",
      detail: `The code is ${shipment.demoCode}. It is on the receiver's phone, not on a slip in the bag.`,
    };
  }

  return {
    id: "save",
    n: 1,
    total: TOTAL,
    title: "Tap the pink button on the phone",
    where: "Bottom of the order",
    detail: "That is the next move on this order.",
  };
}

const TourContext = createContext<{ on: boolean; skip: () => void; show: () => void } | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const tour = useTour();
  return <TourContext.Provider value={tour}>{children}</TourContext.Provider>;
}

function useTourState() {
  const tour = useContext(TourContext);
  if (!tour) throw new Error("The click guide has to sit inside the demo.");
  return tour;
}

export function useHighlight(id: CoachId): boolean {
  const demo = useDemo();
  const { on } = useTourState();
  if (!on || !demo.data?.selected) return false;
  return cueFor(demo.role, demo.data.selected).id === id;
}

export function tourRing(active: boolean): string {
  return active ? "ring-4 ring-meesho" : "";
}

export function useHighlightNext(): boolean {
  const demo = useDemo();
  const { on } = useTourState();
  if (!on || !demo.data?.selected) return false;
  const cue = cueFor(demo.role, demo.data.selected);
  if (cue.id === "open-neighbour") return true;
  if (cue.id === "approve" && demo.role !== "hub") return true;
  if ((cue.id === "collect" || cue.id === "handover") && demo.role !== "rider") return true;
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

export function CoachCard() {
  const demo = useDemo();
  const tour = useTourState();
  const selected = demo.data?.selected;
  if (!selected) return null;
  const cue = cueFor(demo.role, selected);

  if (!tour.on) {
    return (
      <button type="button" onClick={tour.show} className="mb-3 text-sm font-extrabold text-meesho">
        Show me what to tap
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-meesho/30 bg-cream p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-extrabold tracking-wide text-meesho uppercase">
          First look · {cue.n} of {cue.total}
        </p>
        <button type="button" onClick={tour.skip} className="shrink-0 text-sm font-extrabold text-muted">
          Skip
        </button>
      </div>
      <h2 className="mt-1 text-lg leading-6 font-extrabold">{cue.title}</h2>
      <p className="mt-1 text-sm font-bold">{cue.where}</p>
      <p className="mt-1 text-sm leading-5 text-muted">{cue.detail}</p>
      <ol className="mt-3 space-y-1 text-sm">
        {["Save on the order", "Neighbour says yes", "Hub lets it go", "Rider collects the cash", "Rider hands it over"].map(
          (label, index) => {
            const done = index + 1 < cue.n || cue.id === "done";
            const now = index + 1 === cue.n && cue.id !== "done";
            return (
              <li key={label} className={now ? "font-extrabold text-meesho" : done ? "text-teal" : "text-muted"}>
                {done ? "✓" : now ? "→" : `${index + 1}.`} {label}
              </li>
            );
          },
        )}
      </ol>
    </div>
  );
}
