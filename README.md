# 살아있는 숲

현재 테스트판: V1.10.21 test  
기준 버전: V1.10.20 test  
최근 업데이트: 오버레이 강력 축소 / 배경 선명도 강화  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.10.21 test 핵심 변경점

V1.10.21 test는 V1.10.20에서 여전히 화면이 뿌옇게 보인다는 문제를 해결하기 위해,
오버레이를 훨씬 더 강하게 줄인 테스트판입니다.

핵심 방향은 다음과 같습니다.

- 낮 화면은 거의 원본 배경 이미지 그대로 보이도록 오버레이를 매우 약하게 조정
- 노을 화면은 분위기만 살릴 정도로만 약하게 유지
- 밤 화면만 분위기용으로 조금 더 남김
- 월드 숲과 개인 정원 모두 배경 이미지 contrast를 살짝 높여 선명도 보정
- 내 나무 주변 강조 효과도 조금 더 약하게 조정
- 메시지 카드와 접지 그림자도 배경을 덜 가리도록 약화

## 이번 버전의 대표 수치 변화

### 월드 숲
- `world-stage::before`
  - V1.10.20: `0.58`
  - V1.10.21: 기본 `0.10`, 노을 `0.16`, 밤 `0.24`
- `world-stage::after`
  - V1.10.20: `0.46`
  - V1.10.21: 기본 `0.12`, 노을 `0.18`, 밤 `0.26`
- `world-time-day .world-dim`
  - V1.10.20: `0.12`
  - V1.10.21: `0.01`

### 개인 정원
- `garden-time-day .garden-dim`
  - V1.10.20: `0.10`
  - V1.10.21: `0.01`
- `garden-time-sunset .garden-dim`
  - V1.10.20: `0.16`
  - V1.10.21: `0.04`
- `garden-time-night .garden-dim`
  - V1.10.20: `0.28`
  - V1.10.21: `0.12`

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
