# 살아있는 숲

현재 테스트판: V1.10.23 test  
기준 버전: V1.10.22 test  
최근 업데이트: 배경 합성 완전 초기화  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.10.23 test 핵심 변경점

V1.10.23 test는 오버레이를 0으로 줄여도 화면이 여전히 뿌옇게 보였던 문제를 바탕으로,
단순 opacity 문제가 아니라 배경 합성 구조 자체가 원인일 수 있다는 가정으로 만든 테스트판입니다.

핵심 방향은 다음과 같습니다.

- `background-blend-mode`의 영향 제거
- 기존 다중 `background-image` / `background-color` / `screen` 합성 구조 제거
- 월드 숲과 개인 정원 배경을 `background` shorthand로 통째로 다시 지정
- 배경 이미지 외의 숲 레이어, dim, fog, foreground, glow, ring, blur를 계속 제거 상태로 유지
- 배경 이미지가 정말 원본 그대로 보이는지 확인

## 이번 버전의 핵심 실험

이 버전은 "오버레이를 줄이는 실험"이 아니라,
배경 이미지가 CSS의 이전 합성 설정과 섞여서 밝게 뜨고 있었는지 확인하는 실험입니다.

즉, 다음을 확인하려는 버전입니다.

1. 배경 합성을 완전히 끊었을 때 화면이 선명해지는지
2. 선명해진다면 원인이 opacity가 아니라 background blend 구조였는지
3. 그래도 뿌옇다면 이미지 원본 톤 또는 다른 CSS/브라우저 요소를 더 의심해야 하는지

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
