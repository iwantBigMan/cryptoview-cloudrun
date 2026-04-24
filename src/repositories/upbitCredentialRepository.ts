import { FieldValue, Firestore } from "@google-cloud/firestore";
import type { UpbitCredentialDocument } from "../types/upbit";

const firestore = new Firestore({
  databaseId: process.env.FIRESTORE_DATABASE_ID ?? "cryptoview",
});

export async function saveUpbitCredential(
  userId: string,
  encryptedCredential: string,
): Promise<void> {
  const documentRef = firestore.doc(
    `users/${userId}/exchangeCredentials/upbit`,
  );

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(documentRef);
    const now = FieldValue.serverTimestamp();

    const document: UpbitCredentialDocument = {
      credentialEncrypted: encryptedCredential,
      isValid: true,
      validatedAt: now,
      createdAt: snapshot.exists ? snapshot.get("createdAt") ?? now : now,
      updatedAt: now,
    };

    transaction.set(documentRef, document);
  });
}

export async function getUpbitCredential(
  userId: string,
): Promise<UpbitCredentialDocument | null> {
  const documentRef = firestore.doc(`users/${userId}/exchangeCredentials/upbit`);
  const snapshot = await documentRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();

  if (!data) {
    return null;
  }

  return data as UpbitCredentialDocument;
}

export async function deleteUpbitCredential(userId: string): Promise<void> {
  const documentRef = firestore.doc(`users/${userId}/exchangeCredentials/upbit`);
  await documentRef.delete();
}
