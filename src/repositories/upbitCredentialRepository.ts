import { FieldValue, Firestore } from "@google-cloud/firestore";
import type { UpbitCredentialDocument } from "../types/upbit";

const firestore = new Firestore({
  databaseId: process.env.FIRESTORE_DATABASE_ID ?? "cryptoview",
});

export async function saveUpbitCredential(
  userId: string,
  encryptedAccessKey: string,
  encryptedSecretKey: string,
): Promise<void> {
  const documentRef = firestore.doc(
    `users/${userId}/exchangeCredentials/upbit`,
  );

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(documentRef);
    const now = FieldValue.serverTimestamp();

    const document: UpbitCredentialDocument = {
      accessKeyEncrypted: encryptedAccessKey,
      secretKeyEncrypted: encryptedSecretKey,
      isValid: true,
      validatedAt: now,
      createdAt: snapshot.exists ? snapshot.get("createdAt") ?? now : now,
      updatedAt: now,
    };

    transaction.set(documentRef, document);
  });
}
