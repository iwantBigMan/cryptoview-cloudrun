# CryptoView Cloud Run Backend

CryptoView Android 앱을 위한 Node.js + TypeScript 기반 Cloud Run 백엔드입니다.

이 백엔드는 Android 앱이 거래소 API Key를 직접 장기 보관하지 않도록, Firebase 인증 사용자 기준으로 거래소 credential을 검증하고 Google Cloud KMS 암호문으로 Firestore에 저장합니다. 자산 조회 시에는 저장된 암호문을 서버에서 복호화한 뒤 Upbit/Gate.io private API 호출을 대행합니다.

현재는 Upbit, Gate.io credential 관리와 자산 조회, Gate.io spot 평균단가 계산, AI 포트폴리오 분석 API 골격을 제공합니다.

## 핵심 목표

- Android 앱에서 거래소 API Key/Secret을 장기 보관하지 않습니다.
- 클라이언트가 `uid`를 직접 보내지 않고 Firebase ID Token 검증 결과의 `uid`를 사용합니다.
- Firestore에는 평문 키가 아니라 KMS 암호문만 저장합니다.
- 거래소 private API 호출은 Cloud Run 백엔드에서 수행합니다.
- AI 분석에는 거래소 키나 KMS 암호문을 전달하지 않고, 앱이 계산한 포트폴리오 스냅샷만 사용합니다.

## 기술 스택

- Node.js 20
- Express 5
- TypeScript
- Firebase Admin SDK
- Google Cloud Firestore
- Google Cloud KMS
- Google Cloud Run
- Ollama local test
- OpenAI Responses API ready

## 프로젝트 구조

```text
src/
  controllers/
    ai/
    gateio/
    upbit/
  domains/
    ai/
    averagePrice/
    usecases/
  infrastructure/
    ai/
    gateio/
  middlewares/
  repositories/
    gateio/
    upbit/
  routes/
    ai/
    gateio/
    upbit/
  services/
    ai/
    gateio/
    upbit/
  types/
    ai/
    gateio/
    upbit/
  utils/
  index.ts
```

역할 분리:

- `routes`: API 경로와 인증 미들웨어 연결
- `controllers`: 요청 검증, 서비스 호출, HTTP 응답 처리
- `services`: credential 저장/조회, KMS 암복호화 흐름, AI 호출 흐름 처리
- `domains`: 평균단가 계산, AI 프롬프트 생성 등 도메인 로직
- `infrastructure`: 외부 API 클라이언트, AI provider 클라이언트
- `repositories`: Firestore 문서 저장, 조회, 삭제
- `utils`: KMS, Upbit JWT, Gate.io HMAC 서명
- `types`: 요청/응답/Firestore 문서 DTO

## 인증 흐름

거래소 API와 AI API는 Firebase ID Token을 사용합니다.

```text
Authorization: Bearer <Firebase ID Token>
```

서버는 `firebaseAuth.ts` 미들웨어에서 토큰을 검증하고, 검증된 `uid`를 기준으로 Firestore 경로를 결정합니다.

## Credential 저장 흐름

1. Android 앱이 Firebase ID Token과 거래소 `accessKey`, `secretKey`를 서버로 보냅니다.
2. 서버가 Firebase ID Token을 검증해 `uid`를 추출합니다.
3. 서버가 거래소 private account API를 호출해 API Key 유효성을 검증합니다.
4. 검증 성공 시 `{ accessKey, secretKey }` JSON payload를 KMS로 암호화합니다.
5. Firestore에는 `credentialEncrypted` 암호문만 저장합니다.

Firestore 경로:

```text
users/{uid}/exchangeCredentials/upbit
users/{uid}/exchangeCredentials/gateio
```

문서 구조:

