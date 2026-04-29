import { FieldValue, Firestore } from "@google-cloud/firestore";
import type { GateIoCredentialDocument } from "../../types/gateio/gateio";

const firestore = new Firestore({
  databaseId: process.env.FIRESTORE_DATABASE_ID ?? "cryptoview",
});

export async function saveGateIoCredential(
  userId: string,
  encryptedCredential: string,
): Promise<void> {
  // 거래소별 credential은 Firebase uid 아래의 고정 문서 ID로 저장합니다.
  const documentRef = firestore.doc(
    `users/${userId}/exchangeCredentials/gateio`,
  );

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(documentRef);
    const now = FieldValue.serverTimestamp();

    // createdAt은 최초 저장 시각을 유지하고, 검증/갱신 시각만 새로 씁니다.
    const document: GateIoCredentialDocument = {
      credentialEncrypted: encryptedCredential,
      isValid: true,
      validatedAt: now,
      createdAt: snapshot.exists ? snapshot.get("createdAt") ?? now : now,
      updatedAt: now,
    };

    transaction.set(documentRef, document);
  });
}

export async function getGateIoCredential(
  userId: string,
): Promise<GateIoCredentialDocument | null> {
  const documentRef = firestore.doc(`users/${userId}/exchangeCredentials/gateio`);
  const snapshot = await documentRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();

  if (!data) {
    return null;
  }

  return data as GateIoCredentialDocument;
}

export async function deleteGateIoCredential(userId: string): Promise<void> {
  const documentRef = firestore.doc(`users/${userId}/exchangeCredentials/gateio`);
  await documentRef.delete();
}
