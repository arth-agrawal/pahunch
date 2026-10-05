"use client";

import { useRef, useState } from "react";
import { MeeshoLogo, ProductShot } from "@/components/brand";
import { TapCloud, tourRing, useHighlight } from "@/components/coach";
import { useDemo } from "@/components/demo-context";
import { Alert } from "@/components/ui";
import { formatINR } from "@/lib/domain/format";

export function RiderView() {
  const demo = useDemo();
  const selected = demo.data?.selected;
  const [amount, setAmount] = useState("");
  const [other, setOther] = useState(false);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const pulseCollect = useHighlight("collect");
  const pulseHandover = useHighlight("handover");
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  if (!demo.data || !selected) return <p className="p-6">Opening today&apos;s run…</p>;
  const task = selected.currentTask ?? selected.latestTask;
  const stale = !selected.currentTask && selected.latestTask?.state === "superseded";
  const shipment = selected.shipment;
  const collected = selected.payments.some((payment) => payment.channel === "cod_collection");
  const needCash = Boolean(task && task.paymentDue > 0 && !collected && !stale);

  async function run(body: Record<string, unknown>) {
    setError(null);
    try {
      await demo.act(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The run rejected that.");
    }
  }

  const code = digits.join("");

  function setDigit(index: number, raw: string) {
    const char = raw.replace(/\D/g, "").slice(-1);
    setDigits((current) => current.map((item, itemIndex) => (itemIndex === index ? char : item)));
    if (char && index < 3) boxes.current[index + 1]?.focus();
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f3f3f3] lg:h-full lg:min-h-0">
      <header className="bg-[#171717] px-4 pt-4 pb-5 text-white">
        <div className="flex items-center justify-between">
          <MeeshoLogo light className="text-[20px]" />
          <span className="text-sm font-extrabold">Rider 1</span>
        </div>
        <p className="mt-4 text-sm text-white/70">{shipment.hubName} · today&apos;s run</p>
        <h1 className="text-2xl font-extrabold">{task ? "1 stop" : "No stop"}</h1>
        {demo.offlineFrozen ? (
          <p className="mt-3 rounded-md bg-[#3a1d1d] px-3 py-2 text-sm text-[#ffd0d0]">
            No network. This is the last task saved on the phone. A neighbour handover waits until you are back online.
          </p>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 pb-20">
        {!task ? (
          <section className="rounded-xl bg-white p-4 text-sm">
            <p className="font-extrabold">Nothing has been released</p>
            <p className="mt-1 text-muted">{shipment.hubName} still has {shipment.itemName}. You do not ride for a maybe.</p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-xl bg-white">
            {stale ? (
              <p className="bg-[#fff4e8] px-4 py-3 text-sm font-bold text-[#8a4b08]">
                This instruction is old. Keep the parcel. Handing it over will be refused.
              </p>
            ) : (
              <p className="px-4 pt-3 text-xs font-bold text-muted">Instruction v{task.revision} · {task.runDate}</p>
            )}
            <div className="flex gap-3 px-4 py-3">
              <ProductShot id={shipment.id} name={shipment.itemName} />
              <div>
                <p className="text-xs text-muted">Ordered by {shipment.buyerName}</p>
                <p className="text-lg leading-6 font-extrabold">{task.recipientName}</p>
                <p className="text-sm">{task.addressLine}</p>
                <p className="text-sm text-muted">{task.landmark}</p>
              </div>
            </div>
            <div className={`mx-4 mb-4 rounded-xl px-4 py-4 ${task.paymentDue === 0 ? "bg-[#eef8f1]" : "bg-[#fff6ea]"}`}>
              <p className="text-xs font-extrabold tracking-wide uppercase">{task.paymentDue === 0 ? "Do not collect" : "Collect cash"}</p>
              <p className={`text-4xl font-black ${task.paymentDue === 0 ? "text-teal" : "text-ink"}`}>
                {task.paymentDue === 0 ? "₹0" : formatINR(task.paymentDue)}
              </p>
            </div>
            {needCash && !other ? (
              <div className="space-y-2 px-4 pb-4">
                <TapCloud id="collect" />
                <button
                  type="button"
                  className={`w-full rounded-md bg-gold px-3 py-3 text-sm font-extrabold text-white ${tourRing(pulseCollect)}`}
                  onClick={() =>
                    void run({
                      action: "collectCod",
                      shipmentId: shipment.id,
                      taskId: task.id,
                      revision: task.revision,
                      amount: task.paymentDue,
                      idempotencyKey: `cod-${shipment.id}-${crypto.randomUUID()}`,
                    })
                  }
                >
                  Collected {formatINR(task.paymentDue)}
                </button>
                <button type="button" className="w-full text-sm font-bold text-muted" onClick={() => setOther(true)}>
                  I collected a different amount
                </button>
              </div>
            ) : null}
            {needCash && other ? (
              <div className="space-y-2 px-4 pb-4">
                <input
                  inputMode="numeric"
                  className="w-full rounded-md border border-line px-3 py-3 text-lg font-bold"
                  placeholder="Amount in hand"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <button
                  type="button"
                  className="w-full rounded-md bg-ink px-3 py-3 text-sm font-extrabold text-white"
                  onClick={() =>
                    void run({
                      action: "collectCod",
                      shipmentId: shipment.id,
                      taskId: task.id,
                      revision: task.revision,
                      amount: Number(amount),
                      idempotencyKey: `cod-${shipment.id}-${crypto.randomUUID()}`,
                    })
                  }
                >
                  Record this amount
                </button>
              </div>
            ) : null}
            {!needCash && !stale ? (
            <div className="border-t border-line px-4 py-4">
              <TapCloud id="handover" />
              <p className="text-sm font-extrabold">Code from {task.recipientName.split(" ")[0]}</p>
              <div className="mt-2 flex gap-2">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    ref={(node) => {
                      boxes.current[index] = node;
                    }}
                    inputMode="numeric"
                    maxLength={1}
                    aria-label={`Code digit ${index + 1}`}
                    className="h-14 w-12 rounded-lg border border-line text-center text-2xl font-black"
                    value={digits[index] ?? ""}
                    onChange={(event) => setDigit(index, event.target.value)}
                  />
                ))}
              </div>
              <button
                type="button"
                className={`mt-3 w-full rounded-md bg-meesho px-3 py-3 text-sm font-extrabold text-white ${tourRing(pulseHandover)}`}
                onClick={() =>
                  void run({
                    action: "confirmReceipt",
                    shipmentId: shipment.id,
                    taskId: task.id,
                    revision: task.revision,
                    code,
                  })
                }
              >
                Hand the parcel over
              </button>
            </div>
            ) : null}
            <details className="border-t border-line px-4 py-3">
              <summary className="cursor-pointer text-xs font-extrabold text-muted">If this stop goes wrong</summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    ["recipient_unavailable", "Nobody here"],
                    ["payment_mismatch", "Cash doesn't match"],
                    ["address_access", "Can't reach the door"],
                    ["parcel_concern", "Parcel problem"],
                  ] as const
                ).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    className="rounded-md border border-line px-2 py-2 text-left text-xs font-bold"
                    onClick={() =>
                      void run({
                        action: "riderException",
                        shipmentId: shipment.id,
                        taskId: task.id,
                        revision: task.revision,
                        type,
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </details>
          </section>
        )}
        {shipment.phase === "delivered" ? (
          <section className="rounded-xl bg-[#eef8f1] px-4 py-4">
            <p className="text-lg font-extrabold text-teal">Handed to {selected.receipt?.recipientName}</p>
            <p className="mt-1 text-sm">Payment and the physical receipt are one record. Doing it again changes nothing.</p>
          </section>
        ) : null}
        {error ? <Alert>{error}</Alert> : null}
        <button
          type="button"
          className="w-full rounded-md border border-line bg-white px-3 py-3 text-sm font-bold"
          onClick={() => void run({ action: "setOffline", offline: !demo.offlineFrozen })}
        >
          {demo.offlineFrozen ? "Back online" : "Lose network"}
        </button>
        {task && !task.acknowledged ? (
          <button
            type="button"
            className="w-full text-sm font-bold text-muted"
            onClick={() => void run({ action: "acknowledgeTask", shipmentId: shipment.id, taskId: task.id, revision: task.revision })}
          >
            Mark this stop as opened
          </button>
        ) : null}
      </div>
    </div>
  );
}