```json
{
  "credentialEncrypted": "base64 ciphertext",
  "isValid": true,
  "validatedAt": "serverTimestamp",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

## 자산 조회 흐름

1. Android 앱이 Firebase ID Token과 함께 자산 조회 API를 호출합니다.
2. 서버가 토큰을 검증해 `uid`를 추출합니다.
3. Firestore에서 `users/{uid}/exchangeCredentials/{exchange}` 문서를 조회합니다.
4. `credentialEncrypted` 값을 KMS로 복호화합니다.
5. 복호화된 키로 거래소 private account API를 호출합니다.
6. 거래소 응답을 Android 앱에 반환합니다.

거래소 private API는 Cloud Run 고정 outbound IP 기준으로 호출되어야 합니다. 로컬 PC에서 직접 private API를 호출하면 거래소 IP whitelist에 막힐 수 있습니다.

## API 목록

### Health

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/` | Cloud Run 서버 확인 |
| GET | `/test` | JSON 테스트 응답 |
| GET | `/ip` | 현재 outbound IP 확인 |
| GET | `/my-ip` | `/ip`와 동일한 호환 엔드포인트 |

### Upbit

Base path:

```text
/api/exchange/upbit
```

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/api/exchange/upbit/validate-and-save` | Upbit API Key 검증 및 KMS 암호화 저장 |
| GET | `/api/exchange/upbit/accounts` | 저장된 credential 복호화 후 Upbit 자산 조회 |
| DELETE | `/api/exchange/upbit/credential` | 현재 사용자 Upbit credential 삭제 |

### Gate.io

Base path:

```text
/api/exchange/gateio
```

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/api/exchange/gateio/validate-and-save` | Gate.io API Key 검증 및 KMS 암호화 저장 |
| GET | `/api/exchange/gateio/accounts` | 저장된 credential 복호화 후 Gate.io spot 자산 조회 |
| POST | `/api/exchange/gateio/spot-average-price` | Gate.io spot 체결 내역 기반 평균단가 계산 |
| DELETE | `/api/exchange/gateio/credential` | 현재 사용자 Gate.io credential 삭제 |

Gate.io 평균단가 API는 `from/to`가 없으면 최근 365일 체결 내역을 30일 단위로 나누어 조회합니다.

요청 예시:

```json
{
  "currencyPair": "SOL_USDT",
  "from": 1710000000,
  "to": 1711000000,
  "maxPages": 1
}
```

`currencyPair`만 필수이며, `from`, `to`, `maxPages`는 선택입니다.

### AI

Base path:

```text
/api/ai
```

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/api/ai/portfolio-insight` | 포트폴리오 스냅샷 기반 AI 분석 |

AI API는 거래소 credential을 조회하거나 KMS를 사용하지 않습니다. Android 앱에서 계산한 포트폴리오 스냅샷만 받아 LLM에 전달할 프롬프트를 생성합니다.

요청 예시:

```json
{
  "portfolioSummary": {
    "baseCurrency": "USDT",
    "holdingsCount": 3,
    "totalValuation": 100,
    "totalPnl": 10,
    "totalPnlRate": 7.3
  },
  "holdings": [
    {
      "symbol": "BTC",
      "market": "KRW-BTC",
      "quantity": 1,
      "averagePrice": 90,
      "currentPrice": 100,
      "valuation": 100,
      "pnl": 10,
      "pnlRate": 11.11
    }
  ]
}
```

응답 예시:

```json
{
  "insight": "- 현재 포트폴리오는 일부 자산에 비중이 집중되어 있습니다.\n- 손익률이 음수인 자산은 전체 평가손익에 영향을 주고 있습니다.\n- 평균단가가 없는 자산은 손익 판단 정확도가 제한될 수 있습니다.",
  "model": "llama3.1"
}
```

프롬프트 정책:

- 지시문은 영어로 작성합니다.
- 최종 응답은 한국어로 요구합니다.
- 매수/매도/보유 추천, 가격 예측, 투자 조언을 금지합니다.
- 전체 평가는 `portfolioSummary`의 표시 통화 기준 금액을 사용합니다.
- 개별 손익 분석은 `holdings`에 포함된 평단 보유자산만 대상으로 합니다.

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

### 필수

```text
FIREBASE_PROJECT_ID=crytoview
FIRESTORE_DATABASE_ID=cryptoview
GOOGLE_CLOUD_KMS_KEY_NAME=projects/crytoview/locations/global/keyRings/cryptoview-ring/cryptoKeys/exchange-credentials-key
```

주의:

- Firebase 프로젝트 ID는 `crytoview`입니다.
- Firestore database ID는 `cryptoview`입니다.
- KMS 리소스의 project ID도 `crytoview`입니다.
- `cryptoview`와 `crytoview` 오타를 주의해야 합니다.

### AI 선택

로컬 Ollama 테스트:

```text
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1
```

Cloud Run OpenAI 사용 시:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=<OpenAI API Key>
OPENAI_MODEL=<OpenAI model>
```

