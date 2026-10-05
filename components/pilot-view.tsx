"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/components/demo-context";
import { Alert } from "@/components/ui";
import { BreakEvenChart, PilotDiagram, SavingsBridge, caseNet } from "@/components/visuals";
import {
  DEFAULT_ECONOMICS,
  PLANNING_BREAKDOWN,
  calculateEconomics,
  type EconomicsResult,
} from "@/lib/domain/economics";
import { DomainError } from "@/lib/domain/errors";
import { formatCount, formatINR, formatPoints, formatRate } from "@/lib/domain/format";

export function PilotView() {
  const demo = useDemo();
  const [shipments, setShipments] = useState(String(DEFAULT_ECONOMICS.shipments));
  const [uplift, setUplift] = useState(String(DEFAULT_ECONOMICS.upliftPercentagePoints));
  const [cost, setCost] = useState(String(DEFAULT_ECONOMICS.programmeCostPerShipment));

  const calculated = useMemo(() => {
    try {
      const result = calculateEconomics({
        ...DEFAULT_ECONOMICS,
        shipments: Number(shipments),
        upliftPercentagePoints: Number(uplift),
        programmeCostPerShipment: Number(cost),
      });
      return { result, error: null as string | null };
    } catch (reason) {
      return { result: null as EconomicsResult | null, error: reason instanceof DomainError ? reason.message : "Those inputs cannot be calculated." };
    }
  }, [shipments, uplift, cost]);

  if (!demo.data) return <p>Loading pilot metrics…</p>;
  const metrics = demo.data.metrics;
  const result = calculated.result;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-white p-4">
        <p className="text-sm font-semibold text-purple">A · This demo</p>
        <h1 className="text-2xl font-semibold text-plum">Operational events from the six example orders</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6">
          Counts use unique orders, not repeated clicks. Current nominations are the nominations still active. These six orders do not measure RTO prevention.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Eligible COD orders" value={formatCount(metrics.eligible)} />
          <Stat label="Prompts delivered" value={formatCount(metrics.prompts)} />
          <Stat label="Buyer responses" value={formatCount(metrics.responses)} />
          <Stat label="No response still in the denominator" value={formatCount(Math.max(0, metrics.prompts - metrics.responses))} />
          <Stat label="Current nominations" value={formatCount(metrics.nominations)} />
          <Stat label="Independently confirmed" value={formatCount(metrics.confirmedNominations)} />
          <Stat label="Approved redirects" value={formatCount(metrics.approvedRedirects)} />
          <Stat label="Completed neighbour handovers" value={formatCount(metrics.completedNeighbourHandovers)} />
          <Stat label="Ordinary buyer deliveries" value={formatCount(metrics.ordinaryDeliveries)} />
          <Stat label="Open parcels" value={formatCount(metrics.openParcels)} />
          <Stat label="Cancelled" value={formatCount(metrics.cancelled)} />
          <Stat label="Open exceptions" value={formatCount(metrics.openExceptions)} />
        </div>
        <dl className="mt-4 grid gap-2 text-sm md:grid-cols-2">
          <RateItem label="Prompt reach" formula="delivered prompts / eligible assigned COD orders" rate={metrics.rates.promptReach} />
          <RateItem label="Buyer response" formula="responding orders / delivered prompts" rate={metrics.rates.buyerResponse} />
          <RateItem label="Nominee consent" formula="accepted current nominations / current nominations" rate={metrics.rates.nomineeConsent} />
          <RateItem label="Handover success" formula="completed neighbour redirects / approved redirects" rate={metrics.rates.handoverSuccess} />
        </dl>
        <a className="mt-4 inline-block text-sm font-semibold text-plum" href="/api/export">Export the audit JSON</a>
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <p className="text-sm font-semibold text-purple">B · Proposed pilot</p>
        <h2 className="text-2xl font-semibold text-plum">Controlled test against ordinary delivery and retries</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm leading-6">
          <p><strong>Days 1–14.</strong> Two training hubs. Audit 200 closed RTOs. Rehearse consent, cancellation, offline and payment cases.</p>
          <p><strong>Days 15–45.</strong> 24 hubs in 12 matched pairs: 8 dense-lane, 8 mixed-town, 8 peripheral. One hub in each pair keeps ordinary delivery. The other runs Pahunch.</p>
          <p><strong>Matching and guardrails.</strong> Match baseline RTO, COD mix, volume, route distance and seller mix. Profiles stay in shadow mode. Avoid shared riders across arms. Replicate before 25% and 50% waves, with a proposed 10% control share later.</p>
        </div>
        <div className="mt-4">
          <PilotDiagram />
        </div>
        <p className="mt-4 text-sm leading-6">
          Primary measure: final RTO divided by all originally assigned shipments, including non-responders. Keep the original COD classification after a payment conversion. Report open parcels and cancellations. The target is {formatPoints(1.2)}, not a 1.2% relative reduction. About 29,900 independent shipments is a starting impact calculation before clustering, not proof that 24 hubs or 31 days are enough. No confidence interval is shown.
        </p>
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <p className="text-sm font-semibold text-purple">C · Scenario calculator</p>
        <h2 className="text-2xl font-semibold text-plum">Editable case, not a measured saving</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm font-semibold">Shipments
            <input className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" value={shipments} onChange={(event) => setShipments(event.target.value)} />
          </label>
          <label className="text-sm font-semibold">Uplift, percentage points
            <input className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" value={uplift} onChange={(event) => setUplift(event.target.value)} />
          </label>
          <label className="text-sm font-semibold">Programme cost per shipment, ₹
            <input className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" value={cost} onChange={(event) => setCost(event.target.value)} />
          </label>
        </div>
        <p className="mt-3 text-sm text-muted">
          Case assumptions held constant: COD share 80%, COD RTO 20%, prepaid RTO 5%, avoidable reverse cost ₹120. Full avoidability of that reverse cost is the main assumption and has to be validated in a pilot. ₹70 is a different interpretation, not a second official cost.
        </p>
        {calculated.error ? <div className="mt-3"><Alert>{calculated.error}</Alert></div> : null}
        {result ? (
          <>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-canvas p-4 text-sm leading-6">{arithmetic(result)}</pre>
            <div className="mt-4 grid gap-6 xl:grid-cols-2">
              <div>
                <h3 className="font-semibold text-plum">Savings bridge</h3>
                <div className="mt-3">
                  <SavingsBridge gross={result.gross} operating={result.operating} setup={result.setupAllocation} net={result.net} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-plum">Break-even</h3>
                <BreakEvenChart prevented={result.prevented} reverseCost={result.reverseCost} budget={result.budget} />
              </div>
            </div>
            <ul className="mt-4 grid gap-2 text-sm md:grid-cols-3">
              <li className="rounded-lg border border-line p-3">600 additional final RTOs prevented → {formatINR(caseNet(600))}</li>
              <li className="rounded-lg border border-line p-3">834 → {formatINR(caseNet(834))} (about break-even; the first non-negative whole number is not exact zero)</li>
              <li className="rounded-lg border border-line p-3">1,200 → {formatINR(caseNet(1200))}</li>
            </ul>
            <p className="mt-3 text-sm text-muted">
              {result.breakeven == null
                ? "At zero avoidable reverse cost there is no finite break-even."
                : `Break-even is ceil(${formatINR(result.budget)} / ${formatINR(result.reverseCost)}) = ${formatCount(result.breakeven)} additional final RTOs prevented.`}
              {" "}A net loss stays visible. Larger volumes assume linear unit costs and an achievable uplift. This is a scenario scaler, not Meesho&apos;s verified annual saving.
            </p>
          </>
        ) : null}
        <h3 className="mt-6 font-semibold text-plum">Planning budget at 1,00,000 shipments</h3>
        <p className="mt-1 text-sm text-muted">This table explains the ₹1 default. ₹4 is a handling allowance, not a promised neighbour reward. Reusing a notification does not make outreach free.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-2">Item</th>
                <th>Calculation</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {PLANNING_BREAKDOWN.map((row) => (
                <tr key={row.item} className="border-t border-line">
                  <td className="py-2 font-semibold">{row.item}</td>
                  <td>{row.calculation}</td>
                  <td>{formatINR(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="mt-4 text-sm leading-6">
          <summary className="cursor-pointer font-semibold text-plum">Upfront pilot cash is not the allocated bridge</summary>
          <p className="mt-2">
            The node costs in the case sum to ₹50 for a successful forward delivery: 4 + 2 + 5 + 8 + 5 + 5 + 21. LMDC is ₹21, or 42% of that forward cost, which is why route discipline matters. Those amounts are not added again as saving per RTO prevented.
          </p>
          <p className="mt-2">
            If a 1,00,000-shipment pilot pays the entire ₹2,00,000 setup upfront, scenario cash is ₹1,44,000 − ₹80,000 − ₹2,00,000 = −₹1,36,000. That is a different figure from the allocated modelled net of ₹44,000. The main bridge keeps the allocated view.
          </p>
        </details>
      </section>
    </div>
  );
}

function arithmetic(result: EconomicsResult): string {
  const baseline = (result.baselineRate * 100).toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const target = (result.targetRate * 100).toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const breakeven = result.breakeven == null ? "no finite break-even" : `${formatCount(result.breakeven)} additional final RTOs prevented`;
  return [
    `COD RTO       = ${formatCount(result.codShipments)} × ${result.codRtoPercent}% = ${formatCount(result.codRto)}`,
    `Prepaid RTO   = ${formatCount(result.prepaidShipments)} × ${result.prepaidRtoPercent}% = ${formatCount(result.prepaidRto)}`,
    `Total RTO     = ${formatCount(result.totalRto)} / ${formatCount(result.shipments)} = ${baseline}%`,
    `Target RTO    = ${baseline}% − ${result.upliftPercentagePoints} percentage points = ${target}%`,
    `Additional final RTOs prevented = ${formatCount(result.shipments)} × ${result.upliftPercentagePoints} / 100 = ${formatCount(result.prevented)}`,
    `Gross avoided reverse cost = ${formatCount(result.prevented)} × ${formatINR(result.reverseCost)} = ${formatINR(result.gross)}`,
    `Programme budget = ${formatCount(result.shipments)} × ${formatINR(result.programmeCostPerShipment)} = ${formatINR(result.budget)}`,
    `Modelled net logistics saving = ${formatINR(result.net)}`,
    `Break-even = ${breakeven}`,
  ].join("\n");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-canvas px-3 py-3">
      <div className="text-sm text-muted">{label}</div>
      <div className="text-xl font-semibold text-plum">{value}</div>
    </div>
  );
}

function RateItem({ label, formula, rate }: { label: string; formula: string; rate: number | null }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2">
      <dt className="font-semibold">{label}</dt>
      <dd>{formatRate(rate)} · {formula}</dd>
    </div>
  );
}
