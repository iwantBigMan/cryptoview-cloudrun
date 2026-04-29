// Gate.io API 키 검증 요청 body입니다.
export interface GateIoValidateRequest {
  accessKey: string;
  secretKey: string;
}

export interface GateIoValidateAndSaveRequest extends GateIoValidateRequest {}

// 클라이언트에 반환하는 검증 결과의 공통 형태입니다.
export interface GateIoValidateResponse {
  valid: boolean;
  message: string;
}

export interface GateIoValidationResult extends GateIoValidateResponse {
  statusCode: number;
}

export interface GateIoValidateAndSaveResponse extends GateIoValidateResponse {
  saved?: boolean;
}

export interface GateIoCredentialDeleteResponse {
  deleted: boolean;
  message: string;
}

// Firestore users/{uid}/exchangeCredentials/gateio 문서 구조입니다.
export interface GateIoCredentialDocument {
  credentialEncrypted?: string;
  isValid: true;
  validatedAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface GateIoDecryptedCredential {
  accessKey: string;
  secretKey: string;
}

export interface GateIoCredentialPayload {
  accessKey: string;
  secretKey: string;
}

// Gate.io GET /spot/accounts 응답 항목입니다.
export interface GateIoSpotAccountDto {
  currency: string;
  available: string;
  locked: string;
  update_id?: number;
  refresh_time?: number;
}
