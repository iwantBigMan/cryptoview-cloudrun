import type { Request, Response } from "express";
import { getGateIoAccountsByUserId } from "../../services/gateio/gateioAccountService";
import type { GateIoSpotAccountDto } from "../../types/gateio/gateio";

export async function getGateIoAccountsController(
  _req: Request,
  res: Response<GateIoSpotAccountDto[] | { message: string }, { authUserId?: string }>,
): Promise<void> {
  const userId = res.locals.authUserId;

  if (!userId) {
    res.status(401).json({
      message: "Unauthorized request.",
    });
    return;
  }

  try {
    const accounts = await getGateIoAccountsByUserId(userId);
    res.status(200).json(accounts);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Gate.io credential not found."
    ) {
      res.status(404).json({
        message: error.message,
      });
      return;
    }

    console.error("getGateIoAccounts failed:", error);
    res.status(500).json({
      message: "Internal server error.",
    });
  }
}
