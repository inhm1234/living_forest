# 살아있는 숲

현재 테스트판: V1.10.24 test  
기준 버전: V1.10.23 test  
최근 업데이트: 최소 보정 — 내 나무 존재감 / 접지감 / 가독성  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.10.24 test 핵심 변경점

V1.10.24 test는 V1.10.23에서 찾은 선명한 배경 상태를 유지하면서,
아주 작은 시각 보정만 더한 최소 수정판입니다.

핵심 방향은 다음과 같습니다.

- 전체 숲 화면에서 내 나무가 너무 묻히지 않도록 아주 작은 접지 그림자와 약한 존재감 보강
- 개인 정원에서 내 나무가 배경 위에 "붙어 보이는" 느낌을 줄이기 위해 아주 작은 바닥 접지감 복원
- 하단 메시지/텍스트 가독성만 조금 개선
- 배경 합성 초기화 구조는 그대로 유지
- 다시 화면이 뿌옇게 돌아가지 않도록 blur / blend / overlay는 다시 강하게 넣지 않음

## 이번 버전의 성격

이 버전은 새 구조를 뒤집는 버전이 아니라,
현재 기준 화면을 해치지 않으면서 다음 3가지만 최소한으로 보정하는 버전입니다.

1. 전체 숲에서 내 나무 찾기 쉬움
2. 개인 정원에서 내 나무 접지감
3. 이미지 위 텍스트 읽기 쉬움

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