현재 Cloud Run에 `AI_PROVIDER`를 설정하지 않으면 AI API는 스냅샷 로그를 남긴 뒤 `501`을 반환합니다. 이는 OpenAI 비용이 발생하지 않도록 하기 위한 안전한 기본 상태입니다.

## 로컬 실행

의존성 설치:

```powershell
npm install
```

TypeScript 빌드:

```powershell
npm run build
```

Google ADC 설정:

```powershell
gcloud auth application-default login
gcloud auth application-default set-quota-project crytoview
```

로컬 서버 실행:

```powershell
$env:FIREBASE_PROJECT_ID="crytoview"
$env:FIRESTORE_DATABASE_ID="cryptoview"
$env:GOOGLE_CLOUD_KMS_KEY_NAME="projects/crytoview/locations/global/keyRings/cryptoview-ring/cryptoKeys/exchange-credentials-key"

$env:AI_PROVIDER="ollama"
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
$env:OLLAMA_MODEL="llama3.1"

npm run dev
```

로컬 확인:

```powershell
curl.exe http://localhost:8080/test
```

## 로컬/배포 URL 정책

거래소 API Key는 Cloud Run 고정 outbound IP를 기준으로 whitelist를 등록합니다. 따라서 Android debug에서 모든 API를 로컬 백엔드로 보내면 Upbit/Gate.io private API가 IP whitelist에 막힐 수 있습니다.

권장 Android 설정:

```text
Debug:
  Exchange API -> Cloud Run URL
  AI API       -> http://10.0.2.2:8080/

Release:
  Exchange API -> Cloud Run URL
  AI API       -> Cloud Run URL
```

Cloud Run URL:

```text
https://cryptoview-api-620339426938.asia-northeast3.run.app/
```

Android Emulator 로컬 백엔드:

```text
http://10.0.2.2:8080/
```

`10.0.2.2`는 Android Emulator에서 PC localhost로 접근하기 위한 특수 주소이며, Cloud Run 고정 IP가 아닙니다.

## Cloud Run 배포

OpenAI 없이 AI 라우트만 배포하는 기본 명령:

```powershell
gcloud run deploy cryptoview-api `
  --source . `
  --region asia-northeast3 `
  --allow-unauthenticated `
  --set-env-vars "FIREBASE_PROJECT_ID=crytoview,FIRESTORE_DATABASE_ID=cryptoview,GOOGLE_CLOUD_KMS_KEY_NAME=projects/crytoview/locations/global/keyRings/cryptoview-ring/cryptoKeys/exchange-credentials-key"
```

환경변수 확인:

```powershell
gcloud run services describe cryptoview-api `
  --region asia-northeast3 `
  --format="yaml(spec.template.spec.containers[0].env)"
```

정상 예시:

```yaml
spec:
  template:
    spec:
      containers:
      - env:
        - name: FIREBASE_PROJECT_ID
          value: crytoview
        - name: FIRESTORE_DATABASE_ID
          value: cryptoview
        - name: GOOGLE_CLOUD_KMS_KEY_NAME
          value: projects/crytoview/locations/global/keyRings/cryptoview-ring/cryptoKeys/exchange-credentials-key
```

OpenAI 사용 시에는 아래 환경변수를 추가합니다.

