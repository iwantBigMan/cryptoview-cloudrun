import { buildPortfolioInsightPrompt } from "../../domains/ai/portfolioInsightPromptBuilder";
import { generateText } from "../../infrastructure/ai/aiTextGenerationClient";
import type {
  PortfolioInsightRequest,
  PortfolioInsightResponse,
} from "../../types/ai/ai";

export async function generatePortfolioInsight(params: {
  userId: string;
  request: PortfolioInsightRequest;
}): Promise<PortfolioInsightResponse> {
  const prompt = buildPortfolioInsightPrompt(params.request);
  const result = await generateText({ prompt });

  return {
    insight: result.text,
    model: result.model,
  };
}
