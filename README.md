# 살아있는 숲

현재 테스트판: V1.9 test  
기준 버전: V1.8.3 test  
최근 업데이트: 나무 성장 이미지 실제 적용  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.9 test 핵심 변경점

V1.9 test는 기존 임시 SVG 나무 표현 대신, `assets/garden/`에 업로드한 고화질 나무 성장 이미지가 성장 일수에 따라 바뀌도록 적용한 테스트판입니다.

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
- 월드 숲 내 자리 반영
- 방문자 흔적 / 방문 기록
- 저장 구조 `schema 3` / `local-only`
- 테스트 모드 `?test=1`

## 테스트 방법

기본 테스트:

- 낮: `?test=1&worldTime=day`
- 노을: `?test=1&worldTime=sunset`
- 밤: `?test=1&worldTime=night`

성장 일수 강제 테스트:

- 0일: `?test=1&growthDays=0`
- 1일: `?test=1&growthDays=1`
- 3일: `?test=1&growthDays=3`
- 7일: `?test=1&growthDays=7`
- 14일: `?test=1&growthDays=14`
- 21일: `?test=1&growthDays=21`
- 30일: `?test=1&growthDays=30`
- 60일: `?test=1&growthDays=60`

시간대와 함께 확인하려면 예를 들어 `?test=1&worldTime=day&growthDays=14`처럼 사용하면 됩니다.
