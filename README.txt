오늘의숲 운영 반영용 v2 — 테스트 새싹 DEV 숨김 보완

이 ZIP에는 app.js 한 파일만 있습니다.

왜 v2가 필요한가:
- v1은 별도 DEV RPC 호출을 끄는 처리만 했습니다.
- 실제 친구 목록 RPC(list_my_garden_friends)가 is_dev_test=true 행을 함께 돌려주면,
  테스트 새싹 DEV 카드가 계속 운영 화면에 나타날 수 있었습니다.

v2 변경:
- friendsResult에서 is_dev_test=true 친구를 운영 화면 데이터로 만들기 전에 제외합니다.
- sentLettersResult에서 is_dev_test=true 보낸 편지도 운영 화면 데이터로 만들기 전에 제외합니다.
- DB 삭제, RPC 변경, SQL 변경, 실제 친구/실제 편지 데이터 변경은 하지 않습니다.
