import type { Request, Response } from "express";
import { validateAndSaveUpbitCredential } from "../services/upbitCredentialService";
import type {
  UpbitValidateAndSaveRequest,
  UpbitValidateAndSaveResponse,
} from "../types/upbit";

export async function validateAndSaveUpbitCredentialController(
  req: Request<unknown, unknown, Partial<UpbitValidateAndSaveRequest>>,
  res: Response<UpbitValidateAndSaveResponse, { authUserId?: string }>,
): Promise<void> {
  const accessKey = req.body.accessKey?.trim();
  const secretKey = req.body.secretKey?.trim();
  const userId = res.locals.authUserId;

  if (!accessKey || !secretKey) {
    res.status(400).json({
      valid: false,
      message: "accessKey and secretKey are required.",
    });
    return;
  }

  if (!userId) {
    res.status(401).json({
      valid: false,
      message: "Unauthorized request.",
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
  } catch (error) {
    console.error("validate-and-save failed:", error);
    res.status(500).json({
      valid: false,
      message: "Internal server error.",
    });
  }
}
