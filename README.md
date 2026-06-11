# 살아있는 숲

현재 테스트판: V1.50 test  
기준 버전: V1.49 test  
최근 업데이트: 온라인 친구 저장 구조 1차  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.50 test 핵심 변경점

V1.50 test는 자리별 초대 UI 다음 단계로, 실제 온라인 친구 자리 데이터를 저장하고 불러오기 위한 구조를 추가한 버전입니다.

이 버전부터 초대 링크에는 내 숲 ID와 자리 ID가 들어갑니다. 친구가 링크로 들어와 닉네임과 나무 이름을 남기면, Apps Script와 Google Sheets의 `friend_seats` 시트에 저장될 수 있습니다.

## 수정한 것

- 버전 표기를 V1.50 test로 갱신
- 온라인 숲 ID 생성 및 localStorage 보관
- 자리별 초대 링크에 `forest`와 `seat` 값 포함
- 초대 링크로 들어온 친구용 등록 카드 추가
- 친구 닉네임 / 나무 이름 입력 후 온라인 저장소에 기록하는 함수 추가
- 내 숲을 열었을 때 온라인 친구 자리 데이터를 불러오는 구조 추가
- 저장된 친구 자리는 `꽃길 자리 · 민지`처럼 표시될 수 있도록 준비
- `APPS_SCRIPT_CODE.txt`에 friend_seats 저장/조회 API 추가

## 중요

프론트 파일만 올리면 화면은 바뀌지만, 진짜 온라인 저장은 아직 작동하지 않습니다.  
반드시 `APPS_SCRIPT_CODE.txt`를 Google Apps Script에 붙여넣고 새 버전으로 배포해야 합니다.
