"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MeeshoLogo } from "@/components/brand";
import { CoachCard, TourProvider, tourRing, useHighlightNext } from "@/components/coach";
import { DemoProvider, useDemo, type Role } from "@/components/demo-context";
import { continueStory, holdingLine, storyBeats } from "@/components/story";
import { Alert, Button } from "@/components/ui";
import { formatINR } from "@/lib/domain/format";

export function Shell({ role, children }: { role: Role; children: React.ReactNode }) {
  return (
    <DemoProvider role={role}>
      <TourProvider>
        {role === "hub" || role === "pilot" ? <Desk role={role}>{children}</Desk> : <PhoneStage role={role}>{children}</PhoneStage>}
      </TourProvider>
    </DemoProvider>
  );
}

function PhoneStage({ role, children }: { role: Role; children: React.ReactNode }) {
  const demo = useDemo();
  const time = demo.data?.nowLabel.match(/\d{2}:\d{2}/)?.[0] ?? "09:30";

  return (
    <div className="min-h-screen bg-[#e4e4e4]">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-3 py-3 lg:flex-row lg:items-start lg:gap-8 lg:px-6 lg:py-6">
        <div className="order-2 mx-auto w-full max-w-[390px] shrink-0 lg:order-1 lg:mx-0">
          <div className="bg-white lg:rounded-[42px] lg:bg-[#111] lg:p-3 lg:shadow-[0_28px_70px_rgba(0,0,0,0.28)]">
            <div className="hidden items-center justify-between px-6 pt-1 text-[12px] font-bold text-white lg:flex">
              <span>{time}</span>
              <span className="h-[22px] w-[96px] rounded-full bg-black" />
              <span className="tracking-wide">LTE</span>
            </div>
            <div className="overflow-hidden bg-white lg:mt-1 lg:h-[min(740px,calc(100vh-6.5rem))] lg:rounded-[30px]">
              {demo.loading && !demo.data ? <p className="p-6 text-sm">Opening Meesho…</p> : children}
            </div>
            <div className="hidden justify-center py-2 lg:flex">
              <span className="h-1 w-28 rounded-full bg-white/80" />
            </div>
          </div>
        </div>
        <div className="order-1 min-w-0 flex-1 lg:order-2 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <StoryRail role={role} />
        </div>
      </div>
    </div>
  );
}

function Desk({ role, children }: { role: Role; children: React.ReactNode }) {
  const demo = useDemo();
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <MeeshoLogo />
          <div>
            <p className="text-sm font-extrabold">{role === "hub" ? "Valmo hub" : "Pilot desk"}</p>
            <p className="text-xs text-muted">{demo.data?.nowLabel ?? "Loading the morning…"}</p>
          </div>
          <Link href={`/?order=${encodeURIComponent(demo.orderId)}`} className="text-sm font-extrabold text-meesho">
            Back to the phone
          </Link>
          <div className="ml-auto">
            <QuietTools />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <StoryRail role={role} compact />
        <div>
          {demo.error ? <Alert>{demo.error}</Alert> : null}
          {demo.loading && !demo.data ? <p>Opening the desk…</p> : children}
        </div>
      </div>
    </div>
  );
}

