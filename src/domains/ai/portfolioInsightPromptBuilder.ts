import type {
  PortfolioInsightHoldingInput,
  PortfolioInsightRequest,
} from "../../types/ai/ai";

function formatMoney(value: number, baseCurrency: "KRW" | "USDT"): string {
  return baseCurrency === "KRW"
    ? `${Math.round(value).toLocaleString("en-US")} KRW`
    : `${value.toFixed(2)} USDT`;
}

function formatRate(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatHolding(
  holding: PortfolioInsightHoldingInput,
  baseCurrency: "KRW" | "USDT",
): string {
  return [
    `symbol: ${holding.symbol}`,
    `market: ${holding.market}`,
    `quantity: ${holding.quantity}`,
    `averagePrice: ${formatMoney(holding.averagePrice, baseCurrency)}`,
    `currentPrice: ${formatMoney(holding.currentPrice, baseCurrency)}`,
    `valuation: ${formatMoney(holding.valuation, baseCurrency)}`,
    `pnl: ${formatMoney(holding.pnl, baseCurrency)}`,
    `pnlRate: ${formatRate(holding.pnlRate)}`,
  ].join(", ");
}

export function buildPortfolioInsightPrompt(
  request: PortfolioInsightRequest,
): string {
  const { portfolioSummary } = request;
  const holdings = request.holdings
    .map((holding) => formatHolding(holding, portfolioSummary.baseCurrency))
    .join("\n");

  return [
    "You are a portfolio insight assistant for a cryptocurrency asset app.",
    "Your job is to explain the user's portfolio snapshot, not to provide investment advice.",
    "Rules:",
    "- Do not provide investment advice, price predictions, or buy/sell/hold instructions.",
    "- Explain only observable portfolio facts, concentration, drawdown, and data quality issues.",
    "- Do not invent risks that are not supported by the provided data.",
    "- The portfolio summary is the source of truth for total valuation, total PnL, and total PnL rate.",
    "- All money amounts are denominated in portfolioSummary.baseCurrency.",
    "- KRW amounts are formatted without decimal places.",
    "- USDT amounts are formatted with exactly 2 decimal places.",
    "- Profit/loss rates must be formatted with exactly 2 decimal places.",
    "- Detailed holding analysis must use only the holdings listed below.",
    "- Assets missing from the holdings list do not have average price data and must be excluded from per-asset PnL analysis.",
    "- If the holdings list is empty, still analyze the total portfolio summary and mention that per-asset average-price analysis is unavailable.",
    "- Keep the tone cautious and descriptive.",
    "Final response formatting rules:",
    "- Return only the insight text, not JSON.",
    "- Do not write one long paragraph.",
    "- Write each main point as a '-' bullet.",
    "- Separate each '-' bullet with a newline.",
    "- Each bullet must be 1 or 2 short Korean sentences.",
    "- Do not make bullets too long because the text is shown in a mobile dialog.",
    "- In the final Korean answer, every KRW amount must look like '1,250,000 KRW' or '-85,000 KRW'.",
    "- In the final Korean answer, every USDT amount must look like '892.86 USDT' or '-12.35 USDT'.",
    "- In the final Korean answer, every rate must look like '7.30%' or '-23.20%'.",
    "Final response examples:",
    "- 전체 평가금액은 1,250,000 KRW이며 총 손익은 85,000 KRW입니다.",
    "- 총 수익률은 7.30%로 현재 포트폴리오는 수익 구간입니다.",
    "- 전체 평가금액은 892.86 USDT이며 총 손익은 60.71 USDT입니다.",
    "Portfolio summary:",
    `baseCurrency: ${portfolioSummary.baseCurrency}`,
    `holdingsCount: ${portfolioSummary.holdingsCount}`,
    `totalValuation: ${formatMoney(
      portfolioSummary.totalValuation,
      portfolioSummary.baseCurrency,
    )}`,
    `totalPnl: ${formatMoney(
      portfolioSummary.totalPnl,
      portfolioSummary.baseCurrency,
    )}`,
    `totalPnlRate: ${formatRate(portfolioSummary.totalPnlRate)}`,
    "Holdings with average price data:",
    holdings || "No holdings with average price data provided.",
    "Write the final response in Korean in 3 short bullet points.",
  ].join("\n");
}
