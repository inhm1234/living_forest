# GitHub Repository Hygiene

TodayForest 저장소를 운영 코드, 복구 자료, 개발 이력으로 명확히 구분하기 위한 기준입니다.

## 루트에 남겨야 하는 것

운영에 직접 필요한 HTML/CSS/JS, PWA 파일, 공개 정적 파일과
빌드 도구 진입 파일만 루트에 둡니다.

예:
- `index.html`, `app.html`
- `style.css`, `app.js`
- 원오브텐 운영 파일
- `manifest.webmanifest`, `sw.js`
- `robots.txt`, `sitemap.xml`, `ads.txt`
- `package.json`, `playwright.config.js`
- `README.md`, `.gitignore`

## 폴더별 역할

- `assets/`: 운영 정적 자산
- `dev/`: 운영에 배포하지 않는 실험/개발 화면
- `docs/setup/`: 외부 서비스 설정 안내
- `docs/database/`: DB 점검/복구 문서
- `docs/testing/`: 테스트 설명
- `docs/history/`: 과거 기능/배포 이력
- `scripts/`: CI/빌드/검증 스크립트
- `tests/`: 자동 테스트
- `supabase/`: DB/Edge Function 복구 자료

## 절대 커밋하지 않는 파일

- 실제 사용자 DB dump (`TodayForest_data_*.sql`)
- `.env`, 토큰/비밀키 파일
- VAPID private key
- Sentry Auth Token
- Supabase Secret Key
- `node_modules/`, `dist/`
- Playwright 실행 결과

`.gitignore`와 CI의 `verify-repository-hygiene.sh`가 이를 보조하지만,
비밀값을 GitHub에 올리지 않는 것이 최우선입니다.

## Edge Function 복구본

`supabase/functions/oot-push-invites/index.ts`는 실제 배포된 방식과 맞춰 둡니다.
현재 기준:
- custom webhook secret 사용
- `SUPABASE_SECRET_KEYS['default']` 사용
- legacy `SUPABASE_SERVICE_ROLE_KEY` 사용 금지

CI에서 이 파일이 다시 legacy 변수로 돌아가면 배포를 중단합니다.

## 루트 문서 이동 후보

아래 파일들은 운영 실행 파일이 아니라 과거 릴리스/업로드 기록입니다.
다음 정리 단계에서 `docs/history/releases/`로 이동한 뒤 루트에서는 제거합니다.

- `ADSENSE_PUBLIC_URL_FIX_v1.0.txt`
- `HOME_PRIORITY_UPLOAD_v0.4.txt`
- `ONE_OF_TEN_FRIEND_LIST_FIX_v1.0.1.txt`
- `ONE_OF_TEN_FRIEND_UPLOAD_v1.txt`
- `ONE_OF_TEN_INVITE_UI_FIX_v1.0.2.txt`
- `ONE_OF_TEN_PUSH_UPLOAD_v0.3.txt`
- `ONE_OF_TEN_REMATCH_UPLOAD_V1.txt`
- `ONE_OF_TEN_UPLOAD.txt`
- `ONE_OF_TEN_UPLOAD_v1.1.txt`
- `PATCH_README.txt`
- `PUBLIC_HOME_UPLOAD_v0.1.txt`
- `README.txt`
- `UPLOAD_README.txt`

`ads.txt`와 `robots.txt`는 공개 운영 파일이므로 이동/삭제하지 않습니다.

## 정리할 때 지키는 원칙

1. 먼저 역할을 분류한다.
2. 운영 참조 여부를 확인한다.
3. 이동/삭제 전 자동 테스트가 존재하는지 확인한다.
4. 한 번에 대규모 리팩터링하지 않는다.
5. 정리 커밋 후 GitHub Actions가 전부 통과하는지 확인한다.
