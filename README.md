# CryptoView Cloud Run Backend

Node.js, Express, TypeScript 기반의 CryptoView 서버리스 API 백엔드입니다.

현재 백엔드는 Firebase 인증 사용자를 기준으로 Upbit과 Gate.io API 키를 검증하고, Google Cloud KMS로 암호화해 Firestore에 저장합니다. 이후 자산 조회 요청이 들어오면 Firestore에 저장된 암호문을 KMS로 복호화한 뒤 거래소 private API 호출을 서버에서 대행합니다.

## 핵심 목표

- Android 앱에서 거래소 API 키를 직접 저장하거나 장기 보관하지 않도록 역할을 분리합니다.
- 사용자 식별은 클라이언트가 보낸 `userId`가 아니라 Firebase ID Token 검증 결과의 `uid`를 사용합니다.
- Firestore에는 평문 키가 아니라 KMS 암호문만 저장합니다.
- 거래소 private API 호출은 Android 앱이 아니라 Cloud Run 백엔드가 수행합니다.

## 기술 스택

- Node.js 20
- Express 5
- TypeScript
- Firebase Admin SDK
- Google Cloud Firestore
- Google Cloud KMS
- Google Cloud Run
- k6

## 프로젝트 구조

```text
src/
  controllers/
    gateio/
      gateioAccountController.ts
      gateioCredentialController.ts
    upbit/
      upbitAccountController.ts
      upbitCredentialController.ts
  middlewares/
    firebaseAuth.ts
  repositories/
    gateio/
      gateioCredentialRepository.ts
    upbit/
      upbitCredentialRepository.ts
  routes/
    gateio/
      exchangeGateio.ts
    upbit/
      exchangeUpbit.ts
  services/
    gateio/
      gateioAccountService.ts
      gateioCredentialService.ts
      gateioService.ts
    upbit/
      upbitAccountService.ts
      upbitCredentialService.ts
      upbitService.ts
  types/
    gateio/
      gateio.ts
    upbit/
      upbit.ts
  utils/
    exchangeSigner.ts
    kms.ts
    upbitSigner.ts
  index.ts
k6/
  upbit-accounts.js
  upbit-validate-and-save.js
```

역할 분리:
- `routes`: API 경로와 인증 미들웨어 연결
- `controllers`: 요청 검증, 서비스 호출, HTTP 응답 처리
- `services`: 거래소 검증, KMS 암복호화, 조회 흐름 처리
- `repositories`: Firestore 문서 저장, 조회, 삭제
- `utils`: KMS, Upbit JWT, Gate.io HMAC 서명
- `types`: 요청, 응답, Firestore 문서 DTO

## 인증 흐름

모든 거래소 저장, 조회, 삭제 API는 Firebase ID Token이 필요합니다.

```text
Authorization: Bearer <Firebase ID Token>
```

서버는 `firebaseAuth.ts` 미들웨어에서 토큰을 검증하고, 검증된 `uid`를 기준으로 Firestore 경로를 결정합니다.

## 공통 저장 흐름

1. Android 앱이 Firebase 로그인 후 ID Token을 발급받습니다.
2. 앱이 `Authorization` 헤더와 거래소 `accessKey`, `secretKey`를 서버로 보냅니다.
3. 서버가 Firebase ID Token을 검증해 `uid`를 추출합니다.
4. 서버가 거래소 private account API를 호출해 키 유효성을 검증합니다.
5. 검증 성공 시 `{ accessKey, secretKey }` JSON payload를 KMS로 암호화합니다.
6. Firestore에는 `credentialEncrypted` 암호문만 저장합니다.

## 공통 조회 흐름

1. Android 앱이 Firebase ID Token과 함께 자산 조회 API를 호출합니다.
2. 서버가 토큰을 검증해 `uid`를 추출합니다.
3. Firestore에서 `users/{uid}/exchangeCredentials/{exchange}` 문서를 조회합니다.
4. `credentialEncrypted` 값을 KMS로 복호화합니다.
5. 복호화된 키로 거래소 private account API를 호출합니다.
6. 거래소 응답을 Android 앱에 반환합니다.

## API 목록

### 상태 확인

#### `GET /`

Cloud Run 기본 확인용 엔드포인트입니다.

```text
Cloud Run TS Server OK
```

#### `GET /test`

```json
{
  "message": "success from cloud run"
}
```

#### `GET /ip`

현재 Cloud Run outbound IP를 확인합니다.

#### `GET /my-ip`

`/ip`와 동일한 호환용 엔드포인트입니다.

## Upbit API

Base path:

```text
/api/exchange/upbit
```

