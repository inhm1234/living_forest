# 오늘의숲 / TodayForest

오늘의숲 운영 웹앱과 원오브텐, Supabase 복구 자료, 자동 검증 도구를 함께 관리하는 저장소입니다.

## 운영 배포

`main` 브랜치에 커밋하면 GitHub Actions의
`.github/workflows/deploy-cloudflare-pages.yml`이 다음 순서로 실행됩니다.

1. 저장소 안전성 검사
2. 운영용 `dist/` 생성
3. 운영 배포물 검증
4. Playwright 안전 Smoke Test
5. 검증된 `dist/`만 Cloudflare Pages에 배포

개발 자료(`dev/`, `docs/`, `supabase/`, 테스트 파일, SQL, README 등)는
운영 `dist/`에 포함하지 않습니다.

## 주요 구조

- 운영 웹: 루트의 HTML/CSS/JS
- 이미지/정적 자산: `assets/`
- 개발·실험 화면: `dev/`
- 운영/설정/이력 문서: `docs/`
- 배포·검증 스크립트: `scripts/`
- Playwright Smoke Test: `tests/`
- Supabase 복구 자료: `supabase/`
- GitHub Actions: `.github/workflows/`

## Supabase 복구 자료

- 기준 스키마: `supabase/baseline/`
- 기준 데이터 seed: `supabase/seed/`
- 읽기 전용 스냅샷 쿼리: `supabase/snapshot_queries/`
- Edge Function 복구본: `supabase/functions/`

`supabase/baseline/`과 `supabase/seed/`는 복구용 자료입니다.
현재 운영 DB에 단순 동기화 목적으로 다시 실행하지 않습니다.

실제 사용자 데이터 덤프(`TodayForest_data_*.sql`)는 민감한 운영 데이터이므로
**절대 GitHub에 커밋하지 않습니다.** 로컬/개인 보관소에서만 관리합니다.

## 보안 원칙

- 브라우저에는 Publishable Key만 사용합니다.
- 서버/Edge Function용 Secret Key를 브라우저 코드에 넣지 않습니다.
- legacy `anon` / `service_role` JWT API key는 비활성화 상태를 유지합니다.
- `oot-push-invites` webhook은 전용 `x-oot-webhook-secret`으로 인증합니다.
- 실제 secret 값, VAPID private key, DB dump, `.env` 파일은 저장소에 넣지 않습니다.

## 자동 검증

로컬 또는 CI에서:

```bash
bash scripts/verify-repository-hygiene.sh
bash scripts/build-production.sh
bash scripts/verify-production.sh
npm install
npx playwright install chromium
npm run test:smoke
```

Smoke Test는 실제 사용자 데이터를 생성하지 않는 안전한 핵심 흐름만 검사합니다.

## 오류 모니터링

운영 브라우저 오류는 Sentry Browser Error Monitoring으로 수집합니다.
현재 설정은 오류 중심의 최소 구성으로 유지하며 Session Replay/Tracing/Logs/Metrics는 사용하지 않습니다.

## 문서 정리 원칙

현재 루트에 남아 있는 과거 `*_UPLOAD*.txt`, `PATCH_README.txt` 등은
기능 동작 파일이 아니라 릴리스/업로드 이력입니다.
다음 정리 단계에서 `docs/history/releases/`로 옮긴 뒤 루트에서는 제거합니다.

자세한 저장소 관리 기준은 `docs/operations/GITHUB_REPOSITORY_HYGIENE.md`를 참고합니다.
