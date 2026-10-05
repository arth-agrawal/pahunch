"use client";

import { useState } from "react";
import { MeeshoScreen, ProductShot } from "@/components/brand";
import { TapCloud, tourRing, useHighlight } from "@/components/coach";
import { useDemo } from "@/components/demo-context";
import { Alert } from "@/components/ui";
import { formatINR } from "@/lib/domain/format";
import { formatStamp } from "@/lib/domain/time";

export function NeighbourView() {
  const demo = useDemo();
  const selected = demo.data?.selected;
  const [error, setError] = useState<string | null>(null);
  const pulseYes = useHighlight("yes-pay");

  if (!demo.data || !selected) return <p className="p-6">Opening the request…</p>;
  const nomination = selected.nomination;
  const shipment = selected.shipment;
  const who = nomination?.recipientName.split(" ")[0] ?? "there";
  const settled =
    nomination &&
    nomination.consent !== "pending" &&
    shipment.phase !== "delivered";

  async function respond(decision: "accept_receive" | "accept_receive_and_pay" | "decline") {
    setError(null);
    try {
      await demo.act({ action: "neighbourRespond", shipmentId: shipment.id, decision });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That answer was not saved.");
    }
  }

  return (
    <MeeshoScreen title="Requests">
      <div className="space-y-2 pb-6">
        <p className="bg-white px-4 py-3 text-sm text-muted">Hi {who}. This is only for one parcel, and only until tonight.</p>
        {!nomination ? (
          <section className="bg-white px-4 py-6">
            <h1 className="text-lg font-extrabold">Nothing is waiting</h1>
            <p className="mt-2 text-sm leading-5">
              {shipment.buyerName} has not named anyone for {shipment.itemName}. A note on their order is not a request to you.
            </p>
          </section>
        ) : (
          <section className="bg-white">
            <div className="px-4 pt-4">
              <p className="text-xs font-extrabold tracking-wide text-meesho uppercase">From {shipment.buyerName}</p>
              <h1 className="mt-1 text-xl leading-6 font-extrabold">Can you take this Meesho order?</h1>
            </div>
            <div className="mt-3 flex gap-3 px-4">
              <ProductShot id={shipment.id} name={shipment.itemName} />
              <div>
                <p className="text-sm font-extrabold">{shipment.itemName}</p>
                <p className="text-sm text-muted">{shipment.id}</p>
                <p className="text-sm text-muted">{nomination.agreedRun}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 px-4 text-sm">
              <p>
                <span className="font-extrabold">Stop </span>
                {nomination.addressLine}
              </p>
              <p className="text-muted">{nomination.landmark}</p>
              <p className="text-muted">This request ends {formatStamp(nomination.expiresAt)}.</p>
            </div>
            {nomination.payerArrangement === "neighbour_cod" ? (
              <div className="mx-4 mt-4 rounded-md bg-cream px-3 py-3">
                <p className="text-xs font-extrabold tracking-wide text-meesho uppercase">Cash the rider will ask for</p>
                <p className="text-3xl font-black">{formatINR(nomination.agreedAmount)}</p>
                <p className="mt-1 text-sm">Only if you agree to pay it. Receiving the parcel is not the same as paying.</p>
              </div>
            ) : (
              <div className="mx-4 mt-4 rounded-md bg-[#eef8f1] px-3 py-3 text-sm">
                <p className="font-extrabold text-teal">{shipment.buyerName.split(" ")[0]} is paying in the app.</p>
                <p className="mt-1">Do not hand the rider any cash, even if they ask. Due on this stop is {formatINR(selected.codDue)}.</p>
              </div>
            )}

            {shipment.phase === "delivered" ? (
              <p className="px-4 py-4 text-sm">
                This parcel was already handed over. Saying no now opens a dispute at the hub. It does not undo the delivery.
              </p>
            ) : settled ? (
              <div className="px-4 py-4">
                <p className="text-base font-extrabold">
                  {nomination.consent === "accepted_receive_and_pay"
                    ? `You agreed to receive it and pay ${formatINR(nomination.agreedAmount)}.`
                    : nomination.consent === "accepted_receive"
                      ? "You agreed to receive it. You did not agree to pay."
                      : nomination.consent === "declined"
                        ? "You said no. They are not asked again on a loop."
                        : `This request is ${nomination.consent.replaceAll("_", " ")}.`}
                </p>
                {nomination.consent === "accepted_receive" && nomination.payerArrangement === "neighbour_cod" ? (
                  <p className="mt-2 text-sm text-rose">The hub still cannot send the rider for cash. Pay, or they keep the parcel.</p>
                ) : null}
                {nomination.consent === "accepted_receive" || nomination.consent === "accepted_receive_and_pay" ? (
                  <p className="mt-3 text-sm">
                    When the rider arrives, show <strong className="text-2xl tracking-[0.18em]">{shipment.demoCode}</strong>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2 px-4 py-4">
                <TapCloud id="yes-pay" />
                {nomination.payerArrangement === "neighbour_cod" ? (
                  <button
                    type="button"
                    className={`w-full rounded-md bg-meesho px-3 py-3 text-sm font-extrabold text-white ${tourRing(pulseYes)}`}
                    onClick={() => void respond("accept_receive_and_pay")}
                  >
                    Yes, I&apos;ll take it and pay {formatINR(nomination.agreedAmount)}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`w-full rounded-md bg-meesho px-3 py-3 text-sm font-extrabold text-white ${tourRing(pulseYes)}`}
                    onClick={() => void respond("accept_receive")}
                  >
                    Yes, I&apos;ll take it. I will not pay the rider.
                  </button>
                )}
                {nomination.payerArrangement === "neighbour_cod" ? (
                  <button
                    type="button"
                    className="w-full rounded-md border border-line bg-white px-3 py-3 text-sm font-extrabold"
                    onClick={() => void respond("accept_receive")}
                  >
                    I can hold the parcel. I won&apos;t pay.
                  </button>
                ) : null}
                <button type="button" className="w-full py-2 text-sm font-extrabold text-rose" onClick={() => void respond("decline")}>
                  No, I can&apos;t take this
                </button>
              </div>
            )}
            {shipment.phase === "delivered" ? (
              <div className="px-4 pb-4">
                <button type="button" className="text-sm font-extrabold text-rose" onClick={() => void respond("decline")}>
                  I did not receive this
                </button>
              </div>
            ) : null}
          </section>
        )}
        {error ? (
          <div className="px-4">
            <Alert>{error}</Alert>
          </div>
        ) : null}
      </div>
    </MeeshoScreen>
  );
}
