export interface PortfolioInsightHoldingInput {
  exchange: string;
  symbol: string;
  quantity: number;
  valuationKrw: number;
  portfolioRatio?: number;
  averagePrice?: number;
  currentPrice?: number;
  pnlKrw?: number;
  pnlRate?: number;
  riskTags?: string[];
}

export interface PortfolioInsightRequest {
  baseCurrency?: string;
  totalValuationKrw?: number;
  totalPnlKrw?: number;
  totalPnlRate?: number;
  holdings: PortfolioInsightHoldingInput[];
}

export interface PortfolioInsightResponse {
  insight: string;
  model: string;
}

export interface AiErrorResponse {
  message: string;
}
