# 살아있는 숲

현재 테스트판: V1.52 test  
기준 버전: V1.51.2 test  
최근 업데이트: 친구 자리 비우기 1차  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.52 test 핵심 변경점

V1.52 test는 온라인 친구 자리 테스트를 계속하기 위해, 이미 저장된 친구 자리를 다시 비울 수 있게 만든 버전입니다.

## 이번에 추가된 기능

- 선택한 친구 자리 비우기 버튼 추가
- Google Sheets의 friend_seats 데이터는 완전 삭제하지 않고 status를 deleted로 바꿈
- deleted 상태의 친구 자리는 내 숲에서 숨김 처리
- 자리 비우기 후 같은 자리에 새 친구를 다시 초대 가능
- Apps Script에 delete_friend_seat 액션 추가

## 확인할 것

- 상단 버전이 V1.52 test로 보이는지
- 친구가 들어온 자리를 선택하면 “꽃길 자리 비우기” 버튼이 활성화되는지
- 비우기 후 friend_seats의 status가 deleted로 바뀌는지
- 새로고침 후 해당 자리가 다시 빈자리로 보이는지
