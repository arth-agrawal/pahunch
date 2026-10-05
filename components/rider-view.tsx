"use client";

import { useState } from "react";
import { useDemo } from "@/components/demo-context";
import { RoleLayout } from "@/components/role-layout";
import { Alert, Button, Field, inputClass } from "@/components/ui";
import { formatINR } from "@/lib/domain/format";

export function RiderView() {
  const demo = useDemo();
  const selected = demo.data?.selected;
  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!demo.data || !selected) return <p>Loading the rider task…</p>;
  const task = selected.currentTask ?? selected.latestTask;
  const stale = !selected.currentTask && selected.latestTask?.state === "superseded";

  async function run(body: Record<string, unknown>) {
    setError(null);
    try {
      await demo.act(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The rider action was rejected.");
    }
  }

  return (
    <RoleLayout
      phone={
        <div className="space-y-4 p-4">
          <p className="text-sm font-semibold text-purple">Dispatch task</p>
          <h1 className="text-2xl font-semibold text-plum">{selected.shipment.id}</h1>
          {demo.offlineFrozen ? (
            <p className="rounded-lg border border-rose/40 bg-white p-3 text-sm text-rose">
              Rider link is offline. This is the last known task. Neighbour handover cannot be authorised until you reconnect.
            </p>
          ) : null}
          {!task ? (
            <p>No rider instruction has been issued. The hub keeps custody until there is a current task.</p>
          ) : (
            <>
              {stale ? (
                <p className="rounded-lg bg-cream p-3 text-sm">
                  Task v{task.revision} is invalidated. Trying to hand it over will be rejected. Retain parcel custody.
                </p>
              ) : (
                <p className="text-sm text-muted">Version {task.revision} · {task.owner} · {task.runDate}</p>
              )}
              <p className="text-sm">Original buyer {selected.shipment.buyerName}</p>
              <p className="text-lg font-semibold">Receiver {task.recipientName}</p>
              <p>{task.addressLine}</p>
              <p className="text-sm text-muted">{task.landmark}</p>
              <p className="text-4xl font-semibold text-plum">{formatINR(task.paymentDue)}</p>
              <p className="text-sm">{task.paymentDue === 0 ? "Do not collect COD." : "COD due through the approved process."}</p>
              <Button
                variant="ghost"
                onClick={() => void run({ action: "acknowledgeTask", shipmentId: selected.shipment.id, taskId: task.id, revision: task.revision })}
              >
                {task.acknowledged ? "Task opened" : "Open task"}
              </Button>
              {task.paymentDue > 0 ? (
                <Field label="Amount collected" hint="Must match the due amount exactly.">
                  <input className={inputClass} inputMode="numeric" value={amount} placeholder={String(task.paymentDue)} onChange={(event) => setAmount(event.target.value)} />
                </Field>
              ) : null}
              {task.paymentDue > 0 ? (
                <Button
                  variant="gold"
                  onClick={() =>
                    void run({
                      action: "collectCod",
                      shipmentId: selected.shipment.id,
                      taskId: task.id,
                      revision: task.revision,
                      amount: Number(amount || task.paymentDue),
                      idempotencyKey: `cod-${selected.shipment.id}-${crypto.randomUUID()}`,
                    })
                  }
                >
                  Record COD collection
                </Button>
              ) : null}
              <Field label="Demo receipt code" hint="Ask the authorised recipient. This is not a production OTP.">
                <input className={inputClass} value={code} onChange={(event) => setCode(event.target.value)} />
              </Field>
              <Button
                onClick={() =>
                  void run({
                    action: "confirmReceipt",
                    shipmentId: selected.shipment.id,
                    taskId: task.id,
                    revision: task.revision,
                    code,
                  })
                }
              >
                Confirm physical handover
              </Button>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["recipient_unavailable", "Recipient unavailable"],
                  ["payment_mismatch", "Payment mismatch"],
                  ["address_access", "Address / access"],
                  ["parcel_concern", "Parcel concern"],
                ].map(([type, label]) => (
                  <Button
                    key={type}
                    variant="ghost"
                    onClick={() =>
                      void run({
                        action: "riderException",
                        shipmentId: selected.shipment.id,
                        taskId: task.id,
                        revision: task.revision,
                        type,
                      })
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </>
          )}
          <Button
            variant={demo.offlineFrozen ? "gold" : "ghost"}
            onClick={() => void run({ action: "setOffline", offline: !demo.offlineFrozen })}
          >
            {demo.offlineFrozen ? "Reconnect and refresh" : "Go offline"}
          </Button>
          {error ? <Alert>{error}</Alert> : null}
          {selected.shipment.phase === "delivered" ? (
            <p className="text-sm text-teal">Delivered to {selected.receipt?.recipientName}. Payment and receipt are reconciled once.</p>
          ) : null}
        </div>
      }
      aside={
        <div>
          <h2 className="text-lg font-semibold text-plum">One current instruction</h2>
          <p className="mt-2">
            The rider sees the approved receiver, the exact COD due and the task version. An old version cannot complete handover, including when the request is sent again after cancellation.
          </p>
          <p className="mt-3">Collection does not by itself mean delivered. Physical receipt is a separate server record.</p>
          <p className="mt-3 text-muted">
            Normal rider pay is outside this simulator. No failed-attempt bonus is awarded. If a pilot later prices extra effort, that figure is an assumed programme allowance, not a committed payout.
          </p>
        </div>
      }
    />
  );
}
