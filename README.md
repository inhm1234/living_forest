# 살아있는 숲

현재 테스트판: V1.10.19 test  
기준 버전: V1.10.18 test  
최근 업데이트: 이미지 무대 구조 전환 1차  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.10.19 test 핵심 변경점

V1.10.19 test는 기존 CSS 그라데이션과 작은 나무 오브젝트 배치로 숲길을 만들던 방식을 줄이고, 새로 업로드한 고화질 배경 이미지 6장을 실제 화면 무대로 사용하는 테스트판입니다.

핵심 방향은 다음과 같습니다.

- 첫 화면 월드 숲 배경을 새 이미지 3종으로 교체
  - `assets/world/world-overview-day-v1.png`
  - `assets/world/world-overview-sunset-v1.png`
  - `assets/world/world-overview-night-v1.png`
- 내 나무 화면 배경을 새 이미지 3종으로 교체
  - `assets/garden/garden-inner-day-v1.png`
  - `assets/garden/garden-inner-sunset-v1.png`
  - `assets/garden/garden-inner-night-v1.png`
- CSS로 만든 가짜 숲길/숲 덩어리 레이어를 숨겨 새 이미지 배경과 충돌하지 않게 정리
- 월드 화면에서는 큰 숲 전체가 먼저 보이도록 하고, 내 나무만 작은 자리 표시처럼 유지
- 내 나무 화면에서는 숲속 가까운 배경 위에 성장 단계별 나무 PNG가 올라가도록 조정
- 기존 감정 기록, 방문자 기록, 성장 단계, 시간대 연동, localStorage 저장 구조는 유지

## 유지한 기능

- 기존 저장키 `livingForestV012` 유지
- 테스트 저장키 `livingForestV012_TEST` 유지
- schema 3 유지
- 성장 일수별 나무 PNG 표시 유지
- 개인 정원 이동, 감정 기록, 방문자 흔적/방문 기록 유지
- 낮/노을/밤 시간대 연동 유지
- 서버 저장, 로그인, Google 계정 기능은 추가하지 않음

## 업로드 전제

이 버전은 아래 이미지 6개가 GitHub에 먼저 업로드되어 있어야 정상적으로 보입니다.

```text
assets/world/world-overview-day-v1.png
assets/world/world-overview-sunset-v1.png
assets/world/world-overview-night-v1.png

assets/garden/garden-inner-day-v1.png
assets/garden/garden-inner-sunset-v1.png
assets/garden/garden-inner-night-v1.png
```
