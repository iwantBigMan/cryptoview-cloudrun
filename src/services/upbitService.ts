import { createUpbitJwt } from "../utils/upbitSigner";
import type { UpbitValidationResult } from "../types/upbit";

const UPBIT_ACCOUNTS_URL = "https://api.upbit.com/v1/accounts";

interface UpbitErrorBody {
  error?: {
    name?: string;
    message?: string;
  };
  message?: string;
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

export async function validateUpbitKey(
  accessKey: string,
  secretKey: string,
): Promise<UpbitValidationResult> {
  const token = createUpbitJwt(accessKey, secretKey);

  try {
    const response = await fetch(UPBIT_ACCOUNTS_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

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
