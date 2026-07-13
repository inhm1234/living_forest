오늘의숲 · 새 공유나무가 심어진 순간 v2.0
기준 소스: living_forest-shared-tree-memory-note-v1.9

[이번 변경]
- 다음 씨앗을 수락한 사람에게 약 2초 동안 씨앗이 새싹으로 자라는 시작 장면 표시
- 수락한 사람 문구: “둘의 다음 나무가 이 숲에 심겼어요.”
- 제안한 사람은 친구가 수락한 뒤 해당 친구의 ‘함께한 숲’에 들어왔을 때 한 번 발견
- 제안한 사람 문구: “친구가 씨앗을 함께 심었어요.”
- 사용자별 본 시각을 서버에 기록해 다른 기기에서도 반복 표시하지 않음
- 기존 완성 나무, 한마디, 다음 씨앗 제안·수락, 빛 기록 기능 유지

[SQL 확인 결과]
- moment_table_ready = true
- view_table_ready = true
- list_rpc_ready = true
- mark_rpc_ready = true
- accept_rpc_ready = true
- moment_count = 1
- seen_count = 0
- orphan_moment_count = 0
- invalid_participant_count = 0
- duplicate_view_count = 0

SQL은 다시 실행하지 않아도 됩니다.

[GitHub에 업로드할 파일]
1. app.js
2. style.css
3. index.html

[검수 순서]
1. 배포 후 두 계정 모두 강력 새로고침
2. B 계정이 기다리는 다음 씨앗을 ‘함께 심기’로 수락
3. 수락 직후 시작 장면이 약 2초 표시되는지 확인
4. 장면 뒤 새 공유나무 0/20 상세로 이동하는지 확인
5. A 계정에서 해당 친구의 ‘함께한 숲’ 진입
6. “친구가 씨앗을 함께 심었어요.” 장면이 한 번 표시되는지 확인
7. 다시 들어가도 장면이 반복되지 않는지 확인
8. 이전 완성 나무와 새 진행 중 나무가 함께 남는지 확인
9. 모바일에서 카드와 문구가 잘리지 않는지 확인

[참고]
moment_count = 1, seen_count = 0은 최근 생성된 새 나무 사건 1건이 복구되었고 아직 참여자별 시청 기록은 없다는 뜻입니다.
