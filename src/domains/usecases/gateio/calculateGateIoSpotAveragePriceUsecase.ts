import { calculateSpotAveragePrice } from "../../averagePrice/spotAveragePriceCalculator";
import type {
  SpotAveragePriceAccount,
  SpotAveragePriceTrade,
} from "../../averagePrice/spotAveragePriceTypes";
import {
  getGateIoSpotAccounts,
  getGateIoSpotTrades,
} from "../../../infrastructure/gateio/gateioApiClient";
import { getGateIoCredential } from "../../../repositories/gateio/gateioCredentialRepository";
import type {
  GateIoAveragePriceResult,
  GateIoCredentialPayload,
  GateIoSpotAccountDto,
  GateIoSpotTradeDto,
} from "../../../types/gateio/gateio";
import { decryptText } from "../../../utils/kms";

function toCreatedAtMs(trade: GateIoSpotTradeDto): number {
  if (trade.create_time_ms) {
    return Number(trade.create_time_ms);
  }

  return Number(trade.create_time) * 1000;
}

function toAveragePriceTrade(
  trade: GateIoSpotTradeDto,
): SpotAveragePriceTrade {
  return {
    side: trade.side,
    amount: trade.amount,
    price: trade.price,
    fee: trade.fee,
    feeCurrency: trade.fee_currency,
    createdAtMs: toCreatedAtMs(trade),
  };
}

function toAveragePriceAccount(
  account: GateIoSpotAccountDto,
): SpotAveragePriceAccount {
  return {
    currency: account.currency,
    available: account.available,
    locked: account.locked,
  };
}

async function getDecryptedGateIoCredential(userId: string): Promise<{
  accessKey: string;
  secretKey: string;
}> {
  const credential = await getGateIoCredential(userId);

  if (!credential?.credentialEncrypted) {
    throw new Error("Gate.io credential not found.");
  }

  const decryptedPayload = await decryptText(credential.credentialEncrypted);
  const parsedPayload = JSON.parse(decryptedPayload) as GateIoCredentialPayload;

  return {
    accessKey: parsedPayload.accessKey,
    secretKey: parsedPayload.secretKey,
  };
}

export async function calculateGateIoSpotAveragePriceUsecase(params: {
  userId: string;
  currencyPair: string;
  from?: number;
  to?: number;
  maxPages?: number;
}): Promise<GateIoAveragePriceResult> {
  const credential = await getDecryptedGateIoCredential(params.userId);
  const [accounts, tradeResult] = await Promise.all([
    getGateIoSpotAccounts(credential.accessKey, credential.secretKey),
    getGateIoSpotTrades({
      accessKey: credential.accessKey,
      secretKey: credential.secretKey,
      currencyPair: params.currencyPair,
      from: params.from,
      to: params.to,
      maxPages: params.maxPages,
    }),
  ]);

  const result = calculateSpotAveragePrice({
    currencyPair: params.currencyPair,
    accounts: accounts.map(toAveragePriceAccount),
    trades: tradeResult.trades.map(toAveragePriceTrade),
    fetchedPages: tradeResult.fetchedPages,
  });

  if (tradeResult.reachedPageLimit) {
    result.warnings.push(
      "Trade history reached maxPages. Increase maxPages or narrow the time range for a more complete average price.",
    );
  }

  if (tradeResult.usedDefaultLookback) {
    result.warnings.push(
      "Trade history was searched over the last 365 days because no from/to range was provided.",
    );
  }

  return result;
}
