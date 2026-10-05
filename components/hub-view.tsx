"use client";

import { useState } from "react";
import Link from "next/link";
import { TapCloud, tourRing, useHighlight } from "@/components/coach";
import { useDemo } from "@/components/demo-context";
import { riderLabel } from "@/components/story";
import { Alert, Button, Field, inputClass } from "@/components/ui";
import { CountBar, Lifecycle, RouteDiagram, Timeline } from "@/components/visuals";
import { formatINR, formatRate } from "@/lib/domain/format";
import { QUEUE_FILTERS } from "@/lib/domain/order-state";
import type { QueueKey } from "@/lib/domain/types";

const SCENARIOS = [
  { id: "neighbour_cod", title: "Neighbour COD", detail: "Reset Saanvi to readiness pending. You still nominate and collect consent." },
  { id: "buyer_prepay", title: "Buyer prepayment", detail: "Reset Saanvi. No platform payment is confirmed until you run the simulator." },
  { id: "nominee_decline", title: "Nominee decline", detail: "Saanvi has named someone nearby. They have not responded." },
  { id: "stale_task", title: "Stale task", detail: "Dev has a current rider task. The order is not cancelled." },
  { id: "no_response", title: "No response", detail: "Pooja is a new buyer. The prompt is delivered and ordinary service remains." },
  { id: "address_repair", title: "Address repair", detail: "Meera's PIN and locality conflict is still unresolved." },
];

