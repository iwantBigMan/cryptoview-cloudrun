import type { Request, Response } from "express";
import {
  deleteGateIoCredentialByUserId,
  validateAndSaveGateIoCredential,
} from "../services/gateio/gateioCredentialService";
import type {
  GateIoCredentialDeleteResponse,
  GateIoValidateAndSaveRequest,
  GateIoValidateAndSaveResponse,
} from "../types/gateio";

export async function validateAndSaveGateIoCredentialController(
  req: Request<unknown, unknown, Partial<GateIoValidateAndSaveRequest>>,
  res: Response<GateIoValidateAndSaveResponse, { authUserId?: string }>,
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
    const result = await validateAndSaveGateIoCredential(
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
    console.error("validate-and-save Gate.io failed:", error);
    res.status(500).json({
      valid: false,
      message: "Internal server error.",
    });
  }
}

export async function deleteGateIoCredentialController(
  _req: Request,
  res: Response<GateIoCredentialDeleteResponse, { authUserId?: string }>,
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
    await deleteGateIoCredentialByUserId(userId);
    res.status(200).json({
      deleted: true,
      message: "Gate.io credential deleted successfully.",
    });
  } catch (error) {
    console.error("deleteGateIoCredential failed:", error);
    res.status(500).json({
      deleted: false,
      message: "Internal server error.",
    });
  }
}
