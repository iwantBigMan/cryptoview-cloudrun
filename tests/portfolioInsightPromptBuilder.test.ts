import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPortfolioInsightPrompt } from "../src/domains/ai/portfolioInsightPromptBuilder";

test("formats KRW amounts without decimals in the prompt", () => {
  const prompt = buildPortfolioInsightPrompt({
    portfolioSummary: {
      baseCurrency: "KRW",
      holdingsCount: 1,
      totalValuation: 1250000.4,
      totalPnl: -85000.6,
      totalPnlRate: 7.3,
    },
    holdings: [
      {
        symbol: "BTC",
        market: "KRW-BTC",
        quantity: 0.01,
        averagePrice: 90000000.4,
        currentPrice: 97000000.6,
        valuation: 970000.1,
        pnl: 70000.9,
        pnlRate: 7.77,
      },
    ],
  });

  assert.match(prompt, /totalValuation: 1,250,000 KRW/);
  assert.match(prompt, /totalPnl: -85,001 KRW/);
  assert.match(prompt, /averagePrice: 90,000,000 KRW/);
  assert.match(prompt, /pnlRate: 7\.77%/);
});

test("formats USDT amounts with two decimals in the prompt", () => {
  const prompt = buildPortfolioInsightPrompt({
    portfolioSummary: {
      baseCurrency: "USDT",
      holdingsCount: 1,
      totalValuation: 892.856,
      totalPnl: -12.345,
      totalPnlRate: -23.2,
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
  });

  assert.match(prompt, /totalValuation: 892\.86 USDT/);
  assert.match(prompt, /totalPnl: -12\.35 USDT/);
  assert.match(prompt, /averagePrice: 90\.00 USDT/);
  assert.match(prompt, /totalPnlRate: -23\.20%/);
});

test("includes strict final response bullet formatting rules", () => {
  const prompt = buildPortfolioInsightPrompt({
    portfolioSummary: {
      baseCurrency: "USDT",
      holdingsCount: 1,
      totalValuation: 100,
      totalPnl: 10,
      totalPnlRate: 7.3,
    },
    holdings: [],
  });

  assert.match(prompt, /Write each main point as a '-' bullet/);
  assert.match(prompt, /Separate each '-' bullet with a newline/);
  assert.match(prompt, /every USDT amount must look like '892\.86 USDT'/);
  assert.match(prompt, /every rate must look like '7\.30%'/);
});
