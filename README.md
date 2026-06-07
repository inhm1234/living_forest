# 살아있는 숲

현재 테스트판: V1.10.22 test  
기준 버전: V1.10.21 test  
최근 업데이트: 오버레이 완전 제거 기준 화면  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.10.22 test 핵심 변경점

V1.10.22 test는 오버레이를 "조금 줄이는 방식"이 아니라,
화면을 뿌옇게 만드는 요소를 우선 거의 전부 0으로 만든 기준 화면 테스트판입니다.

핵심 방향은 다음과 같습니다.

- 월드 숲의 `::before`, `::after`, `world-dim` 등 오버레이 효과 제거
- 개인 정원의 `garden-dim`, `tree-glow`, 추가 전경/안개 효과 제거
- 메시지 카드의 `backdrop-filter` 제거
- 내 나무 주변 ring / aura / 접지 보조 효과 대부분 제거
- 배경 이미지를 거의 원본 그대로 먼저 확인할 수 있게 구성
- 이후 이 기준 화면을 보고, 정말 필요한 효과만 다시 조금씩 추가하는 단계로 이어갈 수 있음

## 이번 버전의 목적

이 버전은 "완성판 분위기"를 만드는 버전이 아니라,
배경 이미지 자체와 내 나무 PNG가 얼마나 선명하고 자연스럽게 보이는지
기준 상태를 확인하기 위한 테스트판입니다.

## 이미지 전제

아래 이미지 6개는 기존처럼 필요합니다.

```text
assets/world/world-overview-day-v1.png
assets/world/world-overview-sunset-v1.png
assets/world/world-overview-night-v1.png

assets/garden/garden-inner-day-v1.png
assets/garden/garden-inner-sunset-v1.png
assets/garden/garden-inner-night-v1.png
```
