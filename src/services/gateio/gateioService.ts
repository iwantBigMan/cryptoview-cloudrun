import type {
  GateIoSpotAccountDto,
  GateIoValidationResult,
} from "../../types/gateio";
import { createGateIoSignedRequest } from "../../utils/exchangeSigner";

const GATEIO_API_BASE_URL = "https://api.gateio.ws";
const GATEIO_API_PREFIX = "/api/v4";
const GATEIO_SPOT_ACCOUNTS_PATH = "/spot/accounts";
// Gate.io 서명에는 host를 제외하고 /api/v4를 포함한 경로를 사용합니다.
const GATEIO_SPOT_ACCOUNTS_REQUEST_PATH = `${GATEIO_API_PREFIX}${GATEIO_SPOT_ACCOUNTS_PATH}`;
const GATEIO_SPOT_ACCOUNTS_URL = `${GATEIO_API_BASE_URL}${GATEIO_SPOT_ACCOUNTS_REQUEST_PATH}`;
const GATEIO_REQUEST_TIMEOUT_MS = 7000;
const GATEIO_REQUEST_MAX_ATTEMPTS = 2;
const GATEIO_RETRY_DELAY_MS = 200;

interface GateIoErrorBody {
  label?: string;
  message?: string;
}

function createGateIoAuthHeaders(
  accessKey: string,
  secretKey: string,
): HeadersInit {
  // GET /spot/accounts는 query string과 payload가 없으므로 둘 다 빈 문자열로 서명합니다.
  const signedRequest = createGateIoSignedRequest({
    accessKey,
    secretKey,
    method: "GET",
    requestPath: GATEIO_SPOT_ACCOUNTS_REQUEST_PATH,
    queryString: "",
    payload: "",
  });

  return {
    ...signedRequest.headers,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function getFailureMessage(status: number, body: GateIoErrorBody): string {
  if (body.message) {
    return body.message;
  }

  if (body.label) {
    return body.label;
  }

  if (status === 401 || status === 403) {
    return "Gate.io API key is invalid.";
  }

  return `Gate.io API request failed with status ${status}.`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

// 재시도는 과도하게 넓히지 않고, 제한/서버 오류 또는 네트워크 실패에만 적용합니다.
async function fetchGateIoSpotAccounts(
  accessKey: string,
  secretKey: string,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= GATEIO_REQUEST_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(GATEIO_SPOT_ACCOUNTS_URL, {
        method: "GET",
        signal: AbortSignal.timeout(GATEIO_REQUEST_TIMEOUT_MS),
        headers: createGateIoAuthHeaders(accessKey, secretKey),
      });

      if (
        attempt < GATEIO_REQUEST_MAX_ATTEMPTS &&
        isRetryableStatus(response.status)
      ) {
        await sleep(GATEIO_RETRY_DELAY_MS);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt >= GATEIO_REQUEST_MAX_ATTEMPTS) {
        throw error;
      }

      await sleep(GATEIO_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

async function parseGateIoErrorBody(response: Response): Promise<GateIoErrorBody> {
  try {
    return (await response.json()) as GateIoErrorBody;
  } catch {
    return {};
  }
}

export async function validateGateIoKey(
  accessKey: string,
  secretKey: string,
): Promise<GateIoValidationResult> {
  try {
    // private 계좌 조회 성공은 key, secret, 권한, IP whitelist가 모두 유효하다는 의미입니다.
    const response = await fetchGateIoSpotAccounts(accessKey, secretKey);

    if (response.status === 200) {
      return {
        valid: true,
        message: "Gate.io API key is valid.",
        statusCode: 200,
      };
    }

    const errorBody = await parseGateIoErrorBody(response);

    return {
      valid: false,
      message: getFailureMessage(response.status, errorBody),
      statusCode: response.status,
    };
  } catch (error) {
    console.error("Gate.io API request failed:", error);
    return {
      valid: false,
      message: "Failed to reach Gate.io API.",
      statusCode: 502,
    };
  }
}

export async function getGateIoSpotAccounts(
  accessKey: string,
  secretKey: string,
): Promise<GateIoSpotAccountDto[]> {
  const response = await fetchGateIoSpotAccounts(accessKey, secretKey);

  if (!response.ok) {
    const errorBody = await parseGateIoErrorBody(response);
    throw new Error(getFailureMessage(response.status, errorBody));
  }

  return (await response.json()) as GateIoSpotAccountDto[];
}
