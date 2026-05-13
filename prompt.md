# 작업 프롬프트 기록

## 기능 관련 프롬프트
- LLM 기능을 별도 레포로 분리하기보다 기존 Cloud Run 백엔드 안에 AI 모듈로 먼저 추가한다.
- `/api/ai/portfolio-insight` 라우트와 타입, 컨트롤러, 서비스, 프롬프트 빌더를 구성한다.
- AI 응답 생성은 Firebase 인증을 통과한 사용자 요청에서만 접근 가능하도록 구성한다.
- 민감정보를 직접 전달하지 않고, 클라이언트가 계산한 포트폴리오 요약 데이터와 보유 자산 데이터만 입력으로 받는 구조로 시작한다.
- 로컬 테스트는 Ollama로 진행하고, 배포 환경에서는 OpenAI API Key 기반으로 갈아끼울 수 있도록 `AI_PROVIDER=ollama|openai` 전환 구조를 추가한다.
- 추가 npm 패키지 없이 Node.js `fetch` 기반으로 Ollama `/api/generate`와 OpenAI Responses API 호출 클라이언트를 구현한다.
- AI 스냅샷이 백엔드 컨트롤러까지 도달했는지 확인할 수 있도록 민감정보를 제외한 요청 요약 로그를 추가한다.
- 포트폴리오 위험 설명을 위해 AI 요청 holding에 `portfolioRatio`, `riskTags`를 선택 필드로 추가한다.
- 프롬프트 지시문은 영어로 유지하고, 최종 응답만 한국어로 작성하도록 한다.
- LLM이 임의로 위험 자산을 판단하지 않도록 `riskTags`는 앱에서 계산한 리스크 신호이며 투자 추천이 아니라고 명시한다.

## 테스트 관련 프롬프트
- TypeScript 빌드를 실행해 신규 AI 모듈의 타입 오류 여부를 확인한다.

## 기타 프롬프트
- `dist` 폴더는 직접 수정하지 않고 `src` 기준으로만 변경한다.
- `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` 환경변수로 LLM 연결 설정을 관리한다.
- 로그에는 Firebase Token, 거래소 API Key, Secret, 전체 요청 body를 출력하지 않는다.
