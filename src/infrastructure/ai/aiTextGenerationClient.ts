export interface GenerateTextParams {
  prompt: string;
}

export interface GenerateTextResult {
  text: string;
  model: string;
}

export class AiProviderNotConfiguredError extends Error {
  constructor(message = "AI provider is not configured.") {
    super(message);
    this.name = "AiProviderNotConfiguredError";
  }
}

export class UnsupportedAiProviderError extends Error {
  constructor(provider: string) {
    super(`AI provider '${provider}' is not supported.`);
    this.name = "UnsupportedAiProviderError";
  }
}

interface OllamaGenerateResponse {
  response?: string;
  model?: string;
}

interface OpenAiResponseContent {
  type?: string;
  text?: string;
}

interface OpenAiResponseOutput {
  type?: string;
  content?: OpenAiResponseContent[];
}

interface OpenAiResponseBody {
  output_text?: string;
  output?: OpenAiResponseOutput[];
  model?: string;
  error?: {
    message?: string;
  };
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new AiProviderNotConfiguredError(`${name} is not configured.`);
  }

  return value;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? `AI request failed with status ${response.status}.`;
  } catch {
    return `AI request failed with status ${response.status}.`;
  }
}

function extractOpenAiText(body: OpenAiResponseBody): string {
  if (body.output_text) {
    return body.output_text;
  }

  const outputText = body.output
    ?.flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" && content.text)
    .map((content) => content.text)
    .join("\n")
    .trim();

  if (outputText) {
    return outputText;
  }

  throw new Error("OpenAI response did not include output text.");
}

async function generateTextWithOllama(
  params: GenerateTextParams,
): Promise<GenerateTextResult> {
  const baseUrl = process.env.OLLAMA_BASE_URL?.trim() ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL?.trim() ?? "llama3.1";
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    signal: AbortSignal.timeout(120000),
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: params.prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const body = (await response.json()) as OllamaGenerateResponse;
  const text = body.response?.trim();

  if (!text) {
    throw new Error("Ollama response did not include generated text.");
  }

  return {
    text,
    model: body.model ?? model,
  };
}

async function generateTextWithOpenAi(
  params: GenerateTextParams,
): Promise<GenerateTextResult> {
  const apiKey = getRequiredEnv("OPENAI_API_KEY");
  const model = getRequiredEnv("OPENAI_MODEL");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: AbortSignal.timeout(120000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: params.prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const body = (await response.json()) as OpenAiResponseBody;

  if (body.error?.message) {
    throw new Error(body.error.message);
  }

  return {
    text: extractOpenAiText(body),
    model: body.model ?? model,
  };
}

export async function generateText(
  params: GenerateTextParams,
): Promise<GenerateTextResult> {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (!provider) {
    throw new AiProviderNotConfiguredError();
  }

  if (provider === "ollama") {
    return generateTextWithOllama(params);
  }

  if (provider === "openai") {
    return generateTextWithOpenAi(params);
  }

  throw new UnsupportedAiProviderError(provider);
}
