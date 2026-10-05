"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MeeshoLogo } from "@/components/brand";
import {
  CoachCard,
  TourProvider,
  tourRing,
  useHighlightNext,
} from "@/components/coach";
import { DemoProvider, useDemo, type Role } from "@/components/demo-context";
import {
  continueStory,
  FEATURED_ORDERS,
  holdingLine,
  riderLabel,
  storyBeats,
} from "@/components/story";
import { Alert, Button } from "@/components/ui";
import { formatINR } from "@/lib/domain/format";

export function Shell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  return (
    <DemoProvider role={role}>
      <TourProvider>
        {role === "hub" || role === "pilot" ? (
          <Desk role={role}>{children}</Desk>
        ) : (
          <PhoneStage role={role}>{children}</PhoneStage>
        )}
        <GlobalProgress />
        <Credit />
        <Welcome />
      </TourProvider>
    </DemoProvider>
  );
}

const WELCOME_KEY = "pahunch-welcome";

/** Always on screen, on every page, at every size. */
function Credit() {
  return (
    <p className="pointer-events-none fixed bottom-16 left-3 z-40 max-w-[calc(100%-1.5rem)] rounded-full border border-line bg-white/95 px-3 py-1 text-[11px] font-bold text-muted shadow-sm sm:bottom-3">
      Made by Team Pahunch · IIT Bombay · Arth Agrawal &amp; Nandini Goyal
    </p>
  );
}

/** One screen, once per session, that says what this is before anyone taps anything. */
function Welcome() {
  const demo = useDemo();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(WELCOME_KEY) !== "seen") setOpen(true);
  }, []);

  if (!open) return null;

  function close() {
    window.sessionStorage.setItem(WELCOME_KEY, "seen");
    setOpen(false);
  }

  const hub = demo.data?.selected?.shipment.hubName ?? "Powai";
  const rider = riderLabel(hub);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[#142033]/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-3">
          <MeeshoLogo />
          <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-extrabold text-meesho">
            + Pahunch
          </span>
        </div>
        <h1
          id="welcome-title"
          className="mt-4 text-2xl leading-7 font-extrabold"
        >
          A cash-on-delivery parcel is about to leave the {hub} hub. You decide
          if that trip is worth making.
        </h1>
        <ol className="mt-4 space-y-3 text-sm leading-5">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-meesho text-xs font-extrabold text-white">
              1
            </span>
            <span>
              <b>Saanvi</b> ordered a ₹299 kurta, pay on delivery. Today, Meesho
              asks her one new question before {rider} leaves:{" "}
              <b>
                are you home, should it come tomorrow, or can someone nearby
                take it?
              </b>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-meesho text-xs font-extrabold text-white">
              2
            </span>
            <span>
              You play every screen in turn: Saanvi&apos;s phone, the
              neighbour&apos;s phone, the <b>local hub portal</b>, and {rider}
              &apos;s app.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-meesho text-xs font-extrabold text-white">
              3
            </span>
            <span>
              Follow the{" "}
              <span className="rounded-md bg-[#142033] px-1.5 py-0.5 font-extrabold text-[#ffe14a]">
                yellow Tap here
              </span>{" "}
              bubble. It always sits on the one button that moves the story
              forward.
            </span>
          </li>
        </ol>
        <button
          type="button"
          onClick={close}
          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-md bg-meesho text-sm font-extrabold text-white"
        >
          Start on Saanvi&apos;s phone
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          Fictional orders, people and cash. Nothing here talks to Meesho, Valmo
          or a bank.
        </p>
      </div>
    </div>
  );
}

