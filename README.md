# CryptoView Cloud Run Backend

Node.js, Express, TypeScript 기반의 CryptoView 백엔드입니다. 현재는 Firebase 인증 사용자의 Upbit API 키를 검증하고, Google Cloud KMS로 암호화해 Firestore에 저장한 뒤, 서버에서 Upbit 자산 조회를 대행합니다.

## 개요

이 서비스는 거래소 API 키를 클라이언트에 저장하지 않는 서버 중심 구조를 사용합니다.

- 클라이언트는 Firebase ID Token과 Upbit API 키를 서버로 전송합니다.
- 서버는 Firebase ID Token을 검증해 `uid`를 추출합니다.
- 서버는 Upbit `/v1/accounts` 호출로 API 키 유효성을 확인합니다.
- 유효한 키는 JSON payload로 묶어 Google Cloud KMS로 암호화합니다.
- Firestore에는 암호문만 저장합니다.
- 자산 조회 시 서버가 Firestore 암호문을 읽고 KMS로 복호화한 뒤 Upbit API를 호출합니다.

## 기술 스택

- Node.js 20
- Express 5
- TypeScript
- Firebase Admin SDK
- Google Cloud Firestore
- Google Cloud KMS
- Cloud Run
- k6

## 프로젝트 구조

```text
src/
  controllers/
    upbitAccountController.ts
    upbitCredentialController.ts
  middlewares/
    firebaseAuth.ts
  repositories/
    upbitCredentialRepository.ts
  routes/
    exchangeUpbit.ts
  services/
    upbitAccountService.ts
    upbitCredentialService.ts
    upbitService.ts
  types/
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

`src/utils/exchangeSigner.ts`에는 Gate.io 서명 유틸리티가 포함되어 있지만, 현재 라우트에는 Upbit 기능만 연결되어 있습니다.

## 실행 흐름

### Upbit 키 저장

1. 클라이언트가 Firebase 로그인 후 ID Token을 발급받습니다.
2. 클라이언트가 `Authorization: Bearer <Firebase ID Token>` 헤더와 Upbit `accessKey`, `secretKey`를 서버로 보냅니다.
3. 서버가 Firebase ID Token을 검증하고 `uid`를 추출합니다.
4. 서버가 Upbit `/v1/accounts`를 호출해 키 유효성을 검증합니다.
5. 검증 성공 시 `{ accessKey, secretKey }` payload를 KMS로 암호화합니다.
6. 암호문을 `users/{uid}/exchangeCredentials/upbit` 문서에 저장합니다.

### Upbit 자산 조회

1. 클라이언트가 Firebase ID Token을 포함해 자산 조회를 요청합니다.
2. 서버가 토큰을 검증해 `uid`를 추출합니다.
3. Firestore에서 `users/{uid}/exchangeCredentials/upbit` 문서를 조회합니다.
4. 저장된 암호문을 KMS로 복호화합니다.
5. 복호화된 키로 Upbit `/v1/accounts`를 호출합니다.
6. Upbit 응답을 클라이언트에 반환합니다.

## API

### `GET /`

Cloud Run 서버 기본 확인용 엔드포인트입니다.

응답:

```text
Cloud Run TS Server OK
```

### `GET /test`

상태 확인용 JSON 엔드포인트입니다.

```json
{
  "message": "success from cloud run"
}
```

### `GET /ip`

현재 서버의 outbound IP를 확인합니다. Upbit 허용 IP 설정을 확인할 때 사용합니다.

```json
{
  "ip": "203.0.113.10"
}
```

### `GET /my-ip`

`/ip`와 동일한 응답을 반환하는 호환용 엔드포인트입니다.

### `POST /api/exchange/upbit/validate-and-save`

Upbit API 키를 검증하고, 성공 시 KMS 암호문을 Firestore에 저장합니다.

헤더:

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

주요 실패 응답:

```json
{
  "valid": false,
  "message": "accessKey and secretKey are required."
}
```

### `GET /api/exchange/upbit/accounts`

저장된 Upbit API 키를 복호화해 Upbit 자산 정보를 조회합니다.

헤더:

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

가능한 상태 코드:

- `200`: 조회 성공
- `401`: Firebase ID Token 누락, 만료, 검증 실패
- `404`: 저장된 Upbit credential 없음
- `500`: 내부 처리 오류 또는 KMS/Firestore 오류

### `DELETE /api/exchange/upbit/credential`

현재 Firebase 사용자에 저장된 Upbit credential 문서를 삭제합니다.

헤더:

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

## Firestore 저장 구조

경로:

```text
users/{uid}/exchangeCredentials/upbit
```

현재 저장 형식:

```json
{
  "credentialEncrypted": "base64 ciphertext",
  "isValid": true,
  "validatedAt": "serverTimestamp",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

`getDecryptedUpbitCredential()`은 이전 형식인 `accessKeyEncrypted`, `secretKeyEncrypted`도 읽을 수 있도록 호환 로직을 유지합니다.

## 환경 변수

### `PORT`

서버 포트입니다. 없으면 `8080`을 사용합니다.

### `FIREBASE_PROJECT_ID`

Firebase Auth 토큰 검증에 사용할 프로젝트 ID입니다.

예시:

```text
crytoview
```

### `FIRESTORE_DATABASE_ID`

Firestore database ID입니다. 없으면 `cryptoview`를 기본값으로 사용합니다.

예시:

```text
cryptoview
```

### `GOOGLE_CLOUD_KMS_KEY_NAME`

KMS 키의 전체 리소스 이름입니다. 암호화와 복호화에 필수입니다.

예시:

```text
projects/crytoview/locations/global/keyRings/cryptoview-ring/cryptoKeys/exchange-credentials-key
```

## IAM 권한

Cloud Run 서비스 계정에는 최소한 다음 권한이 필요합니다.

- `roles/datastore.user`
- `roles/cloudkms.cryptoKeyEncrypterDecrypter`

서비스 계정 확인 예시:

```powershell
gcloud run services describe cryptoview-api `
  --region asia-northeast3 `
  --format="value(spec.template.spec.serviceAccountName)"
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

개발 서버 실행:

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

로컬에서 Firebase, Firestore, KMS를 호출하려면 Google Application Default Credentials 또는 Cloud Run에 준하는 서비스 계정 인증이 필요합니다.

## Cloud Run 배포

기본 배포 예시:

```powershell
gcloud run deploy cryptoview-api `
  --source . `
  --region asia-northeast3 `
  --allow-unauthenticated `
  --set-env-vars "FIREBASE_PROJECT_ID=crytoview,FIRESTORE_DATABASE_ID=cryptoview,GOOGLE_CLOUD_KMS_KEY_NAME=projects/crytoview/locations/global/keyRings/cryptoview-ring/cryptoKeys/exchange-credentials-key"
```

Upbit API 키에 허용 IP를 설정하는 경우 Cloud Run outbound IP를 고정해야 합니다. 현재 문서 기준 구성은 다음 흐름을 전제로 합니다.

```text
Cloud Run -> Direct VPC egress -> default VPC -> Cloud NAT -> 고정 외부 IP -> Upbit API
```

서울 리전 고정 IP 배포 예시:

```powershell
gcloud compute addresses create upbit-static-ip-seoul `
  --region asia-northeast3

gcloud compute routers create cryptoview-router-seoul `
  --region asia-northeast3 `
  --network default

gcloud compute routers nats create cryptoview-nat-seoul `
  --router cryptoview-router-seoul `
  --router-region asia-northeast3 `
  --nat-external-ip-pool upbit-static-ip-seoul `
  --nat-all-subnet-ip-ranges

gcloud run deploy cryptoview-api `
  --source . `
  --region asia-northeast3 `
  --allow-unauthenticated `
  --network default `
  --subnet default `
  --vpc-egress all-traffic `
  --max-instances 20 `
  --set-env-vars "FIREBASE_PROJECT_ID=crytoview,FIRESTORE_DATABASE_ID=cryptoview,GOOGLE_CLOUD_KMS_KEY_NAME=projects/crytoview/locations/global/keyRings/cryptoview-ring/cryptoKeys/exchange-credentials-key"
```

배포 URL 확인:

```powershell
gcloud run services describe cryptoview-api `
  --region asia-northeast3 `
  --format="value(status.url)"
```

outbound IP 확인:

```powershell
$BASE_URL = gcloud run services describe cryptoview-api `
  --region asia-northeast3 `
  --format="value(status.url)"

Invoke-RestMethod "$BASE_URL/ip"
```

환경 변수만 업데이트:

```powershell
gcloud run services update cryptoview-api `
  --region asia-northeast3 `
  --update-env-vars "FIREBASE_PROJECT_ID=crytoview,FIRESTORE_DATABASE_ID=cryptoview,GOOGLE_CLOUD_KMS_KEY_NAME=projects/crytoview/locations/global/keyRings/cryptoview-ring/cryptoKeys/exchange-credentials-key"
```

## 테스트 예시

### curl

키 검증 및 저장:

```bash
curl -X POST "https://cryptoview-api-620339426938.asia-northeast3.run.app/api/exchange/upbit/validate-and-save" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"accessKey\":\"YOUR_ACCESS_KEY\",\"secretKey\":\"YOUR_SECRET_KEY\"}"
```

자산 조회:

```bash
curl -X GET "https://cryptoview-api-620339426938.asia-northeast3.run.app/api/exchange/upbit/accounts" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

credential 삭제:

```bash
curl -X DELETE "https://cryptoview-api-620339426938.asia-northeast3.run.app/api/exchange/upbit/credential" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

### k6

키 검증 및 저장:

```bash
k6 run .\k6\upbit-validate-and-save.js `
  -e BASE_URL=https://cryptoview-api-620339426938.asia-northeast3.run.app `
  -e FIREBASE_ID_TOKEN=YOUR_FIREBASE_ID_TOKEN `
  -e ACCESS_KEY=YOUR_ACCESS_KEY `
  -e SECRET_KEY=YOUR_SECRET_KEY
```

자산 조회:

```bash
k6 run .\k6\upbit-accounts.js `
  -e BASE_URL=https://cryptoview-api-620339426938.asia-northeast3.run.app `
  -e FIREBASE_ID_TOKEN=YOUR_FIREBASE_ID_TOKEN
```

## 보안 원칙

- 클라이언트는 거래소 키를 장기 보관하지 않습니다.
- 클라이언트가 `uid`를 직접 보내지 않고, 서버가 Firebase ID Token에서 `uid`를 추출합니다.
- Firestore에는 KMS 암호문만 저장합니다.
- Upbit API 호출은 서버에서 수행합니다.
- 민감 정보는 로그에 출력하지 않습니다.

## 정리

현재 백엔드는 Firebase 인증, Upbit 키 검증/저장/삭제, KMS 암복호화, Firestore 저장, Upbit 자산 조회까지 연결되어 있습니다. 추가 거래소나 주문/체결/입출금 내역 같은 기능은 기존 `routes -> controllers -> services -> repositories/utils` 구조를 따라 확장하면 됩니다.

