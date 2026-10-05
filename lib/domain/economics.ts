import { DomainError } from "./errors";

export type EconomicsInput = {
  shipments: number;
  codSharePercent: number;
  codRtoPercent: number;
  prepaidRtoPercent: number;
  upliftPercentagePoints: number;
  reverseCost: number;
  programmeCostPerShipment: number;
};

export type EconomicsResult = {
  shipments: number;
  codSharePercent: number;
  codRtoPercent: number;
  prepaidRtoPercent: number;
  upliftPercentagePoints: number;
  reverseCost: number;
  programmeCostPerShipment: number;
  codShipments: number;
  prepaidShipments: number;
  codRto: number;
  prepaidRto: number;
  totalRto: number;
  baselineRate: number;
  targetRate: number;
  prevented: number;
  gross: number;
  budget: number;
  operating: number;
  setupAllocation: number;
  net: number;
  breakeven: number | null;
};

export const DEFAULT_ECONOMICS: EconomicsInput = {
  shipments: 100000,
  codSharePercent: 80,
  codRtoPercent: 20,
  prepaidRtoPercent: 5,
  upliftPercentagePoints: 1.2,
  reverseCost: 120,
  programmeCostPerShipment: 1,
};

export const PLANNING_BREAKDOWN = [
  { item: "Readiness outreach", calculation: "80,000 × ₹0.30", amount: 24000 },
  { item: "Nominee handling", calculation: "3,000 × ₹4", amount: 12000 },
  { item: "Exception reviews", calculation: "2,000 × ₹6", amount: 12000 },
  { item: "Support + reserve", calculation: "₹20,000 + ₹12,000", amount: 32000 },
  { item: "Operating subtotal", calculation: "Four cost items", amount: 80000 },
  {
    item: "Setup/training allocation",
    calculation: "₹2,00,000 / 10,00,000 shipments × 1,00,000",
    amount: 20000,
  },
  { item: "Total allocated budget", calculation: "₹80,000 + ₹20,000", amount: 100000 },
] as const;

export const CASE_PREVENTED = [600, 834, 1200] as const;

export function netForPrevented(
  prevented: number,
  reverseCost = 120,
  budget = 100000,
): number {
  return prevented * reverseCost - budget;
}

export function calculateEconomics(input: EconomicsInput): EconomicsResult {
  const shipments = input.shipments;
  const {
    codSharePercent,
    codRtoPercent,
    prepaidRtoPercent,
    upliftPercentagePoints,
    reverseCost,
    programmeCostPerShipment,
  } = input;

  if (!Number.isFinite(shipments) || shipments <= 0) {
    throw new DomainError("Shipments must be greater than zero.");
  }
  if (!Number.isFinite(codSharePercent) || codSharePercent < 0 || codSharePercent > 100) {
    throw new DomainError("COD share must be between 0 and 100 percent.");
  }
  if (!Number.isFinite(codRtoPercent) || codRtoPercent < 0 || codRtoPercent > 100) {
    throw new DomainError("COD RTO must be between 0 and 100 percent.");
  }
  if (!Number.isFinite(prepaidRtoPercent) || prepaidRtoPercent < 0 || prepaidRtoPercent > 100) {
    throw new DomainError("Prepaid RTO must be between 0 and 100 percent.");
  }
  if (!Number.isFinite(upliftPercentagePoints) || upliftPercentagePoints < 0) {
    throw new DomainError("Uplift in percentage points cannot be negative.");
  }
  if (!Number.isFinite(reverseCost) || reverseCost < 0) {
    throw new DomainError("Avoidable reverse cost cannot be negative.");
  }
  if (!Number.isFinite(programmeCostPerShipment) || programmeCostPerShipment < 0) {
    throw new DomainError("Programme cost per shipment cannot be negative.");
  }

  const codShipments = Math.round((shipments * codSharePercent) / 100);
  const prepaidShipments = shipments - codShipments;
  const codRto = Math.round((codShipments * codRtoPercent) / 100);
  const prepaidRto = Math.round((prepaidShipments * prepaidRtoPercent) / 100);
  const totalRto = codRto + prepaidRto;
  const baselineRate = shipments === 0 ? 0 : totalRto / shipments;
  const baselinePoints = baselineRate * 100;

  if (upliftPercentagePoints - baselinePoints > 1e-9) {
    throw new DomainError(
      `Uplift cannot reduce RTO below zero. Baseline is ${baselinePoints.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%.`,
    );
  }

  const prevented = Math.round((shipments * upliftPercentagePoints) / 100);
  const gross = Math.round(prevented * reverseCost);
  const budget = Math.round(shipments * programmeCostPerShipment);
  const planningSetup = Math.round((200000 / 1000000) * shipments);
  const setupAllocation = Math.min(budget, planningSetup);
  const operating = budget - setupAllocation;
  const net = gross - budget;
  const breakeven = reverseCost === 0 ? null : Math.ceil(budget / reverseCost);
  const targetRate = baselineRate - upliftPercentagePoints / 100;

  return {
    shipments,
    codSharePercent,
    codRtoPercent,
    prepaidRtoPercent,
    upliftPercentagePoints,
    reverseCost,
    programmeCostPerShipment,
    codShipments,
    prepaidShipments,
    codRto,
    prepaidRto,
    totalRto,
    baselineRate,
    targetRate,
    prevented,
    gross,
    budget,
    operating,
    setupAllocation,
    net,
    breakeven,
  };
}
