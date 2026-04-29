import {
  deleteGateIoCredential,
  saveGateIoCredential,
} from "../../repositories/gateioCredentialRepository";
import type {
  GateIoCredentialPayload,
  GateIoValidationResult,
} from "../../types/gateio";
import { encryptText } from "../../utils/kms";
import { validateGateIoKey } from "./gateioService";

export async function validateAndSaveGateIoCredential(
  accessKey: string,
  secretKey: string,
  userId: string,
): Promise<GateIoValidationResult & { saved?: boolean }> {
  const validationResult = await validateGateIoKey(accessKey, secretKey);

  if (!validationResult.valid) {
    return validationResult;
  }

  const credentialPayload: GateIoCredentialPayload = {
    accessKey,
    secretKey,
  };

  // 거래소 키는 하나의 JSON payload로 묶어 KMS 암호문 하나로 저장합니다.
  const encryptedCredential = await encryptText(
    JSON.stringify(credentialPayload),
  );

  await saveGateIoCredential(userId, encryptedCredential);

  return {
    valid: true,
    message: "Gate.io API key is valid and saved securely.",
    statusCode: 200,
    saved: true,
  };
}

export async function deleteGateIoCredentialByUserId(
  userId: string,
): Promise<void> {
  await deleteGateIoCredential(userId);
}
