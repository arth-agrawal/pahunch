import { describe, expect, it } from "vitest";
import { DomainError } from "../lib/domain/errors";
import {
  CASE_PREVENTED,
  DEFAULT_ECONOMICS,
  calculateEconomics,
  netForPrevented,
} from "../lib/domain/economics";
import { formatINR, formatRate } from "../lib/domain/format";
import { computeMetrics } from "../lib/domain/order-state";

describe("economics calculator", () => {
  it("returns the case figures for 1,00,000 shipments", () => {
    const result = calculateEconomics(DEFAULT_ECONOMICS);
    expect(result.codRto).toBe(16000);
    expect(result.prepaidRto).toBe(1000);
    expect(result.totalRto).toBe(17000);
    expect(result.baselineRate).toBeCloseTo(0.17, 5);
    expect(result.targetRate).toBeCloseTo(0.158, 5);
    expect(result.prevented).toBe(1200);
    expect(result.gross).toBe(144000);
    expect(result.budget).toBe(100000);
    expect(result.operating).toBe(80000);
    expect(result.setupAllocation).toBe(20000);
    expect(result.net).toBe(44000);
    expect(result.breakeven).toBe(834);
  });

  it("shows the three reference nets, including the loss", () => {
    expect(CASE_PREVENTED.map((count) => netForPrevented(count))).toEqual([-28000, 80, 44000]);
  });

  it("has no finite break-even when avoidable cost is zero", () => {
    const result = calculateEconomics({ ...DEFAULT_ECONOMICS, reverseCost: 0 });
    expect(result.breakeven).toBeNull();
    expect(result.gross).toBe(0);
    expect(result.net).toBe(-100000);
  });

  it("rejects impossible quantities and RTO reductions", () => {
    expect(() => calculateEconomics({ ...DEFAULT_ECONOMICS, shipments: 0 })).toThrow(DomainError);
    expect(() => calculateEconomics({ ...DEFAULT_ECONOMICS, shipments: -10 })).toThrow(/greater than zero/);
    expect(() => calculateEconomics({ ...DEFAULT_ECONOMICS, upliftPercentagePoints: 40 })).toThrow(/below zero/);
    expect(() => calculateEconomics({ ...DEFAULT_ECONOMICS, programmeCostPerShipment: -1 })).toThrow(/cannot be negative/);
  });
});

describe("metric formatting", () => {
  it("uses an em dash for a zero denominator", () => {
    expect(formatRate(null)).toBe("—");
    const metrics = computeMetrics({
      shipments: [],
      responseShipmentIds: [],
      nominations: [],
      neighbourTaskShipmentIds: [],
      openExceptions: 0,
    });
    expect(metrics.rates.promptReach).toBeNull();
    expect(metrics.rates.buyerResponse).toBeNull();
    expect(metrics.rates.nomineeConsent).toBeNull();
    expect(metrics.rates.handoverSuccess).toBeNull();
  });

  it("formats rupees in Indian grouping", () => {
    expect(formatINR(100000)).toBe("₹1,00,000");
    expect(formatINR(144000)).toBe("₹1,44,000");
    expect(formatINR(299)).toBe("₹299");
    expect(formatINR(-28000)).toBe("-₹28,000");
  });
});
