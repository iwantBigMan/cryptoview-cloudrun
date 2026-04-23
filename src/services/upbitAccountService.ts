import { getUpbitCredential } from "../repositories/upbitCredentialRepository";
import type {
  UpbitAccountBalanceDto,
  UpbitDecryptedCredential,
} from "../types/upbit";
import { decryptText } from "../utils/kms";
import { getUpbitAccounts } from "./upbitService";

export async function getDecryptedUpbitCredential(
  userId: string,
): Promise<UpbitDecryptedCredential | null> {
  const credential = await getUpbitCredential(userId);

  if (!credential) {
    return null;
  }

  const [accessKey, secretKey] = await Promise.all([
    decryptText(credential.accessKeyEncrypted),
    decryptText(credential.secretKeyEncrypted),
  ]);

  return {
    accessKey,
    secretKey,
  };
}

export async function getUpbitAccountsByUserId(
  userId: string,
): Promise<UpbitAccountBalanceDto[]> {
  const credential = await getDecryptedUpbitCredential(userId);

  if (!credential) {
    throw new Error("Upbit credential not found.");
  }

  return getUpbitAccounts(credential.accessKey, credential.secretKey);
}
