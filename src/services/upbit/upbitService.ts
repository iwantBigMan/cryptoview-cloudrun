import { createUpbitJwt } from "../../utils/upbitSigner";
import type {
  UpbitAccountBalanceDto,
  UpbitValidationResult,
} from "../../types/upbit";

const UPBIT_ACCOUNTS_URL = "https://api.upbit.com/v1/accounts";
const UPBIT_REQUEST_TIMEOUT_MS = 7000;
const UPBIT_REQUEST_MAX_ATTEMPTS = 2;
const UPBIT_RETRY_DELAY_MS = 200;

interface UpbitErrorBody {
  error?: {
    name?: string;
    message?: string;
  };
  message?: string;
}

function createUpbitAuthHeaders(
  accessKey: string,
  secretKey: string,
): HeadersInit {
  const token = createUpbitJwt(accessKey, secretKey);

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

function getFailureMessage(status: number, body: UpbitErrorBody): string {
  const errorMessage = body.error?.message ?? body.message;

  if (errorMessage) {
    return errorMessage;
  }

  if (status === 401 || status === 403) {
    return "Upbit API key is invalid.";
  }

  return `Upbit API request failed with status ${status}.`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function fetchUpbitAccounts(
  accessKey: string,
  secretKey: string,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= UPBIT_REQUEST_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(UPBIT_ACCOUNTS_URL, {
        method: "GET",
        signal: AbortSignal.timeout(UPBIT_REQUEST_TIMEOUT_MS),
        headers: createUpbitAuthHeaders(accessKey, secretKey),
      });

      if (
        attempt < UPBIT_REQUEST_MAX_ATTEMPTS &&
        isRetryableStatus(response.status)
      ) {
        await sleep(UPBIT_RETRY_DELAY_MS);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt >= UPBIT_REQUEST_MAX_ATTEMPTS) {
        throw error;
      }

      await sleep(UPBIT_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

export async function validateUpbitKey(
  accessKey: string,
  secretKey: string,
): Promise<UpbitValidationResult> {
  try {
    const response = await fetchUpbitAccounts(accessKey, secretKey);

    if (response.status === 200) {
      return {
        valid: true,
        message: "Upbit API key is valid.",
        statusCode: 200,
      };
    }

    let errorBody: UpbitErrorBody = {};

    try {
      errorBody = (await response.json()) as UpbitErrorBody;
    } catch {
      errorBody = {};
    }

    return {
      valid: false,
      message: getFailureMessage(response.status, errorBody),
      statusCode: response.status,
    };
  } catch (error) {
    console.error("Upbit API request failed:", error);
    return {
      valid: false,
      message: "Failed to reach Upbit API.",
      statusCode: 502,
    };
  }
}

export async function getUpbitAccounts(
  accessKey: string,
  secretKey: string,
): Promise<UpbitAccountBalanceDto[]> {
  const response = await fetchUpbitAccounts(accessKey, secretKey);

  if (!response.ok) {
    let errorBody: UpbitErrorBody = {};

    try {
      errorBody = (await response.json()) as UpbitErrorBody;
    } catch {
      errorBody = {};
    }

    throw new Error(getFailureMessage(response.status, errorBody));
  }

  return (await response.json()) as UpbitAccountBalanceDto[];
}




/*
마켓 api
interface UpbitMarketApi {
    @GET("v1/ticker")
    suspend fun getTickers(
        @Query("markets") markets: String
    ): List<UpbitMarketTickerDto>
} - 안드로이드에서 사용하는 Upbit 마켓 API 
*/
