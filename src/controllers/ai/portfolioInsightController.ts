import type { Request, Response } from "express";
import {
  isEmptyPortfolioInsightRequest,
  isValidPortfolioInsightRequest,
} from "../../domains/ai/portfolioInsightRequestValidator";
import {
  AiProviderNotConfiguredError,
  UnsupportedAiProviderError,
} from "../../infrastructure/ai/aiTextGenerationClient";
import { generatePortfolioInsight } from "../../services/ai/portfolioInsightService";
import type {
  AiErrorResponse,
  PortfolioInsightRequest,
  PortfolioInsightResponse,
} from "../../types/ai/ai";

function logPortfolioInsightSnapshot(request: PortfolioInsightRequest): void {
  console.log("AI portfolio insight snapshot received:", {
    baseCurrency: request.portfolioSummary.baseCurrency,
    holdingsCount: request.portfolioSummary.holdingsCount,
    analyzedHoldingsCount: request.holdings.length,
    totalValuation: request.portfolioSummary.totalValuation,
    totalPnl: request.portfolioSummary.totalPnl,
    totalPnlRate: request.portfolioSummary.totalPnlRate,
  });
}

export async function generatePortfolioInsightController(
  req: Request<unknown, unknown, Partial<PortfolioInsightRequest>>,
  res: Response<
    PortfolioInsightResponse | AiErrorResponse,
    { authUserId?: string }
  >,
): Promise<void> {
  const userId = res.locals.authUserId;

  if (!userId) {
    res.status(401).json({
      message: "Unauthorized request.",
    });
    return;
  }

  if (!isValidPortfolioInsightRequest(req.body)) {
    res.status(400).json({
      message:
        "portfolioSummary and holdings must match the portfolio insight request format.",
    });
    return;
  }

  if (isEmptyPortfolioInsightRequest(req.body)) {
    res.status(400).json({
      message: "Portfolio data is empty.",
    });
    return;
  }

  logPortfolioInsightSnapshot(req.body);

  try {
    const result = await generatePortfolioInsight({
      userId,
      request: req.body,
    });

    res.status(200).json(result);
  } catch (error) {
    if (
      error instanceof AiProviderNotConfiguredError ||
      error instanceof UnsupportedAiProviderError
    ) {
      res.status(501).json({
        message: error.message,
      });
      return;
    }

    console.error("generatePortfolioInsight failed:", error);

    res.status(502).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to generate portfolio insight.",
    });
  }
}