### `POST /api/exchange/upbit/validate-and-save`

Upbit API 키를 검증하고, 성공 시 KMS 암호문을 Firestore에 저장합니다.

요청 헤더:

```text
Authorization: Bearer <Firebase ID Token>
Content-Type: application/json
```

요청 body:

```json
{
  "accessKey": "string",
  "secretKey": "string"
}
```

성공 응답:

```json
{
  "valid": true,
  "message": "Upbit API key is valid and saved securely.",
  "saved": true
}
```

### `GET /api/exchange/upbit/accounts`

저장된 Upbit credential을 복호화해 Upbit `/v1/accounts`를 호출합니다.

요청 헤더:

```text
Authorization: Bearer <Firebase ID Token>
```

성공 응답 예시:

```json
[
  {
    "currency": "BTC",
    "balance": "0.001",
    "locked": "0.0",
    "avg_buy_price": "95000000",
    "avg_buy_price_modified": false,
    "unit_currency": "KRW"
  }
]
```

### `DELETE /api/exchange/upbit/credential`

현재 Firebase 사용자에 저장된 Upbit credential 문서를 삭제합니다.

요청 헤더:

```text
Authorization: Bearer <Firebase ID Token>
```

성공 응답:

```json
{
  "deleted": true,
  "message": "Upbit credential deleted successfully."
}
```

## Gate.io API

Base path:

```text
/api/exchange/gateio
```

### `POST /api/exchange/gateio/validate-and-save`

Gate.io API 키를 검증하고, 성공 시 KMS 암호문을 Firestore에 저장합니다.

요청 헤더:

```text
Authorization: Bearer <Firebase ID Token>
Content-Type: application/json
```

요청 body:

```json
{
  "accessKey": "string",
  "secretKey": "string"
}
```

성공 응답:

```json
{
  "valid": true,
  "message": "Gate.io API key is valid and saved securely.",
  "saved": true
}
```

### `GET /api/exchange/gateio/accounts`

저장된 Gate.io credential을 복호화해 Gate.io spot account API를 호출합니다.

요청 헤더:

```text
Authorization: Bearer <Firebase ID Token>
```

성공 응답 예시:

```json
[
  {
    "currency": "USDT",
    "available": "10.5",
    "locked": "0"
  }
]
```

### `DELETE /api/exchange/gateio/credential`

현재 Firebase 사용자에 저장된 Gate.io credential 문서를 삭제합니다.

요청 헤더:

```text
Authorization: Bearer <Firebase ID Token>
```

성공 응답:

```json
{
  "deleted": true,
  "message": "Gate.io credential deleted successfully."
}
```

## Firestore 저장 구조

Upbit:

```text
users/{uid}/exchangeCredentials/upbit
```

Gate.io:

```text
users/{uid}/exchangeCredentials/gateio
```

현재 문서 구조:

```json
{
  "credentialEncrypted": "base64 ciphertext",
  "isValid": true,
  "validatedAt": "serverTimestamp",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Upbit 조회 로직은 이전 저장 형식인 `accessKeyEncrypted`, `secretKeyEncrypted`도 읽을 수 있도록 fallback을 유지합니다.

## 거래소 인증 방식

### Upbit

- JWT 기반 인증
- payload: `access_key`, `nonce`
- signing algorithm: `HS512`
- header: `Authorization: Bearer <jwt>`

### Gate.io

- HMAC-SHA512 기반 서명
- signature string:

```text
METHOD
REQUEST_PATH
QUERY_STRING
SHA512(PAYLOAD)
TIMESTAMP
```

- headers:

```text
KEY: <accessKey>
Timestamp: <seconds>
SIGN: <hmac-sha512 signature>
```

## 환경 변수

### `PORT`

Cloud Run 실행 포트입니다. 없으면 `8080`을 사용합니다.

### `FIREBASE_PROJECT_ID`

Firebase ID Token 검증에 사용할 프로젝트 ID입니다.

예:

```text
crytoview
```

### `FIRESTORE_DATABASE_ID`

Firestore database ID입니다.

예:

```text
cryptoview
```

### `GOOGLE_CLOUD_KMS_KEY_NAME`

KMS 키 전체 리소스 이름입니다.

예:

```text
projects/crytoview/locations/global/keyRings/cryptoview-ring/cryptoKeys/exchange-credentials-key
```

## IAM 권한

Cloud Run 서비스 계정에는 최소 아래 권한이 필요합니다.

- `roles/datastore.user`
- `roles/cloudkms.cryptoKeyEncrypterDecrypter`

서비스 계정 확인:

```powershell
gcloud run services describe cryptoview-api `
  --region asia-northeast3 `
  --format="value(spec.template.spec.serviceAccountName)"
