"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpbitKey = validateUpbitKey;
const upbitSigner_1 = require("../utils/upbitSigner");
const UPBIT_ACCOUNTS_URL = "https://api.upbit.com/v1/accounts";
function getFailureMessage(status, body) {
    const errorMessage = body.error?.message ?? body.message;
    if (errorMessage) {
        return errorMessage;
    }
    if (status === 401 || status === 403) {
        return "Upbit API key is invalid.";
    }
    return `Upbit API request failed with status ${status}.`;
}
async function validateUpbitKey(accessKey, secretKey) {
    const token = (0, upbitSigner_1.createUpbitJwt)(accessKey, secretKey);
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
        let errorBody = {};
        try {
            errorBody = (await response.json());
        }
        catch {
            errorBody = {};
        }
        return {
            valid: false,
            message: getFailureMessage(response.status, errorBody),
            statusCode: response.status,
        };
    }
    catch {
        return {
            valid: false,
            message: "Failed to reach Upbit API.",
            statusCode: 502,
        };
    }
}
