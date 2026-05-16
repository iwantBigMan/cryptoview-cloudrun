export interface PortfolioInsightHoldingInput {
  symbol: string;
  market: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  valuation: number;
  pnl: number;
  pnlRate: number;
}

export interface PortfolioInsightSummaryInput {
  baseCurrency: "KRW" | "USDT";
  holdingsCount: number;
  totalValuation: number;
  totalPnl: number;
  totalPnlRate: number;
}

export interface PortfolioInsightRequest {
  portfolioSummary: PortfolioInsightSummaryInput;
  holdings: PortfolioInsightHoldingInput[];
}

export interface PortfolioInsightResponse {
  insight: string;
  model: string;
}

export interface AiErrorResponse {
  message: string;
}
