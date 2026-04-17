export interface UpbitValidateRequest {
  accessKey: string;
  secretKey: string;
}

export interface UpbitValidateResponse {
  valid: boolean;
  message: string;
}

export interface UpbitValidationResult extends UpbitValidateResponse {
  statusCode: number;
}
