import type { Role } from "@/components/demo-context";
import type { OrderDetail } from "@/lib/domain/dto";

export type BeatId = "buyer" | "neighbour" | "hub" | "rider";

export type StoryBeat = {
  id: BeatId;
  role: Role;
  href: string;
  title: string;
  detail: string;
  status: "done" | "now" | "later";
};

function firstName(name: string): string {
  return name.split(" ")[0] || name;
}

export function storyBeats(order: OrderDetail): StoryBeat[] {
  const shipment = order.shipment;
  const nominated = order.readiness?.choice === "nominate" || order.nomination != null;
  const buyerDone = order.readiness != null || shipment.phase === "cancelled" || shipment.phase === "delivered";
  const consent = order.nomination?.consent;
  const neighbourDone =
    consent === "accepted_receive" ||
    consent === "accepted_receive_and_pay" ||
    consent === "declined" ||
    consent === "expired" ||
    consent === "revoked";
  const hubDone =
    shipment.phase === "dispatched" ||
    shipment.phase === "delivered" ||
    shipment.phase === "scheduled_later" ||
    shipment.laterConfirmed ||
    shipment.phase === "cancelled" ||
    order.currentTask != null;
  const riderDone = shipment.phase === "delivered" || shipment.phase === "cancelled";
  const closed = shipment.phase === "delivered" || shipment.phase === "cancelled";
  const active: BeatId | null = closed
    ? null
    : !buyerDone
      ? "buyer"
      : nominated && !neighbourDone
        ? "neighbour"
        : !hubDone
          ? "hub"
          : "rider";

  const neighbourName = firstName(order.nomination?.recipientName ?? "Neighbour");
  const buyer = firstName(shipment.buyerName);

  const beats: StoryBeat[] = [
    {
      id: "buyer",
      role: "customer",
      href: "/",
      title: `${buyer}'s Meesho`,
      detail: buyerDone ? order.readinessLabel : "Parcel is at the hub. No answer yet, so the normal attempt still stands.",
      status: active === "buyer" ? "now" : buyerDone ? "done" : "later",
    },
  ];

  if (nominated) {
    beats.push({
      id: "neighbour",
      role: "neighbour",
      href: "/neighbour",
      title: `${neighbourName}'s phone`,
      detail:
        consent === "declined"
          ? "They refused. The hub does not retry them automatically."
          : neighbourDone
            ? "They answered themselves."
            : "Their screen, not the buyer's. A checkbox on the order is not a yes.",
      status: active === "neighbour" ? "now" : neighbourDone ? "done" : "later",
    });
  }

  beats.push(
    {
      id: "hub",
      role: "hub",
      href: "/hub",
      title: `${shipment.hubName} desk`,
      detail: hubDone ? "Released, held, or closed." : "The bag is not packed until this desk says so.",
      status: active === "hub" ? "now" : hubDone ? "done" : "later",
    },
    {
      id: "rider",
      role: "rider",
      href: "/rider",
      title: "On the bike",
      detail: riderDone
        ? shipment.phase === "delivered"
          ? `Handed to ${order.receipt?.recipientName ?? "the receiver"}.`
          : "Cancelled. If cash was already taken, it stays and goes to reconciliation."
        : order.currentTask
          ? order.currentTask.paymentDue === 0
            ? "Do not collect cash. Hand the parcel over."
            : `Collect ₹${order.currentTask.paymentDue}, then confirm the handover.`
          : "No stop yet.",
      status: active === "rider" ? "now" : riderDone ? "done" : "later",
    },
  );

  return beats;
}

export function continueStory(order: OrderDetail, role: Role): { href: string; label: string } | null {
  const live = storyBeats(order).find((beat) => beat.status === "now");
  const query = `order=${encodeURIComponent(order.shipment.id)}`;
  if (!live) {
    if (role === "pilot") return null;
    return { href: `/pilot?${query}`, label: "See what this morning is worth" };
  }
  if (live.role === role) return null;
  return { href: `${live.href}?${query}`, label: `Open ${live.title}` };
}

export function holdingLine(role: Role, order: OrderDetail): string {
  const buyer = firstName(order.shipment.buyerName);
  if (role === "customer") {
    return `You are holding ${buyer}'s phone. The order screen is the one she already has. The pink card is the new step.`;
  }
  if (role === "neighbour") {
    const name = firstName(order.nomination?.recipientName ?? "the neighbour");
    return `You are holding ${name}'s phone. ${buyer} cannot accept for them.`;
  }
  if (role === "rider") {
    return "You are on the partner app. Collecting cash and handing the parcel are two separate taps.";
  }
  if (role === "hub") {
    return `${order.shipment.hubName} desk, same morning. The phone screens write into this queue.`;
  }
  return "The six orders you can play, counted once. This is a scenario, not a measured saving.";
}
