export interface UpbitValidateRequest {
  accessKey: string;
  secretKey: string;
}

export interface UpbitValidateAndSaveRequest extends UpbitValidateRequest {}

export interface UpbitValidateResponse {
  valid: boolean;
  message: string;
}

export interface UpbitValidationResult extends UpbitValidateResponse {
  statusCode: number;
}

export interface UpbitValidateAndSaveResponse extends UpbitValidateResponse {
  saved?: boolean;
}

export interface UpbitCredentialDocument {
  accessKeyEncrypted: string;
  secretKeyEncrypted: string;
  isValid: true;
  validatedAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface UpbitDecryptedCredential {
  accessKey: string;
  secretKey: string;
}

export interface UpbitAccountBalanceDto {
  currency: string;
  balance: string;
  locked: string;
  avg_buy_price: string;
  avg_buy_price_modified: boolean;
  unit_currency: string;
}
