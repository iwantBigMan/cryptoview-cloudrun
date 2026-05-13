import type {
  PortfolioInsightHoldingInput,
  PortfolioInsightRequest,
} from "../../types/ai/ai";

function formatOptionalNumber(label: string, value: number | undefined): string {
  return value === undefined ? `${label}: unknown` : `${label}: ${value}`;
}

function formatRiskTags(riskTags: string[] | undefined): string {
  return riskTags?.length ? riskTags.join(", ") : "none";
}

function formatHolding(holding: PortfolioInsightHoldingInput): string {
  return [
    `exchange: ${holding.exchange}`,
    `symbol: ${holding.symbol}`,
    `quantity: ${holding.quantity}`,
    `valuationKrw: ${holding.valuationKrw}`,
    formatOptionalNumber("portfolioRatio", holding.portfolioRatio),
    formatOptionalNumber("averagePrice", holding.averagePrice),
    formatOptionalNumber("currentPrice", holding.currentPrice),
    formatOptionalNumber("pnlKrw", holding.pnlKrw),
    formatOptionalNumber("pnlRate", holding.pnlRate),
    `riskTags: ${formatRiskTags(holding.riskTags)}`,
  ].join(", ");
}

export function buildPortfolioInsightPrompt(
  request: PortfolioInsightRequest,
): string {
  const baseCurrency = request.baseCurrency ?? "KRW";
  const holdings = request.holdings.map(formatHolding).join("\n");

  return [
    "You are a portfolio insight assistant for a cryptocurrency asset app.",
    "Your job is to explain the user's portfolio snapshot, not to provide investment advice.",
    "Rules:",
    "- Do not provide investment advice, price predictions, or buy/sell/hold instructions.",
    "- Explain only observable portfolio facts, concentration, drawdown, and data quality issues.",
    "- Risk tags are pre-calculated signals from the app. They are not investment recommendations.",
    "- Use riskTags only to explain portfolio structure and possible attention points.",
    "- Do not invent risks that are not supported by the provided data.",
    "- If averagePrice is unknown, mention that PnL accuracy may be limited.",
    "- Keep the tone cautious and descriptive.",
    `Base currency: ${baseCurrency}`,
    formatOptionalNumber("Total valuation KRW", request.totalValuationKrw),
    formatOptionalNumber("Total PnL KRW", request.totalPnlKrw),
    formatOptionalNumber("Total PnL rate", request.totalPnlRate),
    "Holdings:",
    holdings || "No holdings provided.",
    "Write the final response in Korean in 3 short bullet points.",
  ].join("\n");
}