function GlobalProgress() {
  const demo = useDemo();
  const params = useSearchParams();
  const selected = demo.data?.selected;
  if (!selected) return null;
  const beats = storyBeats(selected);
  const play = params.get("play");

  return (
    <nav
      aria-label="Story progress"
      className="fixed bottom-3 left-1/2 z-50 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-white px-2 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
    >
      {beats.map((beat, index) => {
        const query = new URLSearchParams();
        query.set("order", selected.shipment.id);
        if (play) query.set("play", play);
        const here = beat.role === demo.role;
        return (
          <Link
            key={beat.id}
            href={`${beat.href}?${query.toString()}`}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-extrabold whitespace-nowrap ${
              here
                ? "bg-cream text-meesho"
                : beat.status === "done"
                  ? "text-teal"
                  : beat.status === "now"
                    ? "text-meesho"
                    : "text-muted"
            }`}
          >
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                beat.status === "done"
                  ? "bg-teal text-white"
                  : beat.status === "now" || here
                    ? "bg-meesho text-white"
                    : "bg-[#eee] text-muted"
              }`}
            >
              {beat.status === "done" ? "✓" : index + 1}
            </span>
            {beat.title}
          </Link>
        );
      })}
    </nav>
  );
}

function PhoneStage({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const demo = useDemo();
  const time = demo.data?.nowLabel.match(/\d{2}:\d{2}/)?.[0] ?? "09:30";

  return (
    <div className="min-h-screen bg-[#e4e4e4] pb-20">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-3 py-3 lg:flex-row lg:items-start lg:gap-8 lg:px-6 lg:py-6">
        <div className="order-2 mx-auto w-full max-w-[390px] shrink-0 lg:order-1 lg:mx-0">
          <div className="bg-white lg:rounded-[42px] lg:bg-[#111] lg:p-3 lg:shadow-[0_28px_70px_rgba(0,0,0,0.28)]">
            <div className="hidden items-center justify-between px-6 pt-1 text-[12px] font-bold text-white lg:flex">
              <span>{time}</span>
              <span className="h-[22px] w-[96px] rounded-full bg-black" />
              <span className="tracking-wide">LTE</span>
            </div>
            <div className="overflow-hidden bg-white lg:mt-1 lg:h-[min(740px,calc(100vh-6.5rem))] lg:rounded-[30px]">
              {demo.loading && !demo.data ? (
                <p className="p-6 text-sm">Opening Meesho…</p>
              ) : (
                children
              )}
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
    <div className="min-h-screen bg-canvas pb-20">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <MeeshoLogo />
          <div>
            <p className="text-sm font-extrabold">
              {role === "hub" ? "Local hub portal" : "Pilot desk"}
            </p>
            <p className="text-xs text-muted">
              {demo.data?.nowLabel ?? "Loading the morning…"}
            </p>
          </div>
          <Link
            href={`/?order=${encodeURIComponent(demo.orderId)}`}
            className="text-sm font-extrabold text-meesho"
          >
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
          {demo.loading && !demo.data ? (
            <p>Opening the local hub portal…</p>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

function StoryRail({
  role,
  compact = false,
}: {
  role: Role;
  compact?: boolean;
}) {
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
    <aside
      className={`bg-white lg:rounded-2xl lg:p-5 ${compact ? "rounded-2xl p-4" : "px-4 py-4"}`}
    >
      <Simulations />
      <CoachCard />
      {notice ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-line bg-[#f7f7f7] px-3 py-3 text-sm leading-5">
          <p className="min-w-0 flex-1">{notice}</p>
          <button
            type="button"
            onClick={demo.clearNotice}
            className="shrink-0 font-extrabold text-muted"
          >
            Close
          </button>
        </div>
      ) : null}
      <p className="text-xs font-extrabold tracking-wide text-meesho uppercase">
        {demo.data.nowLabel.replace(", ", " · ").replace(" IST", "")} ·{" "}
        {selected.shipment.hubName} hub
      </p>
      <h2
        className={`mt-1 font-extrabold ${compact ? "text-base" : "text-xl leading-6"}`}
      >
        {buyer}&apos;s {selected.shipment.itemName.toLowerCase()} is at the hub
      </h2>
      <p className="mt-2 text-sm leading-5 text-muted">
        {holdingLine(role, selected)}
      </p>
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
                    beat.status === "done"
                      ? "bg-teal text-white"
                      : beat.status === "now"
                        ? "bg-meesho text-white"
                        : "bg-[#eee] text-muted"
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
                  <span className="block text-sm leading-5 text-muted">
                    {beat.detail}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {next ? (
        <NextHandoff href={next.href} label={next.label} />
      ) : (
        <p className="mt-4 rounded-md bg-[#f6f6f6] px-3 py-2 text-sm">
          The next tap is on this screen.
        </p>
      )}
      {role === "customer" && selected.shipment.id === "PH-2401" ? (
        <p className="mt-3 text-sm leading-5 text-muted">
          Saanvi&apos;s kurta is the order to follow. If she names someone
          nearby, that person agrees on their own phone. Rider 1 only leaves the
          Powai hub after the portal says so.
        </p>
      ) : null}
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs font-extrabold tracking-wide text-muted uppercase">
          Three customers this morning
        </p>
        <ul className="mt-2 space-y-1">
          {demo.data.orders
            .filter((order) =>
              FEATURED_ORDERS.includes(
                order.id as (typeof FEATURED_ORDERS)[number],
              ),
            )
            .map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => demo.setOrderId(order.id)}
                  className={`flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                    order.id === selected.shipment.id
                      ? "bg-cream font-extrabold"
                      : "hover:bg-[#fafafa]"
                  }`}
                >
                  <span>
                    {order.buyerName.split(" ")[0]} · {order.hubName} ·{" "}
                    {riderLabel(order.hubName)}
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
            void demo
              .act({ action: "advanceClock", days: 1 })
              .catch((reason: Error) => setResetError(reason.message))
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
          Pahunch is a proposal on top of a Meesho order, for the DICE
          challenge, by Arth Agrawal and Nandini Goyal. The wordmark is here so
          you can judge the step in place. Orders, people and cash are
          fictional. Nothing here talks to Meesho, Valmo, a bank, SMS or a map.
        </p>
      ) : null}
      {resetOpen ? (
        <div className="mt-3 rounded-md border border-line p-3">
          <p className="text-sm">Puts every order back to 9:30 this morning.</p>
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
    {
      id: "neighbour",
      title: "Someone nearby takes it",
      detail: "Saanvi names a neighbour. They say yes and pay the cash.",
    },
    {
      id: "tomorrow",
      title: "Send it tomorrow",
      detail: "The hub confirms. Nobody rides out today.",
    },
    {
      id: "home",
      title: "Saanvi is home",
      detail: "Same address. She pays Rider 1 herself.",
    },
  ] as const;

  async function restart() {
    setBusy(true);
    try {
      await demo.act({ action: "resetDemo", confirm: true });
    } finally {
      window.sessionStorage.removeItem(WELCOME_KEY);
      window.sessionStorage.removeItem("pahunch-tour");
      // Full reload: fresh data, fresh guide, welcome card back on screen.
      window.location.href = "/?order=PH-2401&play=neighbour";
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold tracking-wide text-muted uppercase">
          Pick a story · each one is a few taps
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void restart()}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-extrabold text-ink hover:bg-cream disabled:opacity-50"
          title="Reset every order, clear the guide, and reload from Saanvi's phone"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              d="M4 12a8 8 0 1 0 2.3-5.6M4 4v5h5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Restart from the beginning
        </button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {stories.map((story) => (
          <button
            key={story.id}
            type="button"
            disabled={busy}
            onClick={() => void start(story.id)}
            className={`rounded-2xl px-3 py-2 text-left disabled:opacity-50 ${
              play === story.id
                ? "bg-cream ring-1 ring-meesho"
                : "bg-[#f6f6f6] hover:bg-white"
            }`}
          >
            <span className="block text-sm font-extrabold">{story.title}</span>
            <span className="block text-xs leading-4 text-muted">
              {story.detail}
            </span>
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
        onClick={() =>
          void demo
            .act({ action: "advanceClock", days: 1 })
            .catch((reason: Error) => setResetError(reason.message))
        }
      >
        Tomorrow
      </Button>
      {resetError ? (
        <span className="text-xs text-rose">{resetError}</span>
      ) : null}
    </div>
  );
}