function StoryRail({ role, compact = false }: { role: Role; compact?: boolean }) {
  const demo = useDemo();
  const selected = demo.data?.selected;
  const { notice, clearNotice } = demo;
  const [about, setAbout] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => clearNotice(), 4500);
    return () => window.clearTimeout(timer);
  }, [notice, clearNotice]);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  if (!demo.data || !selected) {
    return <p className="p-4 text-sm">Loading this morning…</p>;
  }

  const beats = storyBeats(selected);
  const next = continueStory(selected, role);
  const buyer = selected.shipment.buyerName.split(" ")[0];

  return (
    <aside className={`bg-white lg:rounded-2xl lg:p-5 ${compact ? "rounded-2xl p-4" : "px-4 py-4"}`}>
      <Simulations />
      <CoachCard />
      {notice ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-line bg-[#f7f7f7] px-3 py-3 text-sm leading-5">
          <p className="min-w-0 flex-1">{notice}</p>
          <button type="button" onClick={demo.clearNotice} className="shrink-0 font-extrabold text-muted">
            Close
          </button>
        </div>
      ) : null}
      <p className="text-xs font-extrabold tracking-wide text-meesho uppercase">
        {demo.data.nowLabel.replace(", ", " · ").replace(" IST", "")} · {selected.shipment.hubName}
      </p>
      <h2 className={`mt-1 font-extrabold ${compact ? "text-base" : "text-xl leading-6"}`}>
        {buyer}&apos;s {selected.shipment.itemName.toLowerCase()} is at the hub
      </h2>
      <p className="mt-2 text-sm leading-5 text-muted">{holdingLine(role, selected)}</p>
      <ol className="mt-4 space-y-2">
        {beats.map((beat, index) => {
          const here = beat.role === role;
          return (
            <li key={beat.id}>
              <Link
                href={`${beat.href}?order=${encodeURIComponent(selected.shipment.id)}`}
                className={`flex gap-3 rounded-xl px-2 py-2 ${here ? "bg-cream" : "hover:bg-[#fafafa]"}`}
              >
                <span
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
                    beat.status === "done" ? "bg-teal text-white" : beat.status === "now" ? "bg-meesho text-white" : "bg-[#eee] text-muted"
                  }`}
                >
                  {beat.status === "done" ? "✓" : index + 1}
                </span>
                <span>
                  <span className="block text-sm font-extrabold">
                    {beat.title}
                    {here ? (
                      <span className="ml-1.5 inline-block rounded-full bg-white px-1.5 align-middle text-[10px] font-extrabold whitespace-nowrap text-meesho">
                        You are here
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-sm leading-5 text-muted">{beat.detail}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {next ? (
        <NextHandoff href={next.href} label={next.label} />
      ) : (
        <p className="mt-4 rounded-md bg-[#f6f6f6] px-3 py-2 text-sm">The next tap is on this screen.</p>
      )}
      {role === "customer" && selected.shipment.id === "PH-2401" ? (
        <p className="mt-3 text-sm leading-5 text-muted">
          Saanvi is at the flour mill. Riya is in House 18, one lane over. The hop is 40 metres and about a minute.
        </p>
      ) : null}
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs font-extrabold tracking-wide text-muted uppercase">Other parcels this morning</p>
        <ul className="mt-2 space-y-1">
          {demo.data.orders.map((order) => (
            <li key={order.id}>
              <button
                type="button"
                onClick={() => demo.setOrderId(order.id)}
                className={`flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  order.id === selected.shipment.id ? "bg-cream font-extrabold" : "hover:bg-[#fafafa]"
                }`}
              >
                <span>
                  {order.buyerName.split(" ")[0]} · {order.hubName}
                </span>
                <span className="text-muted">{formatINR(order.amount)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          onClick={() =>
            void demo.act({ action: "advanceClock", days: 1 }).catch((reason: Error) => setResetError(reason.message))
          }
        >
          Skip to tomorrow
        </Button>
        <Button variant="ghost" onClick={() => setAbout((open) => !open)}>
          What this is
        </Button>
        <Button variant="danger" onClick={() => setResetOpen(true)}>
          Start the morning over
        </Button>
      </div>
      {about ? (
        <p className="mt-3 text-sm leading-5 text-muted">
          Pahunch is a proposal on top of a Meesho order, for the DICE challenge, by Arth Agrawal and Nandini Goyal. The wordmark is here so you can judge the step in place. Orders, people and cash are fictional. Nothing here talks to Meesho, Valmo, a bank, SMS or a map.
        </p>
      ) : null}
      {resetOpen ? (
        <div className="mt-3 rounded-md border border-line p-3">
          <p className="text-sm">Puts the six orders back to 9:30 this morning.</p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="danger"
              onClick={() => {
                void demo
                  .act({ action: "resetDemo", confirm: true })
                  .then(() => setResetOpen(false))
                  .catch((reason: Error) => setResetError(reason.message));
              }}
            >
              Reset
            </Button>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Keep playing
            </Button>
          </div>
        </div>
      ) : null}
      {resetError ? (
        <div className="mt-2">
          <Alert>{resetError}</Alert>
        </div>
      ) : null}
      {demo.error ? (
        <div className="mt-2">
          <Alert>{demo.error}</Alert>
        </div>
      ) : null}
    </aside>
  );
}

function Simulations() {
  const demo = useDemo();
  const router = useRouter();
  const play = useSearchParams().get("play") ?? "neighbour";
  const [busy, setBusy] = useState(false);

  async function start(next: "neighbour" | "tomorrow" | "home") {
    setBusy(true);
    try {
      await demo.act({ action: "applyScenario", scenario: "neighbour_cod" });
      router.push(`/?order=PH-2401&play=${next}`);
    } finally {
      setBusy(false);
    }
  }

  const stories = [
    { id: "neighbour", title: "Riya takes it", detail: "Saanvi names her. Riya pays ₹299." },
    { id: "tomorrow", title: "Send it tomorrow", detail: "The hub confirms. Nobody rides today." },
    { id: "home", title: "Saanvi is home", detail: "Same address. She pays the rider." },
  ] as const;

  return (
    <div className="mb-4">
      <p className="text-xs font-extrabold tracking-wide text-muted uppercase">Three stories</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {stories.map((story) => (
          <button
            key={story.id}
            type="button"
            disabled={busy}
            onClick={() => void start(story.id)}
            className={`rounded-2xl px-3 py-2 text-left disabled:opacity-50 ${
              play === story.id ? "bg-cream ring-1 ring-meesho" : "bg-[#f6f6f6] hover:bg-white"
            }`}
          >
            <span className="block text-sm font-extrabold">{story.title}</span>
            <span className="block text-xs leading-4 text-muted">{story.detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NextHandoff({ href, label }: { href: string; label: string }) {
  const pulse = useHighlightNext();
  return (
    <Link
      href={href}
      className={`mt-4 flex min-h-11 items-center justify-center rounded-md bg-meesho px-3 text-center text-sm font-extrabold text-white ${tourRing(pulse)}`}
    >
      {label}
    </Link>
  );
}

function QuietTools() {
  const demo = useDemo();
  const [resetError, setResetError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs font-bold text-muted">
        Order
        <select
          className="ml-2 rounded-md border border-line bg-white px-2 py-1 text-sm font-bold text-ink"
          value={demo.orderId}
          onChange={(event) => demo.setOrderId(event.target.value)}
        >
          {demo.data?.orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.id} · {order.buyerName}
            </option>
          )) ?? <option value={demo.orderId}>{demo.orderId}</option>}
        </select>
      </label>
      <Button
        variant="ghost"
        onClick={() => void demo.act({ action: "advanceClock", days: 1 }).catch((reason: Error) => setResetError(reason.message))}
      >
        Tomorrow
      </Button>
      {resetError ? <span className="text-xs text-rose">{resetError}</span> : null}
    </div>
  );
}
