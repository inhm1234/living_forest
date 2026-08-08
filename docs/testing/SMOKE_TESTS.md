# TodayForest Playwright Smoke Test v1

## 목적
배포 전에 핵심 공개 화면이 열리고, 기본 JavaScript 동작이 살아 있는지 자동 확인합니다.

## 현재 검사
1. 공개 홈
2. DB 저장을 하지 않는 `welcomePreview=1`
3. 원오브텐 혼자 연습 진입
4. 비로그인 관리자 페이지 보호

이 테스트는 테스트 계정으로 로그인하지 않으며, Supabase에 쓰기 요청이 발생하면 실패합니다.

## GitHub Actions 흐름
1. production `dist` 생성
2. 기존 production 검증
3. Playwright Chromium 설치
4. smoke test 실행
5. 모두 통과한 경우에만 `dist`를 Cloudflare Pages에 배포

## 다음 단계
v1이 안정적으로 돌아간 뒤에만 테스트 전용 계정을 별도로 만들어 로그인/기록/친구/대전 시나리오를 확장합니다.
