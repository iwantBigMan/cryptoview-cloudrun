import { saveUpbitCredential } from "../repositories/upbitCredentialRepository";
import type { UpbitValidationResult } from "../types/upbit";
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

  let accessKeyEncrypted = "";
  let secretKeyEncrypted = "";
  let mutableAccessKey = accessKey;
  let mutableSecretKey = secretKey;

  try {
    [accessKeyEncrypted, secretKeyEncrypted] = await Promise.all([
      encryptText(mutableAccessKey),
      encryptText(mutableSecretKey),
    ]);

    await saveUpbitCredential(userId, accessKeyEncrypted, secretKeyEncrypted);

    return {
      valid: true,
      message: "Upbit API key is valid and saved securely.",
      statusCode: 200,
      saved: true,
    };
  } finally {
    mutableAccessKey = "";
    mutableSecretKey = "";
    accessKeyEncrypted = "";
    secretKeyEncrypted = "";
  }
}
