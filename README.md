# 살아있는 숲

현재 테스트판: V1.10 test  
기준 버전: V1.9 test  
최근 업데이트: 월드 숲 내 나무 성장 이미지 반영 1차  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.10 test 핵심 변경점

V1.10 test는 V1.9 test에서 내 정원에만 보이던 성장 단계별 고화질 나무 PNG 이미지를 월드 숲의 내 자리에도 작게 표시하는 테스트판입니다.

기존에는 월드 숲에서 내 나무가 `•`, `✦`, `✧`, `✺` 같은 기호로만 보였기 때문에, 내 정원에서 키운 나무가 월드 숲에 실제로 자리 잡았다는 느낌이 약했습니다.

이번 버전에서는 월드 숲의 내 자리 안에서도 성장 일수에 맞는 미니 나무 이미지가 보이도록 바꾸었습니다.

## 적용된 성장 이미지 기준

- 0일: `tree-germination-v1.png`
- 1~2일: `tree-sprout-v1.png`
- 3~4일: `tree-seedling-v1.png`
- 5~6일: `tree-leafy-seedling-v1.png`
- 7~9일: `tree-sapling-v1.png`
- 10~13일: `tree-branching-sapling-v1.png`
- 14~20일: `tree-early-tree-v1.png`
- 21~29일: `tree-young-canopy-v1.png`
- 30~59일: `tree-young-v1.png`
- 60일 이상: `tree-hero-v1.png`

## 유지되는 기능

- 월드 숲 / 개인 정원 이동
- 낮 / 노을 / 밤 시간대 연동
- 나무 이름 정하기
- 하루 1번 감정 기록
- 방문자 흔적 / 방문 기록
- 저장 구조 `schema 3` / `local-only`
- 테스트 모드 `?test=1`
- 성장 일수 강제 테스트 `?test=1&growthDays=숫자`

## 테스트 방법

기본 테스트:

- 낮: `?test=1&worldTime=day`
- 노을: `?test=1&worldTime=sunset`
- 밤: `?test=1&worldTime=night`

성장 일수 강제 테스트:

- 0일: `?test=1&growthDays=0`
- 7일: `?test=1&growthDays=7`
- 14일: `?test=1&growthDays=14`
- 30일: `?test=1&growthDays=30`
- 60일: `?test=1&growthDays=60`

확인 포인트:

- 내 정원에서 성장 단계별 나무 이미지가 기존처럼 잘 보이는지
- 월드 숲으로 돌아갔을 때 내 자리에도 같은 성장 단계의 미니 나무 이미지가 보이는지
- `내 나무 보기` 버튼을 눌렀을 때 월드 숲의 내 나무가 자연스럽게 강조되는지
- 기존 방문자 흔적/방문 기록/시간대 연동이 깨지지 않는지

시간대와 성장 단계를 함께 확인하려면 예를 들어 `?test=1&worldTime=day&growthDays=14`처럼 사용하면 됩니다.
