import type { PortfolioInsightRequest } from "../../types/ai/ai";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidHolding(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const holding = value as Record<string, unknown>;

  return (
    typeof holding.symbol === "string" &&
    holding.symbol.trim().length > 0 &&
    typeof holding.market === "string" &&
    holding.market.trim().length > 0 &&
    isFiniteNumber(holding.quantity) &&
    isFiniteNumber(holding.averagePrice) &&
    isFiniteNumber(holding.currentPrice) &&
    isFiniteNumber(holding.valuation) &&
    isFiniteNumber(holding.pnl) &&
    isFiniteNumber(holding.pnlRate)
  );
}

function isValidPortfolioSummary(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const summary = value as Record<string, unknown>;

  return (
    typeof summary.baseCurrency === "string" &&
    (summary.baseCurrency === "KRW" || summary.baseCurrency === "USDT") &&
    isFiniteNumber(summary.holdingsCount) &&
    summary.holdingsCount >= 0 &&
    isFiniteNumber(summary.totalValuation) &&
    isFiniteNumber(summary.totalPnl) &&
    isFiniteNumber(summary.totalPnlRate)
  );
}

export function isValidPortfolioInsightRequest(
  body: Partial<PortfolioInsightRequest>,
): body is PortfolioInsightRequest {
  return (
    isValidPortfolioSummary(body.portfolioSummary) &&
    Array.isArray(body.holdings) &&
    body.holdings.every(isValidHolding)
  );
}

export function isEmptyPortfolioInsightRequest(
  request: PortfolioInsightRequest,
): boolean {
  return request.portfolioSummary.holdingsCount <= 0;
}
