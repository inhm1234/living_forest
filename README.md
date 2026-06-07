# 살아있는 숲

현재 테스트판: V1.10.20 test  
기준 버전: V1.10.19 test  
최근 업데이트: 이미지 무대 밝기 / 잔여 레이어 / 내 나무 접지감 보정 1차  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.10.20 test 핵심 변경점

V1.10.20 test는 V1.10.19의 이미지 무대 구조를 유지하면서, 실제 화면에서 확인된 시각 문제를 보정한 테스트판입니다.

핵심 방향은 다음과 같습니다.

- 새 배경 이미지가 뿌옇게 보이던 초록/흰 오버레이를 줄임
- 월드 첫 화면 하단에 남아 보이던 기존 풀/곡선 레이어를 제거
- 월드 첫 화면의 내 나무를 살짝 작게 조정해 큰 숲 배경을 덜 가리게 함
- 내 나무 화면의 원형 그림자/바닥 표시를 줄여 인위적인 원판 느낌 완화
- 내 나무 화면의 배경 디테일이 더 잘 보이도록 오버레이와 전경 레이어를 약화/제거
- 기존 감정 기록, 방문자 기록, 성장 단계, 시간대 연동, localStorage 저장 구조는 유지

## 유지한 이미지 전제

아래 이미지 6개는 기존처럼 필요합니다.

```text
assets/world/world-overview-day-v1.png
assets/world/world-overview-sunset-v1.png
assets/world/world-overview-night-v1.png

assets/garden/garden-inner-day-v1.png
assets/garden/garden-inner-sunset-v1.png
assets/garden/garden-inner-night-v1.png
```

## 유지한 기능

- 기존 저장키 `livingForestV012` 유지
- 테스트 저장키 `livingForestV012_TEST` 유지
- schema 3 유지
- 성장 일수별 나무 PNG 표시 유지
- 개인 정원 이동, 감정 기록, 방문자 흔적/방문 기록 유지
- 낮/노을/밤 시간대 연동 유지
- 서버 저장, 로그인, Google 계정 기능은 추가하지 않음
