import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isEmptyPortfolioInsightRequest,
  isValidPortfolioInsightRequest,
} from "../src/domains/ai/portfolioInsightRequestValidator";
import type { PortfolioInsightRequest } from "../src/types/ai/ai";

const validRequest: PortfolioInsightRequest = {
  portfolioSummary: {
    baseCurrency: "KRW",
    holdingsCount: 5,
    totalValuation: 1250000,
    totalPnl: 85000,
    totalPnlRate: 7.3,
  },
  holdings: [
    {
      symbol: "BTC",
      market: "KRW-BTC",
      quantity: 0.01,
      averagePrice: 90000000,
      currentPrice: 97000000,
      valuation: 970000,
      pnl: 70000,
      pnlRate: 7.77,
    },
  ],
};

test("accepts the new portfolio insight request shape", () => {
  assert.equal(isValidPortfolioInsightRequest(validRequest), true);
});

test("accepts empty holdings when holdingsCount is positive", () => {
  const request: PortfolioInsightRequest = {
    ...validRequest,
    portfolioSummary: {
      ...validRequest.portfolioSummary,
      holdingsCount: 2,
    },
    holdings: [],
  };

  assert.equal(isValidPortfolioInsightRequest(request), true);
  assert.equal(isEmptyPortfolioInsightRequest(request), false);
});

test("treats holdingsCount less than or equal to zero as empty portfolio", () => {
  const request: PortfolioInsightRequest = {
    ...validRequest,
    portfolioSummary: {
      ...validRequest.portfolioSummary,
      holdingsCount: 0,
    },
    holdings: [],
  };

  assert.equal(isValidPortfolioInsightRequest(request), true);
  assert.equal(isEmptyPortfolioInsightRequest(request), true);
});

test("rejects legacy flat request shape", () => {
  assert.equal(
    isValidPortfolioInsightRequest({
      baseCurrency: "KRW",
      totalValuationKrw: 1250000,
      totalPnlKrw: 85000,
      totalPnlRate: 7.3,
      holdingsWithAveragePrice: [],
    } as never),
    false,
  );
});

test("accepts USDT as display currency", () => {
  const request: PortfolioInsightRequest = {
    portfolioSummary: {
      baseCurrency: "USDT",
      holdingsCount: 1,
      totalValuation: 100,
      totalPnl: 10,
      totalPnlRate: 7.3,
    },
    holdings: [
      {
        symbol: "BTC",
        market: "KRW-BTC",
        quantity: 1,
        averagePrice: 90,
        currentPrice: 100,
        valuation: 100,
        pnl: 10,
        pnlRate: 11.11,
      },
    ],
  };

  assert.equal(isValidPortfolioInsightRequest(request), true);
});

test("rejects unsupported display currency", () => {
  assert.equal(
    isValidPortfolioInsightRequest({
      ...validRequest,
      portfolioSummary: {
        ...validRequest.portfolioSummary,
        baseCurrency: "USD",
      },
    } as never),
    false,
  );
});

test("rejects holdings with missing required fields", () => {
  assert.equal(
    isValidPortfolioInsightRequest({
      ...validRequest,
      holdings: [
        {
          symbol: "BTC",
          market: "KRW-BTC",
          quantity: 0.01,
        },
      ],
    } as never),
    false,
  );
});
