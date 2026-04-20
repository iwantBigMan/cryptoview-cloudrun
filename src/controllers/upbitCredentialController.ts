import type { Request, Response } from "express";
import { validateAndSaveUpbitCredential } from "../services/upbitCredentialService";
import type {
  UpbitValidateAndSaveRequest,
  UpbitValidateAndSaveResponse,
} from "../types/upbit";

export async function validateAndSaveUpbitCredentialController(
  req: Request<unknown, unknown, Partial<UpbitValidateAndSaveRequest>>,
  res: Response<UpbitValidateAndSaveResponse>,
): Promise<void> {
  const accessKey = req.body.accessKey?.trim();
  const secretKey = req.body.secretKey?.trim();
  const userId = req.body.userId?.trim();

  if (!accessKey || !secretKey || !userId) {
    res.status(400).json({
      valid: false,
      message: "accessKey, secretKey, and userId are required.",
    });
    return;
  }

  try {
    const result = await validateAndSaveUpbitCredential(
      accessKey,
      secretKey,
      userId,
    );

    res.status(result.statusCode).json({
      valid: result.valid,
      message: result.message,
      saved: result.saved,
    });
  } catch {
    res.status(500).json({
      valid: false,
      message: "Internal server error.",
    });
  }
}
