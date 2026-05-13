import type { Request, Response } from "express";
import { generatePortfolioInsight } from "../../services/ai/portfolioInsightService";
import {
  AiProviderNotConfiguredError,
  UnsupportedAiProviderError,
} from "../../infrastructure/ai/aiTextGenerationClient";
import type {
  AiErrorResponse,
  PortfolioInsightRequest,
  PortfolioInsightResponse,
} from "../../types/ai/ai";

function isValidHolding(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const holding = value as Record<string, unknown>;

  return (
    typeof holding.exchange === "string" &&
    typeof holding.symbol === "string" &&
    typeof holding.quantity === "number" &&
    typeof holding.valuationKrw === "number" &&
    (holding.portfolioRatio === undefined ||
      typeof holding.portfolioRatio === "number") &&
    (holding.riskTags === undefined ||
      (Array.isArray(holding.riskTags) &&
        holding.riskTags.every((item) => typeof item === "string")))
  );
}

function isValidPortfolioInsightRequest(
  body: Partial<PortfolioInsightRequest>,
): body is PortfolioInsightRequest {
  return Array.isArray(body.holdings) && body.holdings.every(isValidHolding);
}

function logPortfolioInsightSnapshot(request: PortfolioInsightRequest): void {
  console.log("AI portfolio insight snapshot received:", {
    baseCurrency: request.baseCurrency ?? "KRW",
    holdingsCount: request.holdings.length,
    totalValuationKrw: request.totalValuationKrw,
    totalPnlKrw: request.totalPnlKrw,
    totalPnlRate: request.totalPnlRate,
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
      message: "holdings must be an array of portfolio holding data.",
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
