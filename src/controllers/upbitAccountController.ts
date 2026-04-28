import type { Request, Response } from "express";
import { getUpbitAccountsByUserId } from "../services/upbitAccountService";
import type { UpbitAccountBalanceDto } from "../types/upbit";

export async function getUpbitAccountsController(
  _req: Request,
  res: Response<UpbitAccountBalanceDto[] | { message: string }, { authUserId?: string }>,
): Promise<void> {
  const userId = res.locals.authUserId;

  if (!userId) {
    res.status(401).json({
      message: "Unauthorized request.",
    });
    return;
  }

  try {
    const accounts = await getUpbitAccountsByUserId(userId);
    res.status(200).json(accounts);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Upbit credential not found."
    ) {
      res.status(404).json({
        message: error.message,
      });
      return;
    }

    console.error("getUpbitAccounts failed:", error);
    res.status(500).json({
      message: "Internal server error.",
    });
  }
}
