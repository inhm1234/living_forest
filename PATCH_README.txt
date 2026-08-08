TodayForest Playwright Smoke Test v1 패치

업로드 방법
1. 이 ZIP의 폴더 구조를 그대로 최신 living_forest-main 저장소 루트에 덮어씁니다.
2. 새 파일도 함께 추가합니다.
3. GitHub에 Commit 합니다.
4. Actions -> Deploy TodayForest to Cloudflare Pages 실행 결과를 확인합니다.

이번 패치는 실제 사용자 DB를 쓰는 테스트를 하지 않습니다.
검사 대상:
- 공개 홈
- DB 저장 없는 welcomePreview
- 원오브텐 혼자 연습 진입
- 비로그인 관리자 페이지 보호

중요:
최신 ZIP의 배포 workflow가 현재 `pages deploy .`로 되어 있어서,
이번 패치에서 production build/verify를 다시 실행하고 `dist`만 배포하도록 함께 수정합니다.

로컬 검증 완료:
- production dist 생성 성공
- production verify 성공
- Playwright config/test JS syntax 성공
- dev/docs/supabase/tests/package.json/node_modules 등의 dist 제외 확인
