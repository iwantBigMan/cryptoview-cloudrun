import { KeyManagementServiceClient } from "@google-cloud/kms";

const kmsClient = new KeyManagementServiceClient();

function getKmsKeyName(): string {
  const keyName = process.env.GOOGLE_CLOUD_KMS_KEY_NAME;

  if (!keyName) {
    throw new Error("GOOGLE_CLOUD_KMS_KEY_NAME is not configured.");
  }

  return keyName;
}

export async function encryptText(plain: string): Promise<string> {
  const [result] = await kmsClient.encrypt({
    name: getKmsKeyName(),
    plaintext: Buffer.from(plain, "utf8"),
  });

  const ciphertext = result.ciphertext;

  if (!ciphertext) {
    throw new Error("KMS encryption returned an empty ciphertext.");
  }

  return Buffer.from(ciphertext).toString("base64");
}

export async function decryptText(cipher: string): Promise<string> {
  const [result] = await kmsClient.decrypt({
    name: getKmsKeyName(),
    ciphertext: Buffer.from(cipher, "base64"),
  });

  const plaintext = result.plaintext;

  if (!plaintext) {
    throw new Error("KMS decryption returned an empty plaintext.");
  }

  return Buffer.from(plaintext).toString("utf8");
}
