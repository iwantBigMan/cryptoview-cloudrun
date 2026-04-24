import {
  deleteUpbitCredential,
  saveUpbitCredential,
} from "../repositories/upbitCredentialRepository";
import type {
  UpbitCredentialPayload,
  UpbitValidationResult,
} from "../types/upbit";
import { encryptText } from "../utils/kms";
import { validateUpbitKey } from "./upbitService";

export async function validateAndSaveUpbitCredential(
  accessKey: string,
  secretKey: string,
  userId: string,
): Promise<UpbitValidationResult & { saved?: boolean }> {
  const validationResult = await validateUpbitKey(accessKey, secretKey);

  if (!validationResult.valid) {
    return validationResult;
  }

  const credentialPayload: UpbitCredentialPayload = {
    accessKey,
    secretKey,
  };

  const encryptedCredential = await encryptText(
    JSON.stringify(credentialPayload),
  );

  await saveUpbitCredential(userId, encryptedCredential);

  return {
    valid: true,
    message: "Upbit API key is valid and saved securely.",
    statusCode: 200,
    saved: true,
  };
}

export async function deleteUpbitCredentialByUserId(
  userId: string,
): Promise<void> {
  await deleteUpbitCredential(userId);
}
