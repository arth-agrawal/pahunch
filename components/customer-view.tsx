"use client";

import { useState } from "react";
import { useDemo } from "@/components/demo-context";
import { RoleLayout } from "@/components/role-layout";
import { Alert, Button, Field, Notice, inputClass } from "@/components/ui";
import { formatINR } from "@/lib/domain/format";
import { formatStamp } from "@/lib/domain/time";

export function CustomerView() {
  const demo = useDemo();
  const selected = demo.data?.selected;
  const [open, setOpen] = useState(true);
  const [choice, setChoice] = useState("receive_today");
  const [date, setDate] = useState(demo.data?.runDates[0]?.date ?? "");
  const [name, setName] = useState("Riya Sharma");
  const [address, setAddress] = useState("House 18, Gulmohar Lane, Dewas");
  const [landmark, setLandmark] = useState("Opposite the flour mill");
  const [payer, setPayer] = useState("neighbour_cod");
  const [note, setNote] = useState("The lane name on the label does not match the PIN.");
  const [error, setError] = useState<string | null>(null);

  if (!demo.data || !selected) return <p>Loading the delivery update…</p>;
  const shipment = selected.shipment;
  const atHub = shipment.hubReceiptAt != null && shipment.phase !== "in_transit";
  const runs = demo.data.runDates;

  async function submit() {
    setError(null);
    try {
      if (choice === "receive_today") {
        await demo.act({ action: "submitReadiness", shipmentId: shipment.id, choice });
      } else if (choice === "later_day") {
        await demo.act({ action: "submitReadiness", shipmentId: shipment.id, choice, requestedDate: date || runs[0]?.date });
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The update was not saved.");
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

  return (
    <RoleLayout
      phone={
        <div className="space-y-4 p-4">
          <p className="text-sm font-semibold text-purple">Delivery update</p>
          <h1 className="text-2xl font-semibold leading-7 text-plum">
            {atHub
              ? `Your ${formatINR(shipment.amount)} COD order is at the local delivery hub.`
              : "Your order is not at the local hub yet."}
          </h1>
          {atHub ? (
            <p>Expected on the next planned delivery run. How would you like to receive it?</p>
          ) : (
            <p>Readiness opens when the parcel reaches the local delivery hub. It is not asked a day before if the parcel is still upstream.</p>
          )}
          <p className="text-sm text-muted">
            {shipment.itemName} · {shipment.id} · {shipment.hubName} hub · {selected.hubContextLabel}
          </p>
          {shipment.phase === "delivered" ? <Notice>This order is delivered. The receipt stands.</Notice> : null}
          {shipment.phase === "cancelled" ? <Notice>You cancelled this order. Pahunch will not ask again.</Notice> : null}
          {selected.shipment.laterConfirmed && selected.shipment.scheduledDate ? (
            <Notice>The hub confirmed {selected.readinessLabel}. The parcel stays at the hub until that run. This is not a completed delivery.</Notice>
          ) : null}
          {atHub && shipment.phase !== "delivered" && shipment.phase !== "cancelled" ? (
            <>
              {!open ? <Button onClick={() => setOpen(true)}>Open readiness</Button> : null}
              {open ? (
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold">Choose one</legend>
                  <Choice id="receive_today" current={choice} onSelect={setChoice} title="Receive today" body="You are available for the planned run. This does not promise an exact time slot." />
                  <Choice id="later_day" current={choice} onSelect={setChoice} title="Request another day" body="Ask for an illustrative planned run. The hub confirms before the parcel is held." />
                  <Choice id="nominate" current={choice} onSelect={setChoice} title="Nominate someone nearby" body="Name a specific person for this order only. They must agree on their own screen." />
                  {choice === "later_day" ? (
                    <Field label="Planned run">
                      <select className={inputClass} value={date || runs[0]?.date} onChange={(event) => setDate(event.target.value)}>
                        {runs.map((run) => (
                          <option key={run.date} value={run.date}>{run.label}</option>
                        ))}
                      </select>
                    </Field>
                  ) : null}
                  {choice === "nominate" ? (
                    <div className="space-y-2">
                      <Field label="Neighbour's name"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
                      <Field label="Nearby address"><input className={inputClass} value={address} onChange={(event) => setAddress(event.target.value)} /></Field>
                      <Field label="Landmark"><input className={inputClass} value={landmark} onChange={(event) => setLandmark(event.target.value)} /></Field>
                      <Field label="Who pays">
                        <select className={inputClass} value={payer} onChange={(event) => setPayer(event.target.value)}>
                          <option value="neighbour_cod">Neighbour agrees to pay COD</option>
                          <option value="buyer_prepay">I pay through the platform</option>
                        </select>
                      </Field>
                    </div>
                  ) : null}
                  <button type="button" className="text-left text-sm font-semibold text-plum" onClick={() => setChoice("address_correction")}>
                    Correct the address
                  </button>
                  <button type="button" className="text-left text-sm font-semibold text-rose" onClick={() => setChoice("cancel")}>
                    Cancel the order
                  </button>
                  {choice === "address_correction" ? (
                    <Field label="What should the hub check?">
                      <textarea className={inputClass} rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
                    </Field>
                  ) : null}
                  {choice === "cancel" ? <p className="text-sm text-rose">Cancellation revokes an alternate receiver and invalidates a current rider task.</p> : null}
                  <Button onClick={() => void submit()}>
                    {choice === "cancel" ? "Cancel this order" : "Send choice"}
                  </Button>
                </fieldset>
              ) : null}
            </>
          ) : null}
          {selected.nomination?.payerArrangement === "buyer_prepay" && shipment.phase !== "cancelled" ? (
            <div className="rounded-lg border border-gold bg-cream p-3">
              <h2 className="font-semibold">Platform payment simulator</h2>
              <p className="mt-1 text-sm">This records a server-side confirmation for {formatINR(shipment.amount)}. It is not a live payment gateway, and it does not mark the order delivered.</p>
              <Button className="mt-3" onClick={() => void pay()}>Confirm {formatINR(shipment.amount)} on the server</Button>
              {selected.payments.filter((payment) => payment.channel === "platform_prepay").map((payment) => (
                <p key={payment.id} className="mt-2 text-sm">
                  Confirmation {payment.id} · {formatINR(payment.amount)} · {payment.state} · {formatStamp(payment.createdAt)}
                </p>
              ))}
            </div>
          ) : null}
          {selected.currentTask?.recipientRole === "buyer" ? (
            <p className="rounded-lg bg-canvas p-3 text-sm">
              Demo receipt code <strong>{shipment.demoCode}</strong>. This is a demonstration code, not a production OTP.
            </p>
          ) : null}
          {error ? <Alert>{error}</Alert> : null}
          <p className="text-sm text-muted">Current choice: {selected.readinessLabel}. Revision v{shipment.revision}.</p>
        </div>
      }
      aside={
        <div>
          <h2 className="text-lg font-semibold text-plum">What this screen changes</h2>
          <p className="mt-2">
            The customer uses the delivery-update entry point. Sending a choice writes one readiness response, bumps the order revision, and invalidates an older rider task. It does not dispatch the parcel.
          </p>
          <dl className="mt-4 space-y-2">
            <Row term="Shared status" value={selected.readinessLabel} />
            <Row term="Receiver" value={selected.receiverLabel} />
            <Row term="Payer" value={selected.payerLabel} />
            <Row term="COD due" value={formatINR(selected.codDue)} />
            <Row term="Hub recommendation" value={selected.recommendation.title} />
          </dl>
          <p className="mt-4 text-muted">No response is not a refusal. A later date is not a delivery. A nomination still needs Riya&apos;s own agreement.</p>
        </div>
      }
    />
  );
}

function Choice({ id, title, body, current, onSelect }: { id: string; title: string; body: string; current: string; onSelect: (id: string) => void }) {
  const selected = current === id;
  return (
    <label className={`block rounded-lg border p-3 ${selected ? "border-plum bg-cream" : "border-line"}`}>
      <input className="mr-2" type="radio" name="readiness" checked={selected} onChange={() => onSelect(id)} />
      <span className="font-semibold">{title}</span>
      <span className="mt-1 block text-sm text-muted">{body}</span>
    </label>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-1">
      <dt className="text-muted">{term}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
