import { formatCount, formatINR, formatRate } from "@/lib/domain/format";
import type { LifeStep } from "@/lib/domain/types";
import type { AuditEvent } from "@/lib/domain/types";
import { formatStamp } from "@/lib/domain/time";
import { netForPrevented } from "@/lib/domain/economics";

const EVENT_LABELS: Record<string, string> = {
  hub_receipt: "Local-hub receipt",
  prompt_delivered: "Prompt delivered",
  readiness_submitted: "Buyer response",
  nomination_created: "Neighbour nominated",
  neighbour_accepted: "Neighbour response",
  neighbour_declined: "Neighbour declined",
  payment_confirmed: "Platform payment confirmed",
  payment_collected: "COD collected",
  later_confirmed: "Later run confirmed",
  later_declined: "Later run declined",
  address_repaired: "Destination repaired",
  parcel_reviewed: "Parcel inspected",
  task_issued: "Rider task issued",
  task_superseded: "Instruction invalidated",
  task_acknowledged: "Rider opened task",
  receipt_recorded: "Physical receipt",
  cancelled: "Buyer cancelled",
  exception_opened: "Exception opened",
  consent_expired: "Consent expired",
  route_updated: "Route scenario updated",
};

export function Lifecycle({ steps }: { steps: LifeStep[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-3 xl:grid-cols-9">
      {steps.map((step) => (
        <li
          key={step.id}
          className={`rounded-lg border px-2 py-2 text-sm ${
            step.state === "done"
              ? "border-teal/30 bg-white text-teal"
              : step.state === "current"
                ? "border-gold bg-cream text-ink"
                : step.state === "skipped"
                  ? "border-line bg-canvas text-muted"
                  : "border-line bg-white text-ink"
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wide">
            {step.state === "skipped" ? "Skipped" : step.state}
          </div>
          <div className="mt-1 font-semibold leading-5">{step.label}</div>
        </li>
      ))}
    </ol>
  );
}

export function Timeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted">No events yet for this order.</p>;
  }
  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 text-sm">
          <time className="text-muted" dateTime={new Date(event.createdAt).toISOString()}>
            {formatStamp(event.createdAt)}
          </time>
          <div>
            <div className="font-semibold text-ink">
              {EVENT_LABELS[event.action] ?? event.action}
              <span className="ml-2 font-normal text-muted">
                {event.actor} · v{event.revision}
              </span>
              {event.invalidated ? (
                <span className="ml-2 rounded bg-cream px-1.5 py-0.5 text-xs font-semibold text-rose">
                  Invalidated instruction
                </span>
              ) : null}
            </div>
            <p className="text-muted">{event.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function RouteDiagram({
  buyer,
  neighbour,
  addedMeters,
  addedMinutes,
  capMeters,
  capMinutes,
}: {
  buyer: string;
  neighbour: string;
  addedMeters: number;
  addedMinutes: number;
  capMeters: number;
  capMinutes: number;
}) {
  const pass = addedMeters <= capMeters && addedMinutes <= capMinutes;
  return (
    <figure>
      <svg viewBox="0 0 560 180" role="img" className="h-auto w-full" aria-label="Schematic route, not a geographic map">
        <title>Schematic route with an alternate neighbour stop</title>
        <line x1="70" y1="48" x2="250" y2="48" stroke="#541151" strokeWidth="3" />
        <line x1="310" y1="48" x2="490" y2="48" stroke="#541151" strokeWidth="3" />
        <path d="M250 48 C250 110, 310 110, 310 48" fill="none" stroke="#F9B94E" strokeWidth="3" />
        {[
          [70, "Previous stop"],
          [280, "Neighbour"],
          [490, "Next stop"],
        ].map(([x, label]) => (
          <g key={String(label)}>
            <circle cx={Number(x)} cy={label === "Neighbour" ? 118 : 48} r="8" fill={label === "Neighbour" ? "#F9B94E" : "#541151"} />
          </g>
        ))}
        <circle cx="280" cy="48" r="8" fill="#541151" />
        <text x="70" y="28" textAnchor="middle" fontSize="13" fill="#241826">Previous stop</text>
        <text x="280" y="28" textAnchor="middle" fontSize="13" fill="#241826">{buyer}</text>
        <text x="490" y="28" textAnchor="middle" fontSize="13" fill="#241826">Next stop</text>
        <text x="280" y="148" textAnchor="middle" fontSize="13" fill="#241826">{neighbour}</text>
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-6 bg-plum" /> Original path
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-6 bg-gold" /> Alternate via neighbour
        </span>
        <span className={pass ? "text-teal" : "text-rose"}>
          Added routed travel {addedMeters} m · added time {addedMinutes} min · caps {capMeters} m / {capMinutes} min
        </span>
      </figcaption>
    </figure>
  );
}

export function CountBar({
  parts,
}: {
  parts: Array<{ label: string; value: number; className: string }>;
}) {
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-line" role="img" aria-label={parts.map((part) => `${part.label} ${part.value}`).join(", ")}>
        {parts.map((part) => (
          <div key={part.label} className={part.className} style={{ width: `${(part.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-3 text-sm">
        {parts.map((part) => (
          <li key={part.label}>
            <span className={`mr-1 inline-block h-2 w-2 rounded-full ${part.className}`} />
            {part.label}: {formatCount(part.value)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SavingsBridge({
  gross,
  operating,
  setup,
  net,
}: {
  gross: number;
  operating: number;
  setup: number;
  net: number;
}) {
  const max = Math.max(gross, 1);
  const rows = [
    { label: "Gross avoided reverse cost", value: gross, width: gross / max, tone: "bg-teal" },
    { label: "Operating cost", value: -operating, width: operating / max, tone: "bg-purple" },
    { label: "Allocated setup", value: -setup, width: setup / max, tone: "bg-gold" },
    { label: "Modelled net", value: net, width: Math.abs(net) / max, tone: net < 0 ? "bg-rose" : "bg-plum" },
  ];
  return (
    <div className="space-y-3" role="img" aria-label="Savings bridge from gross avoided cost to modelled net">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 text-sm">
          <div>{row.label}</div>
          <div className="h-3 rounded-full bg-line">
            <div className={`h-3 rounded-full ${row.tone}`} style={{ width: `${Math.max(4, row.width * 100)}%` }} />
          </div>
          <div className={`font-semibold ${row.value < 0 ? "text-rose" : "text-ink"}`}>{formatINR(row.value)}</div>
        </div>
      ))}
    </div>
  );
}

export function BreakEvenChart({
  prevented,
  reverseCost,
  budget,
}: {
  prevented: number;
  reverseCost: number;
  budget: number;
}) {
  const width = 640;
  const height = 280;
  const pad = 48;
  const maxX = 1600;
  const samples = [0, 200, 400, 600, 834, 1000, 1200, 1400, 1600];
  const nets = samples.map((count) => count * reverseCost - budget);
  const minY = Math.min(...nets, -40000);
  const maxY = Math.max(...nets, 60000);
  const x = (value: number) => pad + (value / maxX) * (width - pad * 2);
  const y = (value: number) => height - pad - ((value - minY) / (maxY - minY)) * (height - pad * 2);
  const line = samples.map((count, index) => `${index === 0 ? "M" : "L"} ${x(count)} ${y(nets[index] ?? 0)}`).join(" ");
  const markers = [600, 834, 1200, prevented];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" className="h-auto w-full" aria-label="Break-even chart of additional final RTOs prevented versus modelled net saving">
      <line x1={pad} y1={y(0)} x2={width - pad} y2={y(0)} stroke="#E4DCE8" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#5C5164" />
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#5C5164" />
      <path d={line} fill="none" stroke="#541151" strokeWidth="2.5" />
      {markers.map((count) => {
        const net = count * reverseCost - budget;
        return <circle key={count} cx={x(count)} cy={y(net)} r="4.5" fill={count === prevented ? "#F9B94E" : "#9453A6"} />;
      })}
      <text x={width / 2} y={height - 12} textAnchor="middle" fontSize="13" fill="#241826">
        Additional final RTOs prevented
      </text>
      <text x="16" y="24" fontSize="13" fill="#241826">
        Net saving, ₹
      </text>
    </svg>
  );
}

export function caseNet(count: number): number {
  return netForPrevented(count);
}

export function PilotDiagram() {
  const arms = [
    { label: "Dense lane", pairs: 4 },
    { label: "Mixed town", pairs: 4 },
    { label: "Peripheral route", pairs: 4 },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {arms.map((arm) => (
        <div key={arm.label} className="rounded-lg border border-line bg-white p-3">
          <h3 className="font-semibold text-plum">{arm.label}</h3>
          <p className="text-sm text-muted">{arm.pairs} matched pairs · 8 hubs</p>
          <div className="mt-3 space-y-2">
            {Array.from({ length: arm.pairs }, (_, index) => (
              <div key={index} className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded bg-canvas px-2 py-1">Ordinary retries</div>
                <div className="rounded bg-cream px-2 py-1">Pahunch</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RateText({ rate, digits = 1 }: { rate: number | null; digits?: number }) {
  return <span>{formatRate(rate, digits)}</span>;
}
