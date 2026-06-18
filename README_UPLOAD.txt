오늘의숲 DEV v0.2.9 전체숲 30그루 배치 테스트 패치

적용 대상:
- dev/index.html
- dev/app.js
- dev/style.css

적용 방법:
1. GitHub living_forest 저장소에서 dev 폴더를 연다.
2. 이 ZIP 안의 dev/index.html, dev/app.js, dev/style.css 3개 파일을 같은 위치에 덮어쓴다.
3. 커밋 메시지 예시:
   DEV v0.2.9 world forest 30 trees layout
4. 배포 후 확인:
   https://inhm1234.github.io/living_forest/dev/

변경 내용:
- worldForestSlots를 6그루에서 29그루로 확장했다.
- 내 나무는 기존 #myWorldSpot으로 따로 표시되므로, 화면 체감은 내 나무 1 + 주변 나무 29 = 약 30그루다.
- 길은 비우고, 공터/중간/뒤쪽 레이어 중심으로 배치했다.
- DEV 화면 표기를 v0.2.9로 변경했다.
- lf-v1740-ux 스타일을 추가해 많은 나무가 너무 과하게 커지지 않도록 조정했다.
