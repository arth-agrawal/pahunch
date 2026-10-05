"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
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

function cueFor(role: Role, order: OrderDetail, play: string | null): Cue {
  const shipment = order.shipment;
  const consent = order.nomination?.consent;
  const nominated = order.readiness?.choice === "nominate" && order.nomination != null;
  const neighbourName = order.nomination?.recipientName.split(" ")[0] ?? "the neighbour";
  const buyer = shipment.buyerName.split(" ")[0] || shipment.buyerName;
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
    if (play === "tomorrow") {
      return {
        id: "save",
        n: 1,
        total: TOTAL,
        title: "Tap Save",
        where: "Pink button at the bottom of the phone",
        detail: `${buyer} is asking for the next run. The hub still has to confirm. The parcel stays there. It is not delivered.`,
      };
    }
    if (play === "home") {
      return {
        id: "save",
        n: 1,
        total: TOTAL,
        title: "Tap Save",
        where: "Pink button at the bottom of the phone",
        detail: `${buyer} will be at her own house. The rider collects the cash from her.`,
      };
    }
    return {
      id: "save",
      n: 1,
      total: TOTAL,
      title: "Tap Save",
      where: "Pink button at the bottom of the phone",
      detail: "Type who can take it, and where the rider should stop. Save asks that person. They have to agree on their own phone.",
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
    if (order.readiness?.choice === "later_day" && !shipment.laterConfirmed) {
      return {
        id: "approve",
        n: 3,
        total: TOTAL,
        title: role === "hub" ? "Tap Confirm tomorrow" : "Open the hub",
        where: role === "hub" ? "The one button in the local hub portal" : "The pink button under the steps",
        detail: "Confirming keeps the parcel at the hub for the next run. That is not a delivery.",
      };
    }
    if (order.readiness?.choice === "receive_today") {
      return {
        id: "approve",
        n: 3,
        total: TOTAL,
        title: role === "hub" ? `Tap Send the rider to ${buyer}` : "Open the hub",
        where: role === "hub" ? "The one button in the local hub portal" : "The pink button under the steps",
        detail: `${buyer} is home. Rider 1 goes to her address and collects the cash from her.`,
      };
    }
    return {
      id: "approve",
      n: 3,
      total: TOTAL,
      title: role === "hub" ? "Tap Send the rider" : "Open the hub",
      where: role === "hub" ? "The one button in the local hub portal" : "The pink button under the steps",
      detail: "The local hub portal lets the parcel go only after every check passes. Until then Rider 1 has no stop.",
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

export function TapCloud({ id }: { id: CoachId }) {
  const cue = useCurrentCue();
  if (!cue || cue.id !== id) return null;
  return (
    <div className="relative mb-3">
      <div className="rounded-[22px] bg-[#142033] px-3 py-2.5 text-white shadow-[0_14px_32px_rgba(20,32,51,0.35)]">
        <p className="text-[11px] font-extrabold tracking-[0.14em] text-[#ffe14a] uppercase">Tap here</p>
        <p className="text-sm font-extrabold">{cue.title}</p>
        <p className="mt-0.5 text-xs leading-4 text-white/80">{cue.detail}</p>
      </div>
      <span aria-hidden className="absolute -bottom-1.5 left-8 h-3 w-3 rotate-45 bg-[#142033]" />
    </div>
  );
}

export function tourRing(active: boolean): string {
  return active ? "ring-4 ring-[#ffe14a] ring-offset-2" : "";
}

export function useHighlightNext(): boolean {
  const demo = useDemo();
  const cue = useCurrentCue();
  if (!cue) return false;
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

const STEP_LABELS = ["Order", "Neighbour", "Hub", "Cash", "Rider 1"];

export function CoachCard() {
  const tour = useTourState();
  const cue = useCurrentCue();

  if (!tour.on || !cue) {
    return (
      <button type="button" onClick={tour.show} className="mb-3 text-sm font-extrabold text-meesho">
        Show me what to tap
      </button>
    );
  }

  return (
    <div className="relative mb-4">
      <div className="rounded-[28px] bg-[#142033] px-4 py-4 text-white shadow-[0_16px_40px_rgba(20,32,51,0.28)]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-extrabold tracking-[0.14em] text-[#ffe14a] uppercase">
            Tap here · step {cue.n} of {cue.total}
          </p>
          <button type="button" onClick={tour.skip} className="shrink-0 text-sm font-extrabold text-white/70">
            Skip
          </button>
        </div>
        <div className="mt-2 flex gap-1" aria-label="Progress">
          {STEP_LABELS.map((label, index) => {
            const done = index + 1 < cue.n || cue.id === "done";
            const now = index + 1 === cue.n && cue.id !== "done";
            return (
              <div key={label} className="min-w-0 flex-1">
                <div className={`h-1.5 rounded-full ${done ? "bg-[#7dffa1]" : now ? "bg-[#ffe14a]" : "bg-white/20"}`} />
                <p className={`mt-1 truncate text-[10px] font-extrabold ${now ? "text-[#ffe14a]" : done ? "text-[#7dffa1]" : "text-white/55"}`}>{label}</p>
              </div>
            );
          })}
        </div>
        <h2 className="mt-3 text-lg leading-6 font-extrabold">{cue.title}</h2>
        <p className="mt-1 text-sm font-bold text-[#ffe14a]">{cue.where}</p>
        <p className="mt-1 text-sm leading-5 text-white/80">{cue.detail}</p>
      </div>
      <span aria-hidden className="absolute top-10 -left-2 hidden h-4 w-4 rotate-45 bg-[#142033] lg:block" />
    </div>
  );
}
