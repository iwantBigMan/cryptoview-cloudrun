import type { Request, Response } from "express";
import { getGateIoSpotAveragePrice } from "../services/gateioService";
import type {
  GateIoAveragePriceResult,
  GateIoSpotAveragePriceRequest,
} from "../types/gateio";

type GateIoAveragePriceErrorResponse = {
  message: string;
};

function isValidUnixSeconds(value: number | undefined): boolean {
  return value === undefined || (Number.isInteger(value) && value > 0);
}

export async function getGateIoSpotAveragePriceController(
  req: Request<unknown, unknown, Partial<GateIoSpotAveragePriceRequest>>,
  res: Response<
    GateIoAveragePriceResult | GateIoAveragePriceErrorResponse,
    { authUserId?: string }
  >,
): Promise<void> {
  const accessKey = req.body.accessKey?.trim();
  const secretKey = req.body.secretKey?.trim();
  const currencyPair = req.body.currencyPair?.trim();

  if (!res.locals.authUserId) {
    res.status(401).json({
      message: "Unauthorized request.",
    });
    return;
  }

  if (!accessKey || !secretKey || !currencyPair) {
    res.status(400).json({
      message: "accessKey, secretKey and currencyPair are required.",
    });
    return;
  }

  if (!currencyPair.includes("_")) {
    res.status(400).json({
      message: "currencyPair must use Gate.io format like BTC_USDT.",
    });
    return;
  }

  if (!isValidUnixSeconds(req.body.from) || !isValidUnixSeconds(req.body.to)) {
    res.status(400).json({
      message: "from and to must be Unix timestamps in seconds.",
    });
    return;
  }

  if (
    req.body.from !== undefined &&
    req.body.to !== undefined &&
    req.body.from >= req.body.to
  ) {
    res.status(400).json({
      message: "from must be less than to.",
    });
    return;
  }

  if (
    req.body.maxPages !== undefined &&
    (!Number.isInteger(req.body.maxPages) || req.body.maxPages < 1)
  ) {
    res.status(400).json({
      message: "maxPages must be a positive integer.",
    });
    return;
  }

  try {
    const result = await getGateIoSpotAveragePrice({
      accessKey,
      secretKey,
      currencyPair,
      from: req.body.from,
      to: req.body.to,
      maxPages: req.body.maxPages,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("getGateIoSpotAveragePrice failed:", error);

    res.status(502).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to calculate Gate.io spot average price.",
    });
  }
}
