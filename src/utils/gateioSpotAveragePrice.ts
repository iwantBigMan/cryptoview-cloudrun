import Decimal from "decimal.js";
import type {
  GateIoAveragePriceResult,
  GateIoSpotAccountDto,
  GateIoSpotTradeDto,
} from "../types/gateio/gateio";

const ZERO = new Decimal(0);
const BALANCE_DIFF_TOLERANCE = new Decimal("0.00000001");

function decimal(value: string | number | undefined): Decimal {
  if (value === undefined || value === "") {
    return ZERO;
  }

  return new Decimal(value);
}

function normalizeCurrencyPair(currencyPair: string): {
  currencyPair: string;
  baseCurrency: string;
  quoteCurrency: string;
} {
  const normalized = currencyPair.trim().toUpperCase();
  const [baseCurrency, quoteCurrency] = normalized.split("_");

  if (!baseCurrency || !quoteCurrency) {
    throw new Error("currencyPair must use Gate.io format like BTC_USDT.");
  }

  return {
    currencyPair: normalized,
    baseCurrency,
    quoteCurrency,
  };
}

function getTradeTime(trade: GateIoSpotTradeDto): number {
  if (trade.create_time_ms) {
    return Number(trade.create_time_ms);
  }

  return Number(trade.create_time) * 1000;
}

function addOtherFee(
  otherFees: Map<string, Decimal>,
  currency: string,
  fee: Decimal,
): void {
  const previous = otherFees.get(currency) ?? ZERO;
  otherFees.set(currency, previous.plus(fee));
}

export function calculateGateIoSpotAveragePrice(params: {
  currencyPair: string;
  trades: GateIoSpotTradeDto[];
  accounts: GateIoSpotAccountDto[];
  fetchedPages: number;
}): GateIoAveragePriceResult {
  const { currencyPair, baseCurrency, quoteCurrency } = normalizeCurrencyPair(
    params.currencyPair,
  );
  const warnings = new Set<string>();
  const otherFees = new Map<string, Decimal>();
  const sortedTrades = [...params.trades].sort(
    (a, b) => getTradeTime(a) - getTradeTime(b),
  );

  let quantity = ZERO;
  let totalCost = ZERO;
  let baseFees = ZERO;
  let quoteFees = ZERO;

  for (const trade of sortedTrades) {
    const amount = decimal(trade.amount);
    const price = decimal(trade.price);
    const fee = decimal(trade.fee);
    const feeCurrency = trade.fee_currency.toUpperCase();

    if (trade.side === "buy") {
      let acquiredQuantity = amount;
      let cost = amount.mul(price);

      if (fee.gt(ZERO) && feeCurrency === baseCurrency) {
        acquiredQuantity = acquiredQuantity.minus(fee);
        baseFees = baseFees.plus(fee);
      } else if (fee.gt(ZERO) && feeCurrency === quoteCurrency) {
        cost = cost.plus(fee);
        quoteFees = quoteFees.plus(fee);
      } else if (fee.gt(ZERO)) {
        addOtherFee(otherFees, feeCurrency, fee);
      }

      if (acquiredQuantity.lte(ZERO)) {
        warnings.add("A buy trade had a fee greater than or equal to its amount.");
        continue;
      }

      quantity = quantity.plus(acquiredQuantity);
      totalCost = totalCost.plus(cost);
      continue;
    }

    if (trade.side === "sell") {
      let removedQuantity = amount;

      if (fee.gt(ZERO) && feeCurrency === baseCurrency) {
        removedQuantity = removedQuantity.plus(fee);
        baseFees = baseFees.plus(fee);
      } else if (fee.gt(ZERO) && feeCurrency === quoteCurrency) {
        quoteFees = quoteFees.plus(fee);
      } else if (fee.gt(ZERO)) {
        addOtherFee(otherFees, feeCurrency, fee);
      }

      if (quantity.lte(ZERO)) {
        warnings.add("A sell trade appeared before any tracked buy quantity.");
        quantity = ZERO;
        totalCost = ZERO;
        continue;
      }

      const currentAveragePrice = totalCost.div(quantity);

      if (removedQuantity.gte(quantity)) {
        if (removedQuantity.gt(quantity)) {
          warnings.add(
            "Sell quantity exceeded tracked quantity. Older trades or transfers may be missing.",
          );
        }

        quantity = ZERO;
        totalCost = ZERO;
        continue;
      }

      quantity = quantity.minus(removedQuantity);
      totalCost = totalCost.minus(currentAveragePrice.mul(removedQuantity));
    }
  }

  const account = params.accounts.find(
    (item) => item.currency.toUpperCase() === baseCurrency,
  );
  const currentQuantity = account
    ? decimal(account.available).plus(decimal(account.locked))
    : ZERO;

  const balanceDiff = currentQuantity.minus(quantity).abs();

  if (balanceDiff.gt(BALANCE_DIFF_TOLERANCE)) {
    warnings.add(
      "Calculated quantity differs from Gate.io spot balance. Deposits, withdrawals, airdrops, or incomplete trade history may affect the average price.",
    );
  }

  const averagePrice = quantity.gt(ZERO) ? totalCost.div(quantity) : ZERO;

  return {
    currencyPair,
    baseCurrency,
    quoteCurrency,
    quantity: quantity.toString(),
    currentQuantity: currentQuantity.toString(),
    averagePrice: averagePrice.toString(),
    totalCost: totalCost.toString(),
    tradeCount: sortedTrades.length,
    fetchedPages: params.fetchedPages,
    fees: {
      baseCurrency: baseFees.toString(),
      quoteCurrency: quoteFees.toString(),
      other: [...otherFees.entries()].map(([currency, amount]) => ({
        currency,
        amount: amount.toString(),
      })),
    },
    warnings: [...warnings],
  };
}