```powershell
gcloud run services update cryptoview-api `
  --region asia-northeast3 `
  --update-env-vars "AI_PROVIDER=openai,OPENAI_MODEL=<OpenAI model>,OPENAI_API_KEY=<OpenAI API Key>"
```

## IAM 권한

Cloud Run 서비스 계정에는 최소 아래 권한이 필요합니다.

- `roles/datastore.user`
- `roles/cloudkms.cryptoKeyEncrypterDecrypter`

로컬 개발에서 KMS 복호화를 테스트하려면 ADC 로그인 계정에도 KMS 키 사용 권한이 필요합니다.

```powershell
gcloud kms keys add-iam-policy-binding exchange-credentials-key `
  --location global `
  --keyring cryptoview-ring `
  --member "user:<YOUR_EMAIL>" `
  --role "roles/cloudkms.cryptoKeyDecrypter" `
  --project crytoview
```

## 테스트 예시

### Upbit 자산 조회

```powershell
curl.exe -X GET "https://cryptoview-api-620339426938.asia-northeast3.run.app/api/exchange/upbit/accounts" `
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

### Gate.io 자산 조회

```powershell
curl.exe -X GET "https://cryptoview-api-620339426938.asia-northeast3.run.app/api/exchange/gateio/accounts" `
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

### Gate.io 평균단가

```powershell
curl.exe -X POST "https://cryptoview-api-620339426938.asia-northeast3.run.app/api/exchange/gateio/spot-average-price" `
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"currencyPair\":\"SOL_USDT\"}"
```

### AI 포트폴리오 분석

```powershell
curl.exe -X POST "http://localhost:8080/api/ai/portfolio-insight" `
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"portfolioSummary\":{\"baseCurrency\":\"USDT\",\"holdingsCount\":3,\"totalValuation\":100,\"totalPnl\":10,\"totalPnlRate\":7.3},\"holdings\":[{\"symbol\":\"BTC\",\"market\":\"KRW-BTC\",\"quantity\":1,\"averagePrice\":90,\"currentPrice\":100,\"valuation\":100,\"pnl\":10,\"pnlRate\":11.11}]}"
```

## 보안 원칙

- 클라이언트는 거래소 API Key/Secret을 장기 보관하지 않습니다.
- 클라이언트는 `uid`를 직접 보내지 않습니다.
- 서버는 Firebase ID Token 검증 결과로만 사용자를 식별합니다.
- Firestore에는 KMS 암호문만 저장합니다.
- 거래소 private API 호출은 서버에서 수행합니다.
- 민감정보는 로그에 출력하지 않습니다.
- AI API에는 거래소 키, Firebase Token 원문, KMS 암호문을 전달하지 않습니다.
- public market API는 키가 필요 없으므로 클라이언트에서 직접 호출할 수 있습니다.

## 현재 구현 범위

구현 완료:

- Firebase ID Token 인증
- Upbit credential 검증, 저장, 조회, 삭제
- Gate.io credential 검증, 저장, 조회, 삭제
- KMS 암호화/복호화
- Firestore 사용자별 credential 저장
- Upbit private account 조회
- Gate.io spot account 조회
- Gate.io spot 평균단가 계산
- AI 포트폴리오 분석 API 골격
- Ollama/OpenAI provider 전환 구조
- 표시 통화 기반 AI 포트폴리오 분석 프롬프트 구성

제외 범위:

- 주문 API
- 입출금 API
- 거래소 public market proxy
- AI 분석 결과 저장
- RAG
- 장기 대화 메모리
- 운영용 rate limit
- 상세 감사 로그 시스템

## 정리

이 백엔드는 CryptoView Android 앱에서 민감한 거래소 API 키를 직접 다루지 않도록 만든 서버리스 API입니다. 거래소 credential은 Firebase 사용자 기준으로 서버에서 검증하고 KMS 암호문으로 저장하며, 자산 조회와 평균단가 계산은 Cloud Run에서 수행합니다. AI 분석은 사용자의 포트폴리오 스냅샷만 받아 투자 조언이 아닌 상태 요약과 리스크 신호 설명을 제공하는 방향으로 확장 중입니다.
