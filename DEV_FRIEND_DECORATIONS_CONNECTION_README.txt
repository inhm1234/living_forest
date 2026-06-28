오늘의숲 / living_forest — DEV 친구 정원 장식 표시 패치 v1

업로드 범위 (DEV 전용)
- dev/garden-login-test/index.html
- dev/garden-login-test/garden.css
- dev/garden-login-test/garden.js

중요
- 운영 루트 /index.html, /style.css, /app.js 및 Code.gs는 포함하지 않습니다.
- Cloudflare 운영판에는 올리지 않습니다.
- 사전에 실행한 DEV 전용 Supabase RPC list_my_garden_friend_dev_found_items(uuid)가 필요합니다.

변경 내용
1) 친구 정원이 친구의 DEV 장식(garden_dev_found_items)을 읽기 전용으로 표시합니다.
2) 친구가 저장한 position_x / position_y를 내 정원과 같은 390×540 공통 좌표 세계에 표시합니다.
3) 방문자는 장식을 옮기거나 저장할 수 없습니다.
4) 장식을 누르면 "OO가 숲에서 찾은 OO이에요" 안내만 보입니다.
5) 친구 정원 하단 문구에 장식 개수가 표시됩니다.

업로드 방법
- ZIP을 풀고 위 세 파일만 같은 경로에 덮어씁니다.
- 다른 파일은 올리지 않습니다.
