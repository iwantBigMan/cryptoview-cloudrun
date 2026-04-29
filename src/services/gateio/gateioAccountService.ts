import { getGateIoCredential } from "../../repositories/gateioCredentialRepository";
import type {
  GateIoCredentialPayload,
  GateIoDecryptedCredential,
  GateIoSpotAccountDto,
} from "../../types/gateio";
import { decryptText } from "../../utils/kms";
import { getGateIoSpotAccounts } from "./gateioService";

export async function getDecryptedGateIoCredential(
  userId: string,
): Promise<GateIoDecryptedCredential | null> {
  const credential = await getGateIoCredential(userId);

  if (!credential?.credentialEncrypted) {
    return null;
  }

  // 저장 시 accessKey와 secretKey를 하나의 JSON payload로 암호화했으므로 복호화 후 파싱합니다.
  const decryptedPayload = await decryptText(credential.credentialEncrypted);
  const parsedPayload = JSON.parse(decryptedPayload) as GateIoCredentialPayload;

  return {
    accessKey: parsedPayload.accessKey,
    secretKey: parsedPayload.secretKey,
  };
}

export async function getGateIoAccountsByUserId(
  userId: string,
): Promise<GateIoSpotAccountDto[]> {
  const credential = await getDecryptedGateIoCredential(userId);

  if (!credential) {
    throw new Error("Gate.io credential not found.");
  }

  return getGateIoSpotAccounts(credential.accessKey, credential.secretKey);
}
