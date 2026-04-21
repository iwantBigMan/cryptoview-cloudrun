import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";

interface UpbitJwtPayload {
  access_key: string;
  nonce: string;
}

export function createUpbitJwt(accessKey: string, secretKey: string): string {
  const payload: UpbitJwtPayload = {
    access_key: accessKey,
    nonce: randomUUID(),
  };

  return jwt.sign(payload, secretKey, {
    algorithm: "HS512",
  });
}
