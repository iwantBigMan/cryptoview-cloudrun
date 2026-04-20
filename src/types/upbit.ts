export interface UpbitValidateRequest {
  accessKey: string;
  secretKey: string;
}

export interface UpbitValidateAndSaveRequest extends UpbitValidateRequest {
  userId: string;
}

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
