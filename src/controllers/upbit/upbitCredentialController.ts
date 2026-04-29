import type { Request, Response } from "express";
import {
  deleteUpbitCredentialByUserId,
  validateAndSaveUpbitCredential,
} from "../../services/upbit/upbitCredentialService";
import type {
  UpbitCredentialDeleteResponse,
  UpbitValidateAndSaveRequest,
  UpbitValidateAndSaveResponse,
} from "../../types/upbit/upbit";

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

export async function deleteUpbitCredentialController(
  _req: Request,
  res: Response<UpbitCredentialDeleteResponse, { authUserId?: string }>,
): Promise<void> {
  const userId = res.locals.authUserId;

  if (!userId) {
    res.status(401).json({
      deleted: false,
      message: "Unauthorized request.",
    });
    return;
  }

  try {
    await deleteUpbitCredentialByUserId(userId);
    res.status(200).json({
      deleted: true,
      message: "Upbit credential deleted successfully.",
    });
  } catch (error) {
    console.error("deleteUpbitCredential failed:", error);
    res.status(500).json({
      deleted: false,
      message: "Internal server error.",
    });
  }
}