export function HubView() {
  const demo = useDemo();
  const [filter, setFilter] = useState<"all" | QueueKey>("all");
  const [error, setError] = useState<string | null>(null);
  const [meters, setMeters] = useState("");
  const [minutes, setMinutes] = useState("");
  const [capMeters, setCapMeters] = useState("");
  const [capMinutes, setCapMinutes] = useState("");
  const [repairNote, setRepairNote] = useState("Caller confirmed the Powai locality. Manual hub note only.");
  const [parcelNote, setParcelNote] = useState("Outer pack inspected at the hub.");
  const [cause, setCause] = useState("supplier");
  const pulseApprove = useHighlight("approve");
  const data = demo.data;
  const selected = data?.selected ?? null;

  async function run(body: Record<string, unknown>) {
    setError(null);
    try {
      await demo.act(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The hub rejected that action.");
    }
  }

  if (!data || !selected) return <p>Loading the hub queue…</p>;

  const visible = data.orders.filter((order) => filter === "all" || order.queue === filter);
  const decisions = data.orders.filter((order) =>
    ["nominee_pending", "date_requested", "hub_review", "ready_for_dispatch"].includes(order.queue),
  ).length;
  const dispatched = data.orders.filter((order) => order.queue === "dispatched").length;
  const delivered = data.orders.filter((order) => order.queue === "delivered").length;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-white px-4 py-3">
        <p className="text-xs font-extrabold tracking-wide text-meesho uppercase">Local hub portal · {selected.shipment.hubName}</p>
        <h1 className="text-lg font-extrabold">What leaves this hub today</h1>
        <p className="mt-1 text-sm text-muted">
          {selected.shipment.buyerName}&apos;s {selected.shipment.itemName.toLowerCase()} is the open ticket. The other rows are what this portal actually gets: a later run, a bad address, a torn pack, a new buyer who never replied, a cancel after the rider already has a task.
        </p>
      </section>
      <SimpleRelease selected={selected} onRun={(body) => void run(body)} error={error} />
      <details className="rounded-xl border border-line bg-white p-4">
        <summary className="cursor-pointer text-sm font-extrabold">Everything else in the portal</summary>
        <div className="mt-4 space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Open parcels" value={String(data.metrics.openParcels)} />
        <Metric label="Needs a decision" value={String(decisions)} />
        <Metric label="Current rider tasks" value={String(dispatched)} />
        <Metric label="Delivered in this demo" value={String(delivered)} />
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="font-semibold text-plum">Demo preparation</h2>
        <p className="mt-1 text-sm text-muted">These cards set a starting point. They do not complete the outcome.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className="rounded-lg border border-line px-3 py-2 text-left hover:bg-cream"
              onClick={() => void run({ action: "applyScenario", scenario: scenario.id })}
            >
              <div className="text-sm font-semibold text-plum">{scenario.title}</div>
              <div className="text-sm text-muted">{scenario.detail}</div>
            </button>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <section className="min-w-0 rounded-xl border border-line bg-white xl:col-span-2">
          <div className="flex flex-wrap gap-2 border-b border-line p-3">
            {QUEUE_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${filter === item.id ? "bg-plum text-white" : "bg-canvas text-ink"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  {["Order", "Buyer", "Hub", "COD", "Readiness", "Receiver / payer", "Exception", "Task"].map((heading) => (
                    <th key={heading} className="px-3 py-2 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => demo.setOrderId(order.id)}
                    className={`cursor-pointer border-t border-line ${order.id === selected.shipment.id ? "bg-cream" : "hover:bg-canvas"}`}
                  >
                    <td className="px-3 py-2 font-semibold">{order.id}</td>
                    <td className="px-3 py-2">{order.buyerName}</td>
                    <td className="px-3 py-2">{order.hubName}<div className="text-muted">{order.hubContextLabel}</div></td>
                    <td className="px-3 py-2">{formatINR(order.amount)}</td>
                    <td className="px-3 py-2">{order.readinessLabel}</td>
                    <td className="px-3 py-2">{order.receiverLabel}<div className="text-muted">{order.payerLabel}</div></td>
                    <td className="px-3 py-2">{order.exceptionLabel ?? "—"}</td>
                    <td className="px-3 py-2">{order.taskLabel}</td>
                  </tr>
                ))}
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-muted">No orders in this filter.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-3 rounded-xl border border-line bg-white p-4">
          <div className={`rounded-lg border-l-4 px-3 py-3 ${selected.recommendation.tone === "rose" ? "border-rose bg-white" : selected.recommendation.tone === "teal" ? "border-teal bg-white" : "border-gold bg-cream"}`}>
            <h2 className="font-semibold text-plum">{selected.recommendation.title}</h2>
            <p className="mt-1 text-sm">{selected.recommendation.reason}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-plum">Neighbour approval checklist</h3>
            <ul className="mt-2 space-y-2">
              {selected.checks.map((check) => (
                <li key={check.id} className="text-sm">
                  <span className={check.pass ? "font-semibold text-teal" : "font-semibold text-rose"}>
                    {check.pass ? "Pass" : "Blocked"}
                  </span>
                  <span className="mx-1">·</span>
                  {check.label}
                  <div className="text-muted">{check.detail}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-canvas p-3 text-sm">
            <h3 className="font-semibold text-plum">Rider will receive</h3>
            <p className="mt-1">{selected.riderPreview.recipient} · {selected.riderPreview.role}</p>
            <p>{selected.riderPreview.address}</p>
            <p className="text-muted">{selected.riderPreview.landmark}</p>
            <p className="mt-1">{selected.riderPreview.payer}</p>
            <p className="text-lg font-semibold">COD due {formatINR(selected.riderPreview.codDue)}</p>
            <p>Task version on the next issue: v{selected.riderPreview.version}</p>
          </div>
          {error ? <Alert>{error}</Alert> : null}
          <div className="flex flex-col gap-2">
            <Button className={tourRing(pulseApprove)} onClick={() => void run({ action: "approveNeighbour", shipmentId: selected.shipment.id })}>
              Approve neighbour dispatch
            </Button>
            {!selected.checksPass ? <p className="text-sm text-muted">Approval stays blocked until every applicable check passes. The server enforces the same list.</p> : null}
            <Button
              variant="ghost"
              onClick={() => void run({ action: "issueNormal", shipmentId: selected.shipment.id })}
            >
              Issue normal buyer delivery
            </Button>
            {selected.normalBlockReason ? <p className="text-sm text-muted">{selected.normalBlockReason}</p> : null}
            {selected.restoreAvailable ? (
              <Button variant="gold" onClick={() => void run({ action: "restoreNormal", shipmentId: selected.shipment.id })}>
                Restore normal buyer delivery
              </Button>
            ) : null}
            {selected.readiness?.choice === "later_day" && !selected.shipment.laterConfirmed && !selected.shipment.laterDeclined ? (
              <div className="flex gap-2">
                <Button variant="gold" onClick={() => void run({ action: "confirmLaterRun", shipmentId: selected.shipment.id, accept: true })}>
                  Confirm later run
                </Button>
                <Button variant="ghost" onClick={() => void run({ action: "confirmLaterRun", shipmentId: selected.shipment.id, accept: false })}>
                  Decline date
                </Button>
              </div>
            ) : null}
            {selected.shipment.instructionStale ? (
              <Button variant="gold" onClick={() => void run({ action: "refreshTask", shipmentId: selected.shipment.id })}>
                Refresh rider instruction
              </Button>
            ) : null}
          </div>
          {selected.shipment.addressException ? (
            <Field label="Destination repair note">
              <textarea className={inputClass} value={repairNote} onChange={(event) => setRepairNote(event.target.value)} rows={3} />
              <Button className="mt-2" variant="ghost" onClick={() => void run({ action: "addressRepair", shipmentId: selected.shipment.id, note: repairNote })}>
                Record address repair
              </Button>
            </Field>
          ) : null}
          {selected.shipment.parcelException ? (
            <div className="space-y-2">
              <Field label="Parcel cause">
                <select className={inputClass} value={cause} onChange={(event) => setCause(event.target.value)}>
                  <option value="supplier">Supplier / SKU quality</option>
                  <option value="logistics">Logistics</option>
                  <option value="unresolved">Unresolved review</option>
                </select>
              </Field>
              <Field label="Inspection note">
                <textarea className={inputClass} rows={2} value={parcelNote} onChange={(event) => setParcelNote(event.target.value)} />
              </Field>
              <Button variant="ghost" onClick={() => void run({ action: "parcelInspection", shipmentId: selected.shipment.id, cause, note: parcelNote })}>
                Record parcel inspection
              </Button>
            </div>
          ) : null}
        </aside>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-4">
          <h2 className="font-semibold text-plum">Route feasibility</h2>
          <p className="mt-1 text-sm text-muted">
            Schematic added travel versus the original path. Proposed dense-lane caps are {data.caps.meters} m and {data.caps.minutes} min. They are not a universal standard. Straight-line distance is not used.
          </p>
          <div className="mt-3">
            <RouteDiagram
              buyer={selected.shipment.buyerName}
              neighbour={selected.nomination?.recipientName ?? "Neighbour"}
              addedMeters={selected.shipment.routeAddedM}
              addedMinutes={selected.shipment.routeAddedMin}
              capMeters={data.caps.meters}
              capMinutes={data.caps.minutes}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => void run({ action: "setRoute", shipmentId: selected.shipment.id, addedMeters: 40, addedMinutes: 1 })}>
              Use 40 m / 1 min
            </Button>
            <Button variant="ghost" onClick={() => void run({ action: "setRoute", shipmentId: selected.shipment.id, addedMeters: 180, addedMinutes: 4 })}>
              Use 180 m / 4 min
            </Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Field label="Added metres">
              <input className={inputClass} value={meters} placeholder={String(selected.shipment.routeAddedM)} onChange={(event) => setMeters(event.target.value)} />
            </Field>
            <Field label="Added minutes">
              <input className={inputClass} value={minutes} placeholder={String(selected.shipment.routeAddedMin)} onChange={(event) => setMinutes(event.target.value)} />
            </Field>
          </div>
          <Button
            className="mt-2"
            variant="ghost"
            onClick={() =>
              void run({
                action: "setRoute",
                shipmentId: selected.shipment.id,
                addedMeters: Number(meters || selected.shipment.routeAddedM),
                addedMinutes: Number(minutes || selected.shipment.routeAddedMin),
              })
            }
          >
            Save route scenario
          </Button>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Field label="Cap, metres" hint="Proposed pilot cap">
              <input className={inputClass} value={capMeters} placeholder={String(data.caps.meters)} onChange={(event) => setCapMeters(event.target.value)} />
            </Field>
            <Field label="Cap, minutes">
              <input className={inputClass} value={capMinutes} placeholder={String(data.caps.minutes)} onChange={(event) => setCapMinutes(event.target.value)} />
            </Field>
          </div>
          <Button
            className="mt-2"
            variant="ghost"
            onClick={() =>
              void run({
                action: "setCaps",
                meters: Number(capMeters || data.caps.meters),
                minutes: Number(capMinutes || data.caps.minutes),
              })
            }
          >
            Save proposed caps
          </Button>
        </div>
        <div className="space-y-4">
          <ProfileCard selected={selected} />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="font-semibold text-plum">Shipment lifecycle</h2>
        <div className="mt-3">
          <Lifecycle steps={selected.lifecycle} />
        </div>
        <h3 className="mt-5 font-semibold text-plum">Event timeline</h3>
        <div className="mt-3">
          <Timeline events={selected.events} />
        </div>
      </section>
        </div>
      </details>
    </div>
  );
}

function SimpleRelease({
  selected,
  onRun,
  error,
}: {
  selected: NonNullable<NonNullable<ReturnType<typeof useDemo>["data"]>["selected"]>;
  onRun: (body: Record<string, unknown>) => void;
  error: string | null;
}) {
  const shipment = selected.shipment;
  const buyer = shipment.buyerName.split(" ")[0] || shipment.buyerName;
  const pulse = useHighlight("approve");
  const later = selected.readiness?.choice === "later_day" && !shipment.laterConfirmed && !shipment.laterDeclined;
  const home =
    selected.readiness?.choice === "receive_today" &&
    !selected.currentTask &&
    shipment.phase !== "delivered" &&
    shipment.phase !== "cancelled";
  const neighbourReady = Boolean(
    selected.nomination && selected.checksPass && !selected.currentTask && shipment.phase !== "delivered" && shipment.phase !== "cancelled",
  );
  const riding = Boolean(selected.currentTask && shipment.phase !== "delivered" && shipment.phase !== "cancelled");

  let line = selected.recommendation.reason;
  if (shipment.phase === "delivered") line = `Handed to ${selected.receipt?.recipientName ?? "the receiver"}. Nothing else to press.`;
  else if (later) line = `${buyer} asked for another run. Confirming keeps the parcel at the hub. It is not delivered.`;
  else if (neighbourReady) line = `${selected.nomination?.recipientName ?? "They"} said yes. Send ${riderLabel(selected.shipment.hubName)}. Collect ${formatINR(selected.codDue)}.`;
  else if (home) line = `${buyer} will take it at her own address. The rider collects ${formatINR(selected.codDue)} from her.`;
  else if (riding) line = "The rider already has this stop. Open their phone.";
  else if (!selected.readiness) line = `${buyer} has not answered. There is nothing to release yet.`;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-meesho/15">
      <p className="text-xs font-extrabold tracking-wide text-[#142033] uppercase">Local hub portal</p>
      <h2 className="mt-1 text-xl font-extrabold">
        {buyer}&apos;s {shipment.itemName.toLowerCase()}
      </h2>
      <p className="mt-2 text-sm leading-6">{line}</p>
      {error ? (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      <div className="mt-4 max-w-sm">
        {later ? (
          <>
            <TapCloud id="approve" />
            <Button className={`w-full ${tourRing(pulse)}`} onClick={() => onRun({ action: "confirmLaterRun", shipmentId: shipment.id, accept: true })}>
              Confirm tomorrow
            </Button>
          </>
        ) : null}
        {neighbourReady ? (
          <>
            <TapCloud id="approve" />
            <Button className={`w-full ${tourRing(pulse)}`} onClick={() => onRun({ action: "approveNeighbour", shipmentId: shipment.id })}>
              Send the rider
            </Button>
          </>
        ) : null}
        {home ? (
          <>
            <TapCloud id="approve" />
            <Button className={`w-full ${tourRing(pulse)}`} onClick={() => onRun({ action: "issueNormal", shipmentId: shipment.id })}>
              Send the rider to {buyer}
            </Button>
          </>
        ) : null}
        {riding ? (
          <Link
            href={`/rider?order=${encodeURIComponent(shipment.id)}`}
            className="flex min-h-11 items-center justify-center rounded-lg bg-meesho px-3 text-sm font-extrabold text-white"
          >
            Open the rider
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="text-sm text-muted">{label}</div>
      <div className="text-2xl font-semibold text-plum">{value}</div>
    </div>
  );
}

function ProfileCard({ selected }: { selected: NonNullable<ReturnType<typeof useDemo>["data"]>["selected"] }) {
  if (!selected) return null;
  const buyer = selected.buyerInsight;
  const supplier = selected.supplierInsight;
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-plum">Profiles</h2>
        <span className="rounded-full bg-cream px-2 py-1 text-sm font-semibold text-plum">Shadow mode</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        History is context for the first pilot. Dispatch follows readiness, consent, payment and route checks. It does not deny service from these counts.
      </p>
      <h3 className="mt-4 font-semibold">{selected.buyerProfile.name}</h3>
      <p className="text-sm text-muted">{selected.buyerProfile.windowLabel}</p>
      <div className="mt-2">
        <CountBar
          parts={[
            { label: "Accepted", value: buyer.accepted, className: "bg-teal" },
            { label: "Verified buyer refusals", value: buyer.refusals, className: "bg-rose" },
            { label: "Excluded supplier, logistics or unresolved", value: buyer.excluded, className: "bg-gold" },
          ]}
        />
      </div>
      <p className="mt-2 text-sm">{buyer.headline}</p>
      {buyer.showRate && buyer.rate != null ? <p className="text-sm">Acceptance rate {formatRate(buyer.rate, 0)}</p> : null}
      <h3 className="mt-4 font-semibold">{selected.supplierProfile.name}</h3>
      <p className="text-sm text-muted">{selected.supplierProfile.windowLabel}</p>
      <p className="mt-2 text-sm">
        Wrong-item rate {supplier.wrongItems} ÷ {supplier.delivered} = {formatRate(supplier.wrongItemRate, 2)}. Packing-defect rate {supplier.packingDefects} ÷ {supplier.inspected} inspected = {formatRate(supplier.packingRate, 1)}.
      </p>
      <p className="mt-2 text-sm text-muted">
        A packing sample and the delivered-order population are different denominators. Wrong item and packing defects belong to supplier review. Transit damage, a missed visit or a wrong PIN do not enter the buyer-refusal count. Product returns after delivery are not delivery RTOs.
      </p>
    </div>
  );
}