```

## Cloud Run 배포

기본 배포:

```powershell
gcloud run deploy cryptoview-api `
  --source . `
  --region asia-northeast3 `
  --allow-unauthenticated `
  --set-env-vars "FIREBASE_PROJECT_ID=crytoview,FIRESTORE_DATABASE_ID=cryptoview,GOOGLE_CLOUD_KMS_KEY_NAME=projects/crytoview/locations/global/keyRings/cryptoview-ring/cryptoKeys/exchange-credentials-key"
```

Upbit/Gate.io API 키에 허용 IP를 설정하는 경우 Cloud Run outbound IP를 고정해야 합니다. 현재 문서는 아래 흐름을 기준으로 합니다.

```text
Cloud Run -> Direct VPC egress -> default VPC -> Cloud NAT -> static external IP -> exchange API
```

## 로컬 실행

의존성 설치:

```bash
npm install
```

타입 체크:

```bash
npx tsc --noEmit
```

개발 서버:

```bash
npm run dev
```

빌드:

```bash
npm run build
```

프로덕션 실행:

```bash
npm start
```

로컬에서 Firebase, Firestore, KMS를 호출하려면 Google Application Default Credentials 또는 서비스 계정 인증이 필요합니다.

## 테스트 예시

### Upbit 저장

```bash
curl -X POST "https://cryptoview-api-620339426938.asia-northeast3.run.app/api/exchange/upbit/validate-and-save" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"accessKey\":\"YOUR_ACCESS_KEY\",\"secretKey\":\"YOUR_SECRET_KEY\"}"
```

### Upbit 자산 조회

```bash
curl -X GET "https://cryptoview-api-620339426938.asia-northeast3.run.app/api/exchange/upbit/accounts" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

### Gate.io 저장

```bash
curl -X POST "https://cryptoview-api-620339426938.asia-northeast3.run.app/api/exchange/gateio/validate-and-save" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"accessKey\":\"YOUR_ACCESS_KEY\",\"secretKey\":\"YOUR_SECRET_KEY\"}"
```

### Gate.io 자산 조회

```bash
curl -X GET "https://cryptoview-api-620339426938.asia-northeast3.run.app/api/exchange/gateio/accounts" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

## k6 테스트

현재 k6 스크립트는 Upbit 기준으로 작성되어 있습니다.

```bash
k6 run .\k6\upbit-validate-and-save.js `
  -e BASE_URL=https://cryptoview-api-620339426938.asia-northeast3.run.app `
  -e FIREBASE_ID_TOKEN=YOUR_FIREBASE_ID_TOKEN `
  -e ACCESS_KEY=YOUR_ACCESS_KEY `
  -e SECRET_KEY=YOUR_SECRET_KEY
```

```bash
k6 run .\k6\upbit-accounts.js `
  -e BASE_URL=https://cryptoview-api-620339426938.asia-northeast3.run.app `
  -e FIREBASE_ID_TOKEN=YOUR_FIREBASE_ID_TOKEN
```

## 보안 원칙

- 클라이언트는 거래소 API 키를 장기 보관하지 않습니다.
- 클라이언트가 `uid`를 직접 보내지 않습니다.
- 서버는 Firebase ID Token 검증 결과로만 사용자를 식별합니다.
- Firestore에는 KMS 암호문만 저장합니다.
- 거래소 private API 호출은 서버에서 수행합니다.
- 민감 정보는 로그에 출력하지 않습니다.
- public market API는 키가 필요 없으므로 앱 직접 호출도 가능합니다.

## 현재 구현 범위

구현 완료:
- Firebase ID Token 인증
- Upbit credential 검증, 저장, 조회, 삭제
- Gate.io credential 검증, 저장, 조회, 삭제
- KMS 암호화 / 복호화
- Firestore 사용자별 credential 저장
- 거래소별 private account 조회

제외된 범위:
- 주문 API
- 입출금 API
- 거래소 public market API 프록시
- 운영용 rate limit
- 상세 감사 로그 시스템

## 정리

이 백엔드는 Android 앱에서 민감한 거래소 API 키를 직접 다루지 않도록, Firebase 인증 사용자 기준으로 거래소 credential을 서버에서 검증하고 KMS 암호문으로 저장하는 서버리스 API입니다. 현재는 Upbit과 Gate.io private account 조회까지 구현되어 있으며, 추가 거래소도 같은 `routes -> controllers -> services -> repositories/utils` 구조로 확장할 수 있습니다.
