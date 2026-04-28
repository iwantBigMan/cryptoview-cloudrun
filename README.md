# CryptoView Backend

Node.js + TypeScript 기반의 Cloud Run 백엔드입니다.

현재 목표는 다음 두 가지입니다.
- 업비트 API 키 검증
- 검증된 키를 KMS로 암호화해 Firestore에 저장하고, 이후 서버에서 복호화해 업비트 자산 조회

## 개요

이 프로젝트는 서버 중심 보안 구조를 사용합니다.

- 클라이언트는 업비트 키를 서버로만 전송합니다.
- 키 저장 시 서버가 Google Cloud KMS로 암호화합니다.
- Firestore에는 평문이 아니라 암호문만 저장합니다.
- 자산 조회 시 서버가 Firestore에서 암호문을 읽고, KMS로 복호화한 뒤 업비트 API를 호출합니다.
- 사용자 식별은 `userId`가 아니라 Firebase ID Token 검증 결과의 `uid`를 사용합니다.

## 현재 구현 상태

구현 완료:
- Firebase ID Token 인증 미들웨어
- `POST /api/exchange/upbit/validate-and-save`
- `GET /api/exchange/upbit/accounts`
- Firestore 암호문 저장
- Firestore 암호문 조회
- KMS 암호화 / 복호화
- 업비트 `/v1/accounts` 호출

