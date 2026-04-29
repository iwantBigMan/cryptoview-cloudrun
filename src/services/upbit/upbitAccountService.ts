import { getUpbitCredential } from "../../repositories/upbit/upbitCredentialRepository";
import type {
  UpbitAccountBalanceDto,
  UpbitDecryptedCredential,
  UpbitCredentialPayload,
} from "../../types/upbit/upbit";
import { decryptText } from "../../utils/kms";
import { getUpbitAccounts } from "./upbitService";

export async function getDecryptedUpbitCredential(
  userId: string,
): Promise<UpbitDecryptedCredential | null> {
  const credential = await getUpbitCredential(userId);

  if (!credential) {
    return null;
  }

  if (credential.credentialEncrypted) {
    const decryptedPayload = await decryptText(credential.credentialEncrypted);
    const parsedPayload = JSON.parse(decryptedPayload) as UpbitCredentialPayload;

    return {
      accessKey: parsedPayload.accessKey,
      secretKey: parsedPayload.secretKey,
    };
  }

  if (!credential.accessKeyEncrypted || !credential.secretKeyEncrypted) {
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
