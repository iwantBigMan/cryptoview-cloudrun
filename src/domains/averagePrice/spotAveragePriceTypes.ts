export interface SpotAveragePriceTrade {
  side: "buy" | "sell";
  amount: string;
  price: string;
  fee: string;
  feeCurrency: string;
  createdAtMs: number;
}

export interface SpotAveragePriceAccount {
  currency: string;
  available: string;
  locked: string;
}

export interface SpotAveragePriceResult {
  currencyPair: string;
  baseCurrency: string;
  quoteCurrency: string;
  quantity: string;
  currentQuantity: string;
  averagePrice: string;
  totalCost: string;
  tradeCount: number;
  fetchedPages: number;
  fees: {
    baseCurrency: string;
    quoteCurrency: string;
    other: Array<{
      currency: string;
      amount: string;
    }>;
  };
  warnings: string[];
}

