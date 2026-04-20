# CryptoView Backend

Node.js + TypeScript 기반의 Cloud Run 백엔드입니다.  
현재는 업비트 API 키 검증과 서버 측 암호화 저장 흐름을 구현하고 있습니다.

## 개요

이 프로젝트는 거래소 API 키를 클라이언트에서 처리하지 않고, 서버에서만 검증하고 저장하는 구조를 사용합니다.

- 런타임: Node.js + TypeScript
- 배포 환경: Google Cloud Run
- 데이터 저장소: Firestore
- 암호화: Google Cloud KMS
- 서버 프레임워크: Express

## 보안 원칙

- 거래소 API `secretKey`는 클라이언트에 저장하거나 클라이언트에서 암호화하지 않습니다.
- 모든 암호화와 복호화는 서버에서 Google Cloud KMS로만 처리합니다.
- Firestore에는 평문이 아닌 암호문만 저장합니다.
- API 응답으로 복호화된 키를 반환하지 않습니다.
- 민감 정보는 로그에 남기지 않습니다.

## 프로젝트 구조

```text
src/
  controllers/
    upbitCredentialController.ts
  repositories/
    upbitCredentialRepository.ts
  routes/
    exchangeUpbit.ts
    upbit.ts
  services/
    upbitCredentialService.ts
    upbitService.ts
  types/
    upbit.ts
  utils/
    kms.ts
    upbitSigner.ts
    exchangeSigner.ts
  index.ts
```

참고:
- 실제 소스 수정은 `src`에서만 진행합니다.
- `dist`는 빌드 결과물 전용 폴더입니다.

## 현재 구현된 API

### `GET /test`

서버 상태 확인용 엔드포인트입니다.

응답 예시:

```json
{
  "message": "success from cloud run"
}
```

### `GET /my-ip`

Cloud Run에서 외부로 나가는 IP 확인용 엔드포인트입니다.

### `POST /upbit/validate`

업비트 API 키 유효성만 검사합니다. 저장은 하지 않습니다.

요청:

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
  "message": "Upbit API key is valid."
}
```

### `POST /api/exchange/upbit/validate-and-save`

업비트 API 키를 검증하고, 유효할 경우 KMS로 암호화한 뒤 Firestore에 저장합니다.

요청:

```json
{
  "accessKey": "string",
  "secretKey": "string",
  "userId": "string"
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
  "message": "accessKey, secretKey, and userId are required."
}
```

## 저장 구조

Firestore 문서 경로:

```text
users/{userId}/exchangeCredentials/upbit
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

## 환경변수

### `GOOGLE_CLOUD_KMS_KEY_NAME`

KMS 대칭 키의 전체 리소스 이름입니다.

형식:

```text
projects/PROJECT_ID/locations/LOCATION/keyRings/KEY_RING/cryptoKeys/KEY_NAME
```

예시:

```text
projects/your-project/locations/us-central1/keyRings/cryptoview/cryptoKeys/api-secrets
```

## IAM 권한

Cloud Run 서비스 계정에는 최소 아래 권한이 필요합니다.

- `roles/cloudkms.cryptoKeyEncrypterDecrypter`
- `roles/datastore.user`

현재 서비스 계정 확인:

```bash
gcloud run services describe cryptoview-api --region us-central1 --format="value(spec.template.spec.serviceAccountName)"
```

권한 부여 예시:

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"
```

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/datastore.user"
```

## 설치 및 로컬 실행

의존성 설치:

```bash
npm install
```

개발 서버 실행:

```bash
npm run dev
```

타입 검사만 수행:

```bash
npx tsc --noEmit
```

빌드:

```bash
npm run build
```

## 배포

Cloud Run 재배포 예시:

```bash
gcloud run deploy cryptoview-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_KMS_KEY_NAME=projects/PROJECT_ID/locations/LOCATION/keyRings/KEY_RING/cryptoKeys/KEY_NAME
```

## 테스트 예시

### 업비트 키 검증만 수행

```bash
curl -X POST "http://localhost:8080/upbit/validate" \
  -H "Content-Type: application/json" \
  -d "{\"accessKey\":\"YOUR_ACCESS_KEY\",\"secretKey\":\"YOUR_SECRET_KEY\"}"
```

### 업비트 키 검증 후 암호화 저장

```bash
curl -X POST "http://localhost:8080/api/exchange/upbit/validate-and-save" \
  -H "Content-Type: application/json" \
  -d "{\"accessKey\":\"YOUR_ACCESS_KEY\",\"secretKey\":\"YOUR_SECRET_KEY\",\"userId\":\"test-user-123\"}"
```

Cloud Run 호출 예시:

```bash
curl -X POST "https://cryptoview-api-620339426938.us-central1.run.app/api/exchange/upbit/validate-and-save" \
  -H "Content-Type: application/json" \
  -d "{\"accessKey\":\"YOUR_ACCESS_KEY\",\"secretKey\":\"YOUR_SECRET_KEY\",\"userId\":\"test-user-123\"}"
```

## 구현 메모

- 업비트 키 검증 로직은 `src/services/upbitService.ts`에 있습니다.
- 검증 후 저장 흐름은 `src/services/upbitCredentialService.ts`에서 처리합니다.
- KMS 암복호화 유틸은 `src/utils/kms.ts`에 있습니다.
- Firestore 저장은 `src/repositories/upbitCredentialRepository.ts`에서 담당합니다.
- 컨트롤러에는 비즈니스 로직을 두지 않고 요청 검증과 응답 처리만 둡니다.

## 주의사항

- `dist`는 직접 수정하지 않습니다.
- 클라이언트 측 암호화는 구현하지 않습니다.
- 커스텀 AES 암호화는 사용하지 않습니다.
- 평문 키를 Firestore에 저장하지 않습니다.
