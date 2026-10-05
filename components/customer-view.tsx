"use client";

import { useEffect, useState } from "react";
import { MeeshoScreen, OrdersTabBar, ProductShot } from "@/components/brand";
import { tourRing, useHighlight } from "@/components/coach";
import { useDemo } from "@/components/demo-context";
import { Alert, Button, inputClass } from "@/components/ui";
import { formatINR } from "@/lib/domain/format";
import type { PayerArrangement } from "@/lib/domain/types";

export function CustomerView() {
  const demo = useDemo();
  const selected = demo.data?.selected;
  const [screen, setScreen] = useState<"orders" | "detail">("detail");
  const [editing, setEditing] = useState(true);
  const [choice, setChoice] = useState("nominate");
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [payer, setPayer] = useState<PayerArrangement>("neighbour_cod");
  const [note, setNote] = useState("The lane on the label does not match this PIN.");
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shipmentId = selected?.shipment.id;
  const readinessId = selected?.readiness?.id;

  useEffect(() => {
    if (!selected) return;
    const asha = selected.shipment.id === "PH-2401";
    setName(asha ? "Riya Sharma" : "");
    setAddress(asha ? "House 18, Gulmohar Lane, Dewas" : "");
    setLandmark(asha ? "Opposite the flour mill" : "");
    setChoice(selected.readiness?.choice ?? (asha ? "nominate" : "receive_today"));
    setDate(selected.readiness?.requestedDate ?? demo.data?.runDates[0]?.date ?? "");
    setPayer(selected.readiness?.payerArrangement ?? "neighbour_cod");
    setEditing(!selected.readiness);
    setScreen("detail");
    setError(null);
    // Reset the form when the order or the saved answer changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentId, readinessId]);

  const pulseSave = useHighlight("save");

  if (!demo.data || !selected) return <p className="p-6">Opening your orders…</p>;

  const shipment = selected.shipment;
  const runs = demo.data.runDates;
  const atHub = shipment.hubReceiptAt != null && shipment.phase !== "in_transit";
  const closed = shipment.phase === "delivered" || shipment.phase === "cancelled";
  const seller = selected.supplierProfile.name.split("·")[0]?.trim() || "Supplier";
  const showForm = atHub && !closed && editing;

  async function submit() {
    setError(null);
    try {
      if (choice === "receive_today") {
        await demo.act({ action: "submitReadiness", shipmentId: shipment.id, choice });
      } else if (choice === "later_day") {
        await demo.act({
          action: "submitReadiness",
          shipmentId: shipment.id,
          choice,
          requestedDate: date || runs[0]?.date,
        });
      } else if (choice === "nominate") {
        await demo.act({
          action: "submitReadiness",
          shipmentId: shipment.id,
          choice,
          neighbourName: name,
          neighbourAddress: address,
          neighbourLandmark: landmark,
          payer,
        });
      } else if (choice === "address_correction") {
        await demo.act({ action: "submitReadiness", shipmentId: shipment.id, choice, note });
      } else {
        await demo.act({ action: "submitReadiness", shipmentId: shipment.id, choice: "cancel" });
      }
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That update was not saved.");
    }
  }

  async function pay() {
    setError(null);
    try {
      await demo.act({
        action: "simulatePrepay",
        shipmentId: shipment.id,
        idempotencyKey: `prepay-${shipment.id}-${crypto.randomUUID()}`,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Payment was not confirmed.");
    }
  }

  const prepayDue =
    selected.nomination?.payerArrangement === "buyer_prepay" &&
    shipment.phase !== "cancelled" &&
    !selected.payments.some((payment) => payment.channel === "platform_prepay");

  return (
    <MeeshoScreen
      title={screen === "orders" ? "" : "Order details"}
      onBack={screen === "detail" ? () => setScreen("orders") : undefined}
      footer={
        screen === "detail" && showForm ? (
          <Button className={`w-full rounded-md py-3 text-base ${tourRing(pulseSave)}`} variant={choice === "cancel" ? "danger" : "primary"} onClick={() => void submit()}>
            {choice === "cancel" ? "Cancel this order" : "Save"}
          </Button>
        ) : null
      }
    >
      {screen === "orders" ? (
        <div className="bg-white">
          <div className="flex gap-6 border-b border-line px-4 text-sm font-extrabold">
            <span className="border-b-2 border-meesho py-3 text-meesho">All</span>
            <span className="py-3 text-muted">Delivered</span>
            <span className="py-3 text-muted">Cancelled</span>
          </div>
          <button type="button" className="flex w-full gap-3 px-4 py-4 text-left" onClick={() => setScreen("detail")}>
            <ProductShot id={shipment.id} name={shipment.itemName} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold leading-5">{shipment.itemName}</span>
              <span className="mt-1 block text-sm text-muted">{formatINR(shipment.amount)} · Cash on delivery</span>
              <span className="mt-2 inline-block rounded bg-cream px-2 py-0.5 text-xs font-extrabold text-meesho">
                {closed ? selected.readinessLabel : "Action needed"}
              </span>
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-2 pb-4">
          <section className="flex gap-3 bg-white px-4 py-4">
            <ProductShot id={shipment.id} name={shipment.itemName} />
            <div className="min-w-0">
              <h1 className="text-[15px] leading-5 font-extrabold">{shipment.itemName}</h1>
              <p className="mt-1 text-sm text-muted">Sold by {seller}</p>
              <p className="mt-1 text-sm font-extrabold">{formatINR(shipment.amount)} · Qty 1</p>
              <p className="mt-1 text-xs font-bold text-gold">Cash on delivery · {formatINR(selected.codDue)} due</p>
            </div>
          </section>

          {!atHub && !closed ? (
            <section className="bg-white px-4 py-4 text-sm">
              This question opens when the parcel is at the {shipment.hubName} hub. It is not asked a day early while the parcel is still upstream.
            </section>
          ) : null}

          {atHub && !closed && !editing && selected.readiness ? (
            <StatusCard
              buyer={shipment.buyerName.split(" ")[0] || shipment.buyerName}
              label={selected.readinessLabel}
              receiver={selected.receiverLabel}
              payer={selected.payerLabel}
              code={selected.currentTask?.recipientRole === "buyer" ? shipment.demoCode : null}
              onChange={() => setEditing(true)}
            />
          ) : null}

          {showForm ? (
            <section className="border-l-4 border-meesho bg-white">
              <div className="flex items-center justify-between px-4 pt-4">
                <h2 className="text-base font-extrabold">Will you take this today?</h2>
                <span className="rounded bg-meesho px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white uppercase">New</span>
              </div>
              <p className="px-4 pt-1 pb-3 text-sm leading-5 text-muted">
                Today&apos;s run from {shipment.hubName} can still carry it. If you don&apos;t answer, we attempt your address as usual.
              </p>
              <Option
                selected={choice === "receive_today"}
                title="I'll be home"
                body={`Same address. Keep ${formatINR(shipment.amount)} ready. No exact time slot.`}
                onSelect={() => setChoice("receive_today")}
              />
              <Option
                selected={choice === "later_day"}
                title="Send it on another run"
                body="The hub has to confirm. Until then it is not delivered, and it is not a failed attempt."
                onSelect={() => setChoice("later_day")}
              />
              {choice === "later_day" ? (
                <div className="flex gap-2 px-4 pb-3">
                  {runs.map((run) => (
                    <button
                      key={run.date}
                      type="button"
                      onClick={() => setDate(run.date)}
                      className={`rounded-full border px-3 py-2 text-sm font-bold ${
                        (date || runs[0]?.date) === run.date ? "border-meesho bg-cream text-meesho" : "border-line"
                      }`}
                    >
                      {run.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <Option
                selected={choice === "nominate"}
                title="Someone nearby can take it"
                body="They get their own request. You cannot accept for them."
                onSelect={() => setChoice("nominate")}
              />
              {choice === "nominate" ? (
                <div className="space-y-3 px-4 pb-4">
                  <label className="block text-xs font-extrabold text-muted">
                    Their name
                    <input className={`${inputClass} mt-1`} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
                  </label>
                  <label className="block text-xs font-extrabold text-muted">
                    Where the rider should stop
                    <input className={`${inputClass} mt-1`} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="House and lane" />
                  </label>
                  <label className="block text-xs font-extrabold text-muted">
                    Landmark
                    <input className={`${inputClass} mt-1`} value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="A gate, a shop, a colour" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <PayChip
                      selected={payer === "neighbour_cod"}
                      title="They pay cash"
                      body={formatINR(shipment.amount)}
                      onSelect={() => setPayer("neighbour_cod")}
                    />
                    <PayChip
                      selected={payer === "buyer_prepay"}
                      title="I'll pay in the app"
                      body="Rider collects ₹0"
                      onSelect={() => setPayer("buyer_prepay")}
                    />
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                className="w-full border-t border-line px-4 py-3 text-left text-sm font-bold"
                onClick={() => setMore((open) => !open)}
              >
                Address looks wrong, or I don&apos;t want it
              </button>
              {more ? (
                <div className="space-y-2 px-4 pb-4">
                  <button type="button" className="text-sm font-extrabold text-meesho" onClick={() => setChoice("address_correction")}>
                    Ask the hub to check the address
                  </button>
                  <button type="button" className="block text-sm font-extrabold text-rose" onClick={() => setChoice("cancel")}>
                    Cancel the order
                  </button>
                  {choice === "address_correction" ? (
                    <textarea className={inputClass} rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
                  ) : null}
                  {choice === "cancel" ? (
                    <p className="text-sm text-rose">This pulls the parcel off the run and drops a neighbour request.</p>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {prepayDue ? (
            <section className="bg-white px-4 py-4">
              <p className="text-xs font-extrabold tracking-wide text-muted uppercase">Pay now</p>
              <p className="mt-1 text-2xl font-black">{formatINR(shipment.amount)}</p>
              <p className="mt-1 text-sm text-muted">Recorded on this demo only. The order is not delivered until the rider hands it over.</p>
              <div className="mt-3 rounded-md border border-meesho bg-cream px-3 py-3 text-sm font-bold">UPI · this phone</div>
              <Button className="mt-3 w-full" onClick={() => void pay()}>
                Pay {formatINR(shipment.amount)}
              </Button>
            </section>
          ) : null}

          <section className="bg-white px-4 py-3">
            <p className="text-xs font-extrabold tracking-wide text-muted uppercase">Deliver to</p>
            <p className="mt-1 text-sm font-extrabold">{shipment.buyerName}</p>
            <p className="text-sm leading-5 text-ink">
              {shipment.addressLine}, {shipment.pin}
            </p>
            <p className="text-sm text-muted">{shipment.landmark}</p>
          </section>

          <section className="bg-white px-4 py-4">
            <ol className="space-y-3 text-sm">
              <Track done label="Order placed" detail={`${shipment.id} · ${shipment.hubName}`} />
              <Track done={atHub} label={`Reached ${shipment.hubName} hub`} detail="Scanned in this morning. Not on a bike yet." />
              <Track
                done={shipment.phase === "dispatched" || shipment.phase === "delivered"}
                current={shipment.phase === "at_hub" || shipment.phase === "held" || shipment.phase === "scheduled_later"}
                label={shipment.phase === "delivered" ? "Handed over" : "Before the rider leaves"}
                detail={selected.readinessLabel}
              />
            </ol>
          </section>

          {shipment.phase === "delivered" ? (
            <section className="bg-white px-4 py-4">
              <p className="text-base font-extrabold text-teal">Delivered to {selected.receipt?.recipientName}</p>
              <p className="mt-1 text-sm">The receipt stands. Cash collected on this order is not collected again.</p>
            </section>
          ) : null}
          {shipment.phase === "cancelled" ? (
            <section className="bg-white px-4 py-4">
              <p className="text-base font-extrabold text-rose">You cancelled this order</p>
              <p className="mt-1 text-sm">We will not ask again. If cash was already taken, the hub reconciles it. The parcel is not marked delivered.</p>
            </section>
          ) : null}

          {selected.shipment.laterConfirmed && selected.shipment.scheduledDate ? (
            <p className="mx-4 rounded-md bg-white px-3 py-3 text-sm">
              {shipment.hubName} confirmed the later run. The parcel stays at the hub. That is not a delivery.
            </p>
          ) : null}
          {error ? (
            <div className="px-4">
              <Alert>{error}</Alert>
            </div>
          ) : null}
          <p className="px-4 pt-2 text-center text-sm font-bold text-meesho">Need help with this order?</p>
        </div>
      )}
      {screen === "orders" ? (
        <div className="sticky bottom-0">
          <OrdersTabBar />
        </div>
      ) : null}
    </MeeshoScreen>
  );
}

function StatusCard({
  buyer,
  label,
  receiver,
  payer,
  code,
  onChange,
}: {
  buyer: string;
  label: string;
  receiver: string;
  payer: string;
  code: string | null;
  onChange: () => void;
}) {
  return (
    <section className="border-l-4 border-meesho bg-white px-4 py-4">
      <p className="text-xs font-extrabold tracking-wide text-meesho uppercase">Saved on this order</p>
      <p className="mt-1 text-base font-extrabold">{label}</p>
      <p className="mt-1 text-sm text-muted">
        Receiver {receiver}. {payer}.
      </p>
      {code ? (
        <p className="mt-3 text-sm">
          Show the rider <strong className="text-lg tracking-[0.2em]">{code}</strong>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">{buyer}&apos;s answer does not by itself put the parcel on the bike.</p>
      )}
      <button type="button" className="mt-3 text-sm font-extrabold text-meesho" onClick={onChange}>
        Change this
      </button>
    </section>
  );
}

function Option({
  selected,
  title,
  body,
  onSelect,
}: {
  selected: boolean;
  title: string;
  body: string;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 border-t border-line px-4 py-3 text-left">
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-meesho" : "border-[#c8c8c8]"}`}>
        {selected ? <span className="h-2.5 w-2.5 rounded-full bg-meesho" /> : null}
      </span>
      <span>
        <span className="block text-sm font-extrabold">{title}</span>
        <span className="mt-0.5 block text-sm leading-5 text-muted">{body}</span>
      </span>
    </button>
  );
}

function PayChip({
  selected,
  title,
  body,
  onSelect,
}: {
  selected: boolean;
  title: string;
  body: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-md border px-2 py-2 text-left ${selected ? "border-meesho bg-cream" : "border-line bg-white"}`}
    >
      <span className="block text-sm font-extrabold">{title}</span>
      <span className="text-xs text-muted">{body}</span>
    </button>
  );
}

function Track({
  done,
  current = false,
  label,
  detail,
}: {
  done?: boolean;
  current?: boolean;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex gap-3">
      <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${done ? "bg-teal" : current ? "bg-meesho" : "bg-[#ddd]"}`} />
      <span>
        <span className="block font-extrabold">{label}</span>
        <span className="text-muted">{detail}</span>
      </span>
    </li>
  );
}
