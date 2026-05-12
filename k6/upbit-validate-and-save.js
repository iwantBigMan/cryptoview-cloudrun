import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 1,
  iterations: 1,
};

const BASE_URL =
  __ENV.BASE_URL ||
  "https://cryptoview-api-620339426938.asia-northeast3.run.app";
const FIREBASE_ID_TOKEN = __ENV.FIREBASE_ID_TOKEN || "PUT_FIREBASE_ID_TOKEN_HERE";
const ACCESS_KEY = __ENV.ACCESS_KEY || "PUT_ACCESS_KEY_HERE";
const SECRET_KEY = __ENV.SECRET_KEY || "PUT_SECRET_KEY_HERE";

export default function () {
  const payload = JSON.stringify({
    accessKey: ACCESS_KEY,
    secretKey: SECRET_KEY,
  });

  const response = http.post(
    `${BASE_URL}/api/exchange/upbit/validate-and-save`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${FIREBASE_ID_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  );

  check(response, {
    "status is 200": (res) => res.status === 200,
    "body is not empty": (res) => res.body.length > 0,
  });

  console.log(`status=${response.status}`);
  console.log(`body=${response.body}`);

  sleep(1);
}
