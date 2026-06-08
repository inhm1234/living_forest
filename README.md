# 살아있는 숲

현재 테스트판: V1.10.26 test  
기준 버전: V1.10.25 test  
최근 업데이트: GA4 행동 데이터 수집판  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.10.26 test 핵심 변경점

V1.10.26 test는 화면 디자인을 바꾸는 버전이 아니라,  
사용자가 실제로 어떤 행동을 하는지 자동으로 측정하기 위한 데이터 수집판입니다.

적용한 GA4 측정 ID:

```text
G-YC872G7MH1
```

## 수집하는 핵심 이벤트

```text
app_opened
first_visit_living_forest
return_visit
screen_view_world
screen_view_garden
go_garden_click
tree_name_saved
mood_recorded
return_world_click
share_click
growth_milestone_reached
growth_day_7_reached
```

## 이 버전의 목적

이제부터는 감으로 판단하지 않고 아래 질문을 숫자로 확인할 수 있습니다.

- 몇 명이 들어왔는가?
- 첫 화면에서 내 정원으로 들어갔는가?
- 나무 이름을 저장했는가?
- 감정을 기록했는가?
- 다시 전체 숲으로 돌아갔는가?
- 공유를 눌렀는가?
- 다음 날 다시 왔는가?
- 7일차까지 도달했는가?

## 개인정보 관련 주의

이 버전은 사용자가 입력한 나무 이름의 실제 내용은 GA4로 보내지 않습니다.  
감정도 `좋음/보통/피곤` 같은 선택값과 행동 여부 중심으로만 기록합니다.

## 유지한 내용

- V1.10.25의 선명한 숲 배경 구조 유지
- 기존 저장키 `livingForestV012` 유지
- 테스트 저장키 `livingForestV012_TEST` 유지
- schema 3 유지
- 성장 이미지, 방문자 흔적, 감정 기록 기능 유지
- assets 폴더는 포함하지 않음
