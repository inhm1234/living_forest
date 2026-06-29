오늘의숲 · 첫날의 작은 산책 튜토리얼 v2.1 (DEV 검수용)

교체할 파일 3개
- dev/garden-login-test/index.html
- dev/garden-login-test/garden.js
- dev/garden-login-test/garden.css

v2.1에서 바뀐 점
- 첫 안내가 단순 반짝임이 아니라 “첫날의 작은 산책 1 / 3” 흐름으로 보입니다.
- 숲빛이 나무 주변에 나타나고, 사용자가 화면을 눌러 시작합니다.
- 숲빛이 실제로 ‘마음 남기기’ 버튼 쪽으로 이동하며, 다른 메뉴는 잠시 뒤로 물러납니다.
- 기록 시트에서는 2 / 3 한 줄 안내만 남습니다.
- 기록 후 반짝이는 별빛을 찾으면 3 / 3 완료 카드가 잠깐 보이고 끝납니다.
- 동물·편지·친구·공유나무·꾸미기 규칙은 수정하지 않았습니다.
- 운영 todayforest.pages.dev는 수정하지 않고 DEV 경로만 수정합니다.

검수 주소
- 첫 장면: https://inhm1234.github.io/living_forest/dev/garden-login-test/?tutorialPreview=intro
- 마음 남기기 유도 장면: https://inhm1234.github.io/living_forest/dev/garden-login-test/?tutorialPreview=record
- 작은 것 발견 장면: https://inhm1234.github.io/living_forest/dev/garden-login-test/?tutorialPreview=discovery

확인 포인트
1. 첫 장면이 '힌트'가 아니라 짧은 시작 장면처럼 느껴지는지
2. 화면을 누르면 숲빛이 마음 남기기 쪽으로 이동하는지
3. 마음 남기기 버튼 외의 메뉴가 방해되지 않는지
4. 모바일에서 안내 카드가 버튼이나 글자를 가리지 않는지
5. 발견 장면에서 별빛을 눌러도 기존 발견 기능이 정상 실행되는지


V2.1 보정
- 2단계에서 숲빛이 나무에서 마음 남기기 버튼으로 이동할 때, 짧은 빛가루 흔적 4개가 남습니다.
- 안내 카드를 버튼에서 조금 더 띄우고, 배경 흐림을 약하게 해 정원 그림이 더 살아납니다.