진행 중:
- Cloud Run 런타임에서 Upbit 네트워크 타임아웃 검증
- KMS / IAM / 프로젝트 ID 정합성 점검
- 안드로이드 연동 최종 테스트

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
```

원칙:
- 실제 소스 수정은 `src`에서만 합니다.
- `dist`는 빌드 결과물입니다.

## 요청 흐름

### 1. 업비트 키 저장

1. 안드가 Firebase 로그인
2. 안드가 `Authorization: Bearer <Firebase ID Token>`과 함께 업비트 키 전송
3. 서버가 Firebase 토큰 검증 후 `uid` 추출
4. 서버가 업비트 키 검증
5. 검증 성공 시 KMS로 암호화
6. Firestore에 암호문 저장

### 2. 업비트 자산 조회

1. 안드가 `Authorization: Bearer <Firebase ID Token>`과 함께 자산 조회 요청
2. 서버가 Firebase 토큰 검증 후 `uid` 추출
3. Firestore에서 `users/{uid}/exchangeCredentials/upbit` 문서 조회
4. 저장된 암호문을 KMS로 복호화
5. 복호화된 키로 업비트 `/v1/accounts` 호출
6. 업비트 응답을 안드로 반환

## API

### `GET /test`

서버 상태 확인용 엔드포인트입니다.

응답 예시:

```json
{
  "message": "success from cloud run"
}
```

### `GET /ip`

Cloud Run의 현재 outbound IP를 확인하는 테스트용 엔드포인트입니다.

### `GET /my-ip`

`/ip`와 동일한 응답을 반환하는 기존 호환용 엔드포인트입니다.

### `POST /api/exchange/upbit/validate-and-save`

업비트 키를 검증한 뒤 KMS 암호화 후 Firestore에 저장합니다.

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

실패 응답 예시:

```json
{
  "valid": false,
  "message": "accessKey and secretKey are required."
}
```

### `GET /api/exchange/upbit/accounts`

저장된 업비트 키를 복호화해 업비트 자산 정보를 조회합니다.

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

가능한 실패 상태:
- `401`: Firebase 토큰 없음 또는 검증 실패
- `404`: 저장된 업비트 키 없음
- `500`: KMS / 내부 처리 오류
- `502`: 업비트 연결 실패 또는 타임아웃

## Firestore 저장 구조

경로:

```text
users/{uid}/exchangeCredentials/upbit
```

문서 구조:

```json
{
  "accessKeyEncrypted": "base64 ciphertext",
  "secretKeyEncrypted": "base64 ciphertext",
  "isValid": true,
  "validatedAt": "serverTimestamp",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

## 주요 타입

### 업비트 자산 응답 DTO

백엔드는 업비트 원본 응답 구조를 그대로 반환합니다.

```ts
export interface UpbitAccountBalanceDto {
  currency: string;
  balance: string;
  locked: string;
  avg_buy_price: string;
  avg_buy_price_modified: boolean;
  unit_currency: string;
}
```

## 보안 원칙

- 클라이언트에서 거래소 키를 암호화하지 않습니다.
- 서버가 Google Cloud KMS만 사용해 암호화 / 복호화합니다.
- Firestore에는 암호문만 저장합니다.
- 클라이언트가 `uid`를 직접 보내지 않습니다.
- 서버가 Firebase ID Token 검증 후 `uid`를 추출합니다.
- 업비트 호출은 클라이언트가 아니라 서버가 수행합니다.
- 민감정보는 로그에 출력하지 않습니다.

## 환경변수

### `FIREBASE_PROJECT_ID`

Firebase 인증 프로젝트 ID

예:

```text
crytoview
```

### `FIRESTORE_DATABASE_ID`

Firestore 데이터베이스 ID

예:

```text
cryptoview
```

### `GOOGLE_CLOUD_KMS_KEY_NAME`

KMS 키 전체 리소스 이름

예:

```text
projects/crytoview/locations/global/keyRings/cryptoview-ring/cryptoKeys/exchange-credentials-key
```

## IAM 권한

Cloud Run 서비스 계정에는 최소 아래 권한이 필요합니다.

- `roles/datastore.user`
- `roles/cloudkms.cryptoKeyEncrypterDecrypter`

현재 서비스 계정 확인 예시:

```powershell
gcloud run services describe cryptoview-api --region asia-northeast3 --format="value(spec.template.spec.serviceAccountName)"
```

## 로컬 실행

설치:

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

## 서울 리전 고정 outbound IP 배포

업비트 API 키의 IP 허용 목록을 사용할 경우 Cloud Run의 outbound IP를 고정해야 합니다. 이 프로젝트는 서울 리전 `asia-northeast3`에서 Direct VPC egress와 Cloud NAT를 사용해 아래 흐름으로 배포합니다.

```text
Cloud Run -> Direct VPC egress -> default VPC -> Cloud NAT -> upbit-static-ip-seoul -> Upbit API
```

기본 가정:
- 프로젝트 ID: `crytoview`
- 서비스명: `cryptoview-api`
- 리전: `asia-northeast3`
- 네트워크: `default`
- 서브넷: `default`
- 고정 IP 이름: `upbit-static-ip-seoul`
- Cloud Router 이름: `cryptoview-router-seoul`
- Cloud NAT 이름: `cryptoview-nat-seoul`

### 1. 프로젝트 설정 확인

```powershell
gcloud config set project crytoview
gcloud config get-value project
```

### 2. 서울 리전 고정 외부 IP 예약

```powershell
gcloud compute addresses create upbit-static-ip-seoul `
  --region asia-northeast3
```

예약된 IP 확인:

```powershell
gcloud compute addresses describe upbit-static-ip-seoul `
  --region asia-northeast3 `
  --format="value(address)"
```

위 명령으로 출력된 IP를 업비트 API 키의 허용 IP에 등록합니다.

### 3. Cloud Router 생성

```powershell
gcloud compute routers create cryptoview-router-seoul `
  --region asia-northeast3 `
  --network default
```

### 4. Cloud NAT 생성

```powershell
gcloud compute routers nats create cryptoview-nat-seoul `
  --router cryptoview-router-seoul `
  --router-region asia-northeast3 `
  --nat-external-ip-pool upbit-static-ip-seoul `
  --nat-all-subnet-ip-ranges
```

### 5. Cloud Run 배포

Direct VPC egress를 사용하고 모든 outbound 트래픽이 Cloud NAT를 통과하도록 `--vpc-egress all-traffic`을 지정합니다.

```powershell
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

### 6. 환경변수만 업데이트

```powershell
gcloud run services update cryptoview-api `
  --region asia-northeast3 `
  --update-env-vars "FIREBASE_PROJECT_ID=crytoview,FIRESTORE_DATABASE_ID=cryptoview,GOOGLE_CLOUD_KMS_KEY_NAME=projects/crytoview/locations/global/keyRings/cryptoview-ring/cryptoKeys/exchange-credentials-key"
```

### 7. outbound IP 검증

배포 URL 확인:

```powershell
gcloud run services describe cryptoview-api `
  --region asia-northeast3 `
  --format="value(status.url)"
```

Cloud Run이 실제로 사용하는 outbound IP 확인:

```powershell
$BASE_URL = gcloud run services describe cryptoview-api `
  --region asia-northeast3 `
  --format="value(status.url)"

Invoke-RestMethod "$BASE_URL/ip"
```

응답의 `ip` 값이 `upbit-static-ip-seoul` 주소와 같아야 합니다.

### 8. API 검증

```powershell
$BASE_URL = gcloud run services describe cryptoview-api `
  --region asia-northeast3 `
  --format="value(status.url)"

Invoke-RestMethod "$BASE_URL/test"
```

자산 조회:

```powershell
$BASE_URL = gcloud run services describe cryptoview-api `
  --region asia-northeast3 `
  --format="value(status.url)"

Invoke-RestMethod "$BASE_URL/api/exchange/upbit/accounts" `
  -Headers @{ Authorization = "Bearer YOUR_FIREBASE_ID_TOKEN" }
```

### 비용 발생 가능 리소스

- 예약된 정적 외부 IP
- Cloud NAT
- Cloud Router
- Cloud Run 요청, CPU, 메모리
- Cloud Build
- Firestore
- Cloud KMS
- Cloud Logging

사용하지 않는 정적 외부 IP는 비용이 발생할 수 있으므로 테스트 후 정리합니다.

### 되돌리기 / 삭제

서울 리전 Cloud Run 서비스 삭제:

```powershell
gcloud run services delete cryptoview-api `
  --region asia-northeast3
```

Cloud NAT 삭제:

```powershell
gcloud compute routers nats delete cryptoview-nat-seoul `
  --router cryptoview-router-seoul `
  --router-region asia-northeast3
```

Cloud Router 삭제:

```powershell
gcloud compute routers delete cryptoview-router-seoul `
  --region asia-northeast3
```

고정 외부 IP 삭제:

```powershell
gcloud compute addresses delete upbit-static-ip-seoul `
  --region asia-northeast3
```

## 배포

Cloud Run 서울 리전 배포:

```powershell
gcloud run deploy cryptoview-api `
  --source . `
  --region asia-northeast3 `
  --allow-unauthenticated `
  --network default `
  --subnet default `
  --vpc-egress all-traffic
```

환경변수 업데이트 예시:

```powershell
gcloud run services update cryptoview-api `
  --region asia-northeast3 `
  --update-env-vars "FIREBASE_PROJECT_ID=crytoview,FIRESTORE_DATABASE_ID=cryptoview,GOOGLE_CLOUD_KMS_KEY_NAME=projects/crytoview/locations/global/keyRings/cryptoview-ring/cryptoKeys/exchange-credentials-key"
```

## 테스트 예시

### 키 저장

```bash
curl -X POST "https://cryptoview-api-620339426938.asia-northeast3.run.app/api/exchange/upbit/validate-and-save" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"accessKey\":\"YOUR_ACCESS_KEY\",\"secretKey\":\"YOUR_SECRET_KEY\"}"
```

### 자산 조회

```bash
curl -X GET "https://cryptoview-api-620339426938.asia-northeast3.run.app/api/exchange/upbit/accounts" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

## k6 테스트

스크립트 위치:

```text
k6/upbit-validate-and-save.js
k6/upbit-accounts.js
```

실행 예시:

```bash
k6 run .\k6\upbit-validate-and-save.js -e FIREBASE_ID_TOKEN=YOUR_FIREBASE_ID_TOKEN -e ACCESS_KEY=YOUR_ACCESS_KEY -e SECRET_KEY=YOUR_SECRET_KEY
```

```bash
k6 run .\k6\upbit-accounts.js -e FIREBASE_ID_TOKEN=YOUR_FIREBASE_ID_TOKEN
```

## 현재까지 확인된 이슈

- 프로젝트 ID가 `crytoview` / `cryptoview`로 혼재되어 KMS 경로와 IAM 확인 과정이 복잡했습니다.
- 저장 API에서 KMS 권한 문제로 `500`이 발생한 적이 있습니다.
- 업비트 호출 시 Cloud Run에서 외부 연결 타임아웃으로 `502`가 발생한 적이 있습니다.
- 업비트 JWT 알고리즘은 `HS512` 기준으로 수정했습니다.

## 다음 단계

- 안드로이드에서 `GET /api/exchange/upbit/accounts` 실제 호출 테스트
- KMS / Upbit 네트워크 런타임 검증
- 추가 업비트 조회 API 확장
  - 예: 잔고 상세, 주문 내역, 체결 내역

## 한 줄 요약

안드는 Firebase 토큰만 보내고, 백엔드는 Firestore 암호문 조회, KMS 복호화, 업비트 호출까지 전부 서버에서 처리하는 구조입니다.
