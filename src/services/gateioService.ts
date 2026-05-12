import type {
  GateIoAveragePriceResult,
  GateIoSpotAccountDto,
  GateIoSpotTradeDto,
} from "../types/gateio";
import { createGateIoSignedRequest } from "../utils/exchangeSigner";
import { calculateGateIoSpotAveragePrice } from "../utils/gateioSpotAveragePrice";

const GATEIO_BASE_URL = "https://api.gateio.ws";
const GATEIO_API_PREFIX = "/api/v4";
const GATEIO_REQUEST_TIMEOUT_MS = 30000;
const GATEIO_TRADE_PAGE_LIMIT = 1000;
const DEFAULT_MAX_TRADE_PAGES = 100;

interface GateIoErrorBody {
  label?: string;
  message?: string;
}

function normalizeCurrencyPair(currencyPair: string): string {
  return currencyPair.trim().toUpperCase();
}

function createQueryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

async function parseGateIoError(response: Response): Promise<string> {
  let body: GateIoErrorBody = {};

  try {
    body = (await response.json()) as GateIoErrorBody;
  } catch {
    body = {};
  }

  if (body.message) {
    return body.label ? `${body.label}: ${body.message}` : body.message;
  }

  return `Gate.io API request failed with status ${response.status}.`;
}

async function gateIoGet<T>(params: {
  accessKey: string;
  secretKey: string;
  path: string;
  queryString?: string;
}): Promise<T> {
  const requestPath = `${GATEIO_API_PREFIX}${params.path}`;
  const signedRequest = createGateIoSignedRequest({
    accessKey: params.accessKey,
    secretKey: params.secretKey,
    method: "GET",
    requestPath,
    queryString: params.queryString ?? "",
  });

  const url =
    `${GATEIO_BASE_URL}${requestPath}` +
    (params.queryString ? `?${params.queryString}` : "");

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
    throw new Error(await parseGateIoError(response));
  }

  return (await response.json()) as T;
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
}> {
  const maxPages = Math.max(
    1,
    Math.min(params.maxPages ?? DEFAULT_MAX_TRADE_PAGES, DEFAULT_MAX_TRADE_PAGES),
  );
  const trades: GateIoSpotTradeDto[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const queryString = createQueryString({
      currency_pair: normalizeCurrencyPair(params.currencyPair),
      page,
      limit: GATEIO_TRADE_PAGE_LIMIT,
      from: params.from,
      to: params.to,
    });

    const pageTrades = await gateIoGet<GateIoSpotTradeDto[]>({
      accessKey: params.accessKey,
      secretKey: params.secretKey,
      path: "/spot/my_trades",
      queryString,
    });

    trades.push(...pageTrades);

    if (pageTrades.length < GATEIO_TRADE_PAGE_LIMIT) {
      return {
        trades,
        fetchedPages: page,
        reachedPageLimit: false,
      };
    }
  }

  return {
    trades,
    fetchedPages: maxPages,
    reachedPageLimit: true,
  };
}

export async function getGateIoSpotAveragePrice(params: {
  accessKey: string;
  secretKey: string;
  currencyPair: string;
  from?: number;
  to?: number;
  maxPages?: number;
}): Promise<GateIoAveragePriceResult> {
  const [accounts, tradeResult] = await Promise.all([
    getGateIoSpotAccounts(params.accessKey, params.secretKey),
    getGateIoSpotTrades(params),
  ]);

  const result = calculateGateIoSpotAveragePrice({
    currencyPair: params.currencyPair,
    accounts,
    trades: tradeResult.trades,
    fetchedPages: tradeResult.fetchedPages,
  });

  if (tradeResult.reachedPageLimit) {
    result.warnings.push(
      "Trade history reached maxPages. Increase maxPages or narrow the time range for a more complete average price.",
    );
  }

  return result;
}
