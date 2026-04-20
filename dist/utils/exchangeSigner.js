"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGateIoPayloadHash = createGateIoPayloadHash;
exports.createGateIoSignatureString = createGateIoSignatureString;
exports.createGateIoSignature = createGateIoSignature;
exports.createGateIoSignedRequest = createGateIoSignedRequest;
const crypto_1 = require("crypto");
const crypto_2 = require("crypto");
function createGateIoPayloadHash(payload = "") {
    return (0, crypto_2.createHash)("sha512").update(payload, "utf8").digest("hex");
}
function createGateIoSignatureString(params) {
    const timestamp = String(params.timestamp ?? Math.floor(Date.now() / 1000));
    return [
        params.method.toUpperCase(),
        params.requestPath,
        params.queryString ?? "",
        createGateIoPayloadHash(params.payload ?? ""),
        timestamp,
    ].join("\n");
}
function createGateIoSignature(params) {
    const timestamp = String(params.timestamp ?? Math.floor(Date.now() / 1000));
    const sign = (0, crypto_1.createHmac)("sha512", params.secretKey)
        .update(params.signatureString, "utf8")
        .digest("hex");
    return {
        KEY: params.accessKey,
        Timestamp: timestamp,
        SIGN: sign,
    };
}
function createGateIoSignedRequest(params) {
    const timestamp = params.timestamp ?? Math.floor(Date.now() / 1000);
    const signatureString = createGateIoSignatureString({
        method: params.method,
        requestPath: params.requestPath,
        queryString: params.queryString,
        payload: params.payload,
        timestamp,
    });
    const headers = createGateIoSignature({
        accessKey: params.accessKey,
        secretKey: params.secretKey,
        signatureString,
        timestamp,
    });
    return {
        signatureString,
        headers,
    };
}
