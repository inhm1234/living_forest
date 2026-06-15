# 살아있는 숲 V1.73.2 whitepaper hotfix

현재 V1.73.2 whitepaper hotfix는 **V1.73.0 reset test의 전체숲 시간대 배경 구조를 유지하면서, 오늘의숲 백서를 홈페이지 안에서 언제든 볼 수 있도록 연결한 버전**입니다.

## 핵심

- 내 정원 성공 구조는 유지합니다.
- 전체숲의 시간대별 배경 이미지 연결 구조를 유지합니다.
- 전체숲의 더미 나무 표시 구조를 유지합니다.
- 홈페이지 상단에 `오늘의숲 백서` 링크를 추가했습니다.
- 공개용 백서 페이지 `whitepaper.html`을 추가했습니다.
- 백서 원문은 `WHITEPAPER.md`에도 보관했습니다.

## 전체숲 배경 이미지

- 낮: `assets/world/world_forest_pastel_v1_72_4.png`
- 노을: `assets/world/world_forest_pastel_v1_72_7_sunset.png`
- 밤: `assets/world/world_forest_pastel_v1_72_7_night.png`

## 확인 기준

1. 상단 버전이 `V1.73.2 whitepaper hotfix`로 보이는지 확인
2. 메인 화면에서 `오늘의숲 백서` 링크가 보이는지 확인
3. 링크 클릭 시 `whitepaper.html` 백서 페이지가 열리는지 확인
4. 백서 페이지에서 `숲으로 돌아가기`로 메인 화면에 돌아올 수 있는지 확인
5. 내 정원/전체숲의 기존 동작이 유지되는지 확인


## V1.73.2 hotfix

- 메인 화면 `오늘의숲 백서` 링크 클릭 문제 수정
- 일반 URL의 `worldTime` 잔여 파라미터가 실제 시간대를 덮어쓰지 않도록 수정
- `worldTime` 강제 확인은 `?test=1&worldTime=day|sunset|night`에서만 동작
