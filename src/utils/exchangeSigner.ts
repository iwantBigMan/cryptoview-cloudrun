import { createHmac } from "crypto";
import { createHash } from "crypto";

export interface GateIoSignatureHeaders {
  KEY: string;
  Timestamp: string;
  SIGN: string;
}

export interface CreateGateIoSignatureParams {
  accessKey: string;
  secretKey: string;
  signatureString: string;
  timestamp?: number;
}

export interface CreateGateIoSignatureStringParams {
  method: string;
  requestPath: string;
  queryString?: string;
  payload?: string;
  timestamp?: number;
}

export interface GateIoSignedRequest {
  signatureString: string;
  headers: GateIoSignatureHeaders;
}

export function createGateIoPayloadHash(payload = ""): string {
  return createHash("sha512").update(payload, "utf8").digest("hex");
}

export function createGateIoSignatureString(
  params: CreateGateIoSignatureStringParams,
): string {
  const timestamp = String(
    params.timestamp ?? Math.floor(Date.now() / 1000),
  );

  return [
    params.method.toUpperCase(),
    params.requestPath,
    params.queryString ?? "",
    createGateIoPayloadHash(params.payload ?? ""),
    timestamp,
  ].join("\n");
}

export function createGateIoSignature(
  params: CreateGateIoSignatureParams,
): GateIoSignatureHeaders {
  const timestamp = String(
    params.timestamp ?? Math.floor(Date.now() / 1000),
  );

  const sign = createHmac("sha512", params.secretKey)
    .update(params.signatureString, "utf8")
    .digest("hex");

  return {
    KEY: params.accessKey,
    Timestamp: timestamp,
    SIGN: sign,
  };
}

export function createGateIoSignedRequest(
  params: CreateGateIoSignatureStringParams & {
    accessKey: string;
    secretKey: string;
  },
): GateIoSignedRequest {
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
