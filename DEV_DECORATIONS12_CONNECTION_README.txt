오늘의숲 / living_forest
DEV 장식 12종 — DEV 전용 Supabase 연결 패치

이번 ZIP에서 업로드할 파일
- dev/garden-login-test/garden.js

변경 내용
- 장식 목록 읽기: garden_found_items → garden_dev_found_items
- 장식 지급 RPC: claim_garden_found_item → claim_garden_dev_found_item
- 장식 좌표 저장 RPC: save_my_garden_found_item_positions → save_my_garden_dev_found_item_positions

중요
- 이전 단계에서 업로드한 장식 12종 이미지, garden.css는 다시 업로드하지 않아도 됩니다.
- 운영 루트의 index.html / style.css / app.js는 포함하지 않았습니다.
- Code.gs는 포함하지 않았습니다.
- 이 ZIP은 DEV 경로에서만 사용합니다.

업로드 후 DEV 검수 순서
1) https://inhm1234.github.io/living_forest/dev/garden-login-test/ 를 강력 새로고침
2) 기존 장식이 유지되는지 확인
3) 오늘 마음 기록이 이미 있다면, 반짝임을 눌러 DEV 전용 장식 1개를 받는지 확인
4) 꾸미기에서 옮기고 저장한 뒤 새로고침하여 위치가 유지되는지 확인
