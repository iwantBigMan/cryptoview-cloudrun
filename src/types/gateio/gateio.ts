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

export interface GateIoSpotAveragePriceRequest {
  accessKey: string;
  secretKey: string;
  currencyPair: string;
  from?: number;
  to?: number;
  maxPages?: number;
}

export interface GateIoSpotTradeDto {
  id?: string;
  create_time: string;
  create_time_ms?: string;
  currency_pair: string;
  side: "buy" | "sell";
  amount: string;
  price: string;
  fee: string;
  fee_currency: string;
  order_id?: string;
}

export interface GateIoAveragePriceResult {
  currencyPair: string;
  baseCurrency: string;
  quoteCurrency: string;
  quantity: string;
  currentQuantity: string;
  averagePrice: string;
  totalCost: string;
  tradeCount: number;
  fetchedPages: number;
  fees: {
    baseCurrency: string;
    quoteCurrency: string;
    other: Array<{
      currency: string;
      amount: string;
    }>;
  };
  warnings: string[];
}
