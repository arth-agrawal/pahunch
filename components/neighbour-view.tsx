"use client";

import { useState } from "react";
import { useDemo } from "@/components/demo-context";
import { RoleLayout } from "@/components/role-layout";
import { Alert, Button, Notice } from "@/components/ui";
import { formatINR } from "@/lib/domain/format";
import { formatStamp } from "@/lib/domain/time";

export function NeighbourView() {
  const demo = useDemo();
  const selected = demo.data?.selected;
  const [receive, setReceive] = useState(false);
  const [pay, setPay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!demo.data || !selected) return <p>Loading the consent request…</p>;
  const nomination = selected.nomination;
  const shipment = selected.shipment;

  async function respond(decision: "accept_receive" | "accept_receive_and_pay" | "decline") {
    setError(null);
    try {
      await demo.act({ action: "neighbourRespond", shipmentId: shipment.id, decision });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The response was not saved.");
    }
  }

  return (
    <RoleLayout
      phone={
        <div className="space-y-4 p-4">
          <p className="text-sm font-semibold text-purple">Simulated neighbour identity</p>
          <h1 className="text-2xl font-semibold leading-7 text-plum">Request to receive an order</h1>
          {!nomination ? (
            <p>No one has nominated a neighbour for {shipment.id}. Switch to the customer screen and name a specific person. A buyer checkbox is not consent.</p>
          ) : (
            <>
              <p>
                <strong>{shipment.buyerName}</strong> nominated you to receive {shipment.itemName}, order {shipment.id}.
              </p>
              <dl className="space-y-1 text-sm">
                <Line term="COD amount" value={formatINR(nomination.agreedAmount)} />
                <Line term="Run" value={nomination.agreedRun} />
                <Line term="Address" value={nomination.addressLine} />
                <Line term="Landmark" value={nomination.landmark} />
                <Line term="Consent expires" value={formatStamp(nomination.expiresAt)} />
                <Line term="Current response" value={nomination.consent.replaceAll("_", " ")} />
              </dl>
              {nomination.payerArrangement === "neighbour_cod" ? (
                <div className="rounded-lg bg-cream p-3 text-sm">
                  {shipment.buyerName} nominated you to receive this order. The rider will collect {formatINR(nomination.agreedAmount)} through the approved COD process. Are you available and willing to pay this amount?
                </div>
              ) : (
                <div className="rounded-lg bg-cream p-3 text-sm">
                  {shipment.buyerName} will pay through the platform. Please do not pay the rider once the payment is confirmed. The hub will approve handover after the required checks.
                </div>
              )}
              {shipment.phase === "delivered" ? (
                <Notice>This parcel was already handed over. Declining now routes a dispute to the hub and does not undo the delivery.</Notice>
              ) : (
                <div className="space-y-2 text-sm">
                  <label className="flex gap-2">
                    <input type="checkbox" checked={receive} onChange={(event) => setReceive(event.target.checked)} />
                    I agree to receive this parcel.
                  </label>
                  {nomination.payerArrangement === "neighbour_cod" ? (
                    <label className="flex gap-2">
                      <input type="checkbox" checked={pay} onChange={(event) => setPay(event.target.checked)} />
                      I agree to pay {formatINR(nomination.agreedAmount)} COD.
                    </label>
                  ) : null}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    if (nomination.payerArrangement === "neighbour_cod" && receive && pay) {
                      void respond("accept_receive_and_pay");
                      return;
                    }
                    if (receive) {
                      void respond("accept_receive");
                      return;
                    }
                    setError("Tick the agreement you are actually giving. Receive-only consent does not become payment consent.");
                  }}
                >
                  Submit agreement
                </Button>
                <Button variant="danger" onClick={() => void respond("decline")}>Decline</Button>
              </div>
              <p className="rounded-lg bg-canvas p-3 text-sm">
                Demo receipt code <strong>{shipment.demoCode}</strong>. Show this to the rider in the walkthrough. It is not a production OTP.
              </p>
            </>
          )}
          {error ? <Alert>{error}</Alert> : null}
        </div>
      }
      aside={
        <div>
          <h2 className="text-lg font-semibold text-plum">Separate consent</h2>
          <p className="mt-2">
            This actor is not the buyer. Agreeing here updates the hub queue immediately. If you agree only to receive a COD order, dispatch stays blocked until you also accept the amount.
          </p>
          <p className="mt-3">Hub recommendation: {selected.recommendation.title}. {selected.recommendation.reason}</p>
          <p className="mt-3 text-muted">A declined neighbour is not put into an automated retry loop. Consent is for this order and this run.</p>
        </div>
      }
    />
  );
}

function Line({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{term}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
