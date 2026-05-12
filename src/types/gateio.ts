export interface GateIoSpotAveragePriceRequest {
  accessKey: string;
  secretKey: string;
  currencyPair: string;
  from?: number;
  to?: number;
  maxPages?: number;
}

export interface GateIoSpotTradeDto {
  id?: string;
  create_time: string;
  create_time_ms?: string;
  currency_pair: string;
  side: "buy" | "sell";
  amount: string;
  price: string;
  fee: string;
  fee_currency: string;
  order_id?: string;
}

export interface GateIoSpotAccountDto {
  currency: string;
  available: string;
  locked: string;
  update_id?: number;
  refresh_time?: string;
}

export interface GateIoAveragePriceResult {
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

