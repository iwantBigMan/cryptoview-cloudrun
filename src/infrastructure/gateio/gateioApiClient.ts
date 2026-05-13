import type {
  GateIoSpotAccountDto,
  GateIoSpotTradeDto,
  GateIoValidationResult,
} from "../../types/gateio/gateio";
import { createGateIoSignedRequest } from "../../utils/exchangeSigner";

const GATEIO_API_BASE_URL = "https://api.gateio.ws";
const GATEIO_API_PREFIX = "/api/v4";
const GATEIO_REQUEST_TIMEOUT_MS = 30000;
const GATEIO_TRADE_PAGE_LIMIT = 1000;
const DEFAULT_MAX_TRADE_PAGES = 100;
const DEFAULT_TRADE_LOOKBACK_DAYS = 365;
const GATEIO_MAX_TRADE_RANGE_SECONDS = 30 * 24 * 60 * 60;
const DAY_SECONDS = 24 * 60 * 60;

interface GateIoErrorBody {
  label?: string;
  message?: string;
}

function normalizeCurrencyPair(currencyPair: string): string {
  return currencyPair.trim().toUpperCase();
}

function createQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

function createDefaultTradeTimeRanges(): Array<{ from: number; to: number }> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const firstFrom = nowSeconds - DEFAULT_TRADE_LOOKBACK_DAYS * DAY_SECONDS;
  const ranges: Array<{ from: number; to: number }> = [];

  for (
    let from = firstFrom;
    from <= nowSeconds;
    from += GATEIO_MAX_TRADE_RANGE_SECONDS + 1
  ) {
    ranges.push({
      from,
      to: Math.min(from + GATEIO_MAX_TRADE_RANGE_SECONDS, nowSeconds),
    });
  }

  return ranges;
}

function createTradeTimeRanges(params: {
  from?: number;
  to?: number;
}): Array<{ from?: number; to?: number }> {
  if (params.from !== undefined || params.to !== undefined) {
    return [{ from: params.from, to: params.to }];
  }

  return createDefaultTradeTimeRanges();
}

function getFailureMessage(status: number, body: GateIoErrorBody): string {
  if (body.message) {
    return body.label ? `${body.label}: ${body.message}` : body.message;
  }

  if (body.label) {
    return body.label;
  }

  if (status === 401 || status === 403) {
    return "Gate.io API key is invalid.";
  }

  return `Gate.io API request failed with status ${status}.`;
}

async function parseGateIoErrorBody(response: Response): Promise<GateIoErrorBody> {
  try {
    return (await response.json()) as GateIoErrorBody;
  } catch {
    return {};
  }
}

async function gateIoGet<T>(params: {
  accessKey: string;
  secretKey: string;
  path: string;
  queryString?: string;
}): Promise<T> {
  const requestPath = `${GATEIO_API_PREFIX}${params.path}`;
  const queryString = params.queryString ?? "";
  const signedRequest = createGateIoSignedRequest({
    accessKey: params.accessKey,
    secretKey: params.secretKey,
    method: "GET",
    requestPath,
    queryString,
    payload: "",
  });
  const url =
    `${GATEIO_API_BASE_URL}${requestPath}` +
    (queryString ? `?${queryString}` : "");

  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(GATEIO_REQUEST_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...signedRequest.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      getFailureMessage(response.status, await parseGateIoErrorBody(response)),
    );
  }

  return (await response.json()) as T;
}

export async function validateGateIoKey(
  accessKey: string,
  secretKey: string,
): Promise<GateIoValidationResult> {
  try {
    await getGateIoSpotAccounts(accessKey, secretKey);

    return {
      valid: true,
      message: "Gate.io API key is valid.",
      statusCode: 200,
    };
  } catch (error) {
    return {
      valid: false,
      message:
        error instanceof Error ? error.message : "Failed to reach Gate.io API.",
      statusCode: 502,
    };
  }
}

export async function getGateIoSpotAccounts(
  accessKey: string,
  secretKey: string,
): Promise<GateIoSpotAccountDto[]> {
  return gateIoGet<GateIoSpotAccountDto[]>({
    accessKey,
    secretKey,
    path: "/spot/accounts",
  });
}

export async function getGateIoSpotTrades(params: {
  accessKey: string;
  secretKey: string;
  currencyPair: string;
  from?: number;
  to?: number;
  maxPages?: number;
}): Promise<{
  trades: GateIoSpotTradeDto[];
  fetchedPages: number;
  reachedPageLimit: boolean;
  usedDefaultLookback: boolean;
}> {
  const maxPages = Math.max(
    1,
    Math.min(params.maxPages ?? DEFAULT_MAX_TRADE_PAGES, DEFAULT_MAX_TRADE_PAGES),
  );
  const trades: GateIoSpotTradeDto[] = [];
  const timeRanges = createTradeTimeRanges({
    from: params.from,
    to: params.to,
  });
  let fetchedPages = 0;
  let reachedPageLimit = false;

  for (const range of timeRanges) {
    for (let page = 1; page <= maxPages; page += 1) {
      const queryString = createQueryString({
        currency_pair: normalizeCurrencyPair(params.currencyPair),
        page,
        limit: GATEIO_TRADE_PAGE_LIMIT,
        from: range.from,
        to: range.to,
      });

      const pageTrades = await gateIoGet<GateIoSpotTradeDto[]>({
        accessKey: params.accessKey,
        secretKey: params.secretKey,
        path: "/spot/my_trades",
        queryString,
      });

      fetchedPages += 1;
      trades.push(...pageTrades);

      if (pageTrades.length < GATEIO_TRADE_PAGE_LIMIT) {
        break;
      }

      if (page === maxPages) {
        reachedPageLimit = true;
      }
    }
  }

  return {
    trades,
    fetchedPages,
    reachedPageLimit,
    usedDefaultLookback: params.from === undefined && params.to === undefined,
  };
}

