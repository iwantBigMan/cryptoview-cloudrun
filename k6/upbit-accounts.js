import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 1,
  iterations: 1,
};

const BASE_URL =
  __ENV.BASE_URL ||
  "https://cryptoview-api-620339426938.us-central1.run.app";
const FIREBASE_ID_TOKEN = __ENV.FIREBASE_ID_TOKEN || "PUT_FIREBASE_ID_TOKEN_HERE";

export default function () {
  const response = http.get(`${BASE_URL}/api/exchange/upbit/accounts`, {
    headers: {
      Authorization: `Bearer ${FIREBASE_ID_TOKEN}`,
    },
  });

  check(response, {
    "status is 200": (res) => res.status === 200,
    "body is not empty": (res) => res.body.length > 0,
  });

  console.log(`status=${response.status}`);
  console.log(`body=${response.body}`);

  sleep(1);
}
