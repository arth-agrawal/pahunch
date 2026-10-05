"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoProvider, ROLES, useDemo, type Role } from "@/components/demo-context";
import { Alert, Button, Notice } from "@/components/ui";

export function Shell({ role, children }: { role: Role; children: React.ReactNode }) {
  return (
    <DemoProvider role={role}>
      <Frame>{children}</Frame>
    </DemoProvider>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const demo = useDemo();
  const [infoOpen, setInfoOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const orderQuery = `order=${encodeURIComponent(demo.orderId)}`;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="border-b border-line bg-white lg:min-h-screen lg:border-r lg:border-b-0">
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-plum text-sm font-semibold text-white">P</span>
            <div>
              <div className="text-lg font-semibold leading-5 text-plum">Pahunch</div>
              <div className="text-sm text-muted">Proposal for Valmo</div>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col" aria-label="Roles">
            {ROLES.map((item) => {
              const current = item.id === demo.role;
              return (
                <Link
                  key={item.id}
                  href={`${item.href}?${orderQuery}`}
                  aria-current={current ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap ${
                    current ? "bg-cream text-plum" : "text-ink hover:bg-canvas"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <p className="hidden px-4 pb-6 text-sm leading-5 text-muted lg:block">
            Arth Agrawal and Nandini Goyal, IIT Bombay. Meesho DICE Challenge 3.0.
          </p>
        </aside>
        <div className="min-w-0">
          <header className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-3 lg:px-6">
            <label className="text-sm font-semibold">
              Order
              <select
                className="ml-2 rounded-lg border border-line bg-white px-2 py-2 text-sm font-normal"
                value={demo.orderId}
                onChange={(event) => demo.setOrderId(event.target.value)}
              >
                {(demo.data?.orders ?? [{ id: demo.orderId, buyerName: "" }]).map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.id}
                    {order.buyerName ? ` · ${order.buyerName}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-muted">{demo.data?.nowLabel ?? "Loading demo clock…"}</p>
            <Button
              variant="ghost"
              onClick={() => void demo.act({ action: "advanceClock", days: 1 }).catch((reason: Error) => setResetError(reason.message))}
            >
              Advance demo clock 1 day
            </Button>
            <Button variant="ghost" onClick={() => setGuideOpen((open) => !open)}>
              Demo guide
            </Button>
            <Button variant="ghost" onClick={() => setInfoOpen((open) => !open)}>
              About this demo
            </Button>
            <Button variant="danger" onClick={() => setResetOpen(true)}>
              Reset demo
            </Button>
          </header>
          {demo.notice ? (
            <div className="px-4 pt-3 lg:px-6">
              <Notice>{demo.notice}</Notice>
            </div>
          ) : null}
          {demo.error ? (
            <div className="px-4 pt-3 lg:px-6">
              <Alert>{demo.error}</Alert>
            </div>
          ) : null}
          {resetError ? (
            <div className="px-4 pt-3 lg:px-6">
              <Alert>{resetError}</Alert>
            </div>
          ) : null}
          {infoOpen ? (
            <div className="mx-4 mt-3 rounded-lg border border-line bg-white p-4 text-sm leading-6 lg:mx-6">
              Pahunch is a competition prototype for the Meesho DICE Challenge. Orders, people and payments are fictional.
              It does not connect to Meesho, Valmo, live SMS, a payment gateway, a geocoder or the rider app. It is a proposal
              for Valmo, not an official Meesho product.
            </div>
          ) : null}
          {guideOpen ? <Guide /> : null}
          {resetOpen ? (
            <div className="mx-4 mt-3 rounded-lg border border-line bg-white p-4 lg:mx-6">
              <p className="text-sm">
                Reset only this application&apos;s demo records to the six fictional orders. Nothing outside this database is touched.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  onClick={() => {
                    void demo
                      .act({ action: "resetDemo", confirm: true })
                      .then(() => {
                        setResetOpen(false);
                        setResetError(null);
                      })
                      .catch((reason: Error) => setResetError(reason.message));
                  }}
                >
                  Reset demo records
                </Button>
                <Button variant="ghost" onClick={() => setResetOpen(false)}>
                  Keep current state
                </Button>
              </div>
            </div>
          ) : null}
          <main className="px-4 py-4 lg:px-6">{demo.loading && !demo.data ? <p>Loading the shared order state…</p> : children}</main>
        </div>
      </div>
    </div>
  );
}

function Guide() {
  return (
    <ol className="mx-4 mt-3 list-decimal space-y-1 rounded-lg border border-line bg-white p-4 pl-8 text-sm leading-6 lg:mx-6">
      <li>On the hub, select PH-2401, Asha&apos;s ₹299 order.</li>
      <li>As the customer, nominate Riya and choose neighbour-paid COD.</li>
      <li>As Riya, agree to receive and to pay ₹299.</li>
      <li>On the hub, check the 40 m / 1 min route, then approve one task. Profiles stay in shadow mode.</li>
      <li>As the rider, collect ₹299, enter the demo receipt code, and confirm the physical handover.</li>
      <li>On PH-2406, use the prepared rider task, cancel as the buyer, then try the old rider instruction.</li>
      <li>Open Pilot & economics for the 1,00,000-shipment scenario: 1,200 additional final RTOs prevented, modelled net ₹44,000.</li>
    </ol>
  );
}
