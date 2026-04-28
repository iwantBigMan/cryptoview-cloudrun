# 작업 프롬프트 기록

## 기능 관련 프롬프트
- 업비트 자산 조회 응답이 Cloud Logging에 남지 않도록 `getUpbitAccounts` 응답 전체를 출력하는 로그를 제거한다.
- Cloud Run 서비스를 서울 리전으로 배포하고, Upbit API 요청 타임아웃을 줄이며, 일시적 연결 실패에 대해 짧은 1회 재시도를 적용한다.
- 업비트 API 허용 IP 등록을 위해 서울 리전 고정 outbound IP, Cloud NAT, Direct VPC egress 기준의 배포 절차를 문서화하고 `/ip` 확인 API를 추가한다.

## 테스트 관련 프롬프트
- TypeScript 빌드를 실행해 변경 사항의 타입 오류 여부를 확인한다.

## 기타 프롬프트
- `AGENTS.md` 지침을 사용하고, 변경 요약과 테스트 결과를 한국어로 정리한다.
한국어로 답변해줘.
