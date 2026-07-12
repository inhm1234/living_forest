# 오늘의숲 SQL 적용 이력 보관

이 폴더의 SQL 파일은 이미 Supabase에 실행된 기능별 적용 이력입니다.

## 중요
- 이 파일들은 **GitHub에 보관만** 합니다.
- 현재 운영 DB에 다시 실행하지 마세요.
- 새 Supabase 프로젝트를 처음부터 구성할 때에만, 아래 순서와 기존 기본 스키마를 확인한 뒤 사용합니다.

## 기능별 순서
1. `SQL_SHARED_TREE_SEED_V1.sql` (기존 저장소에 있음)
2. `SQL_SHARED_TREE_GROWTH_V1.sql`
3. `SQL_SHARED_TREE_LIGHT_BUTTON_V1.sql`  
   - 2번의 개인 기록 자동 적립을 끄고, 공유나무 화면의 별도 빛 남기기 방식으로 바꿉니다.
4. `SQL_GARDEN_FEEDBACK_V1.sql`
5. `SQL_GARDEN_FEEDBACK_REPLY_V1.sql`
6. `SQL_GARDEN_FEEDBACK_ADMIN_V1.sql`
7. `SQL_HEART_FRUITS_V1.sql`  
   - 이번 마음 열매 배포 전에 운영 DB에서 한 번만 실행합니다.
   - 실행 뒤에는 다른 SQL과 마찬가지로 이력 파일로 보관합니다.

## 현재 기능 연결
- 공유나무: 씨앗 생성 → 별도 빛 남기기
- 피드백: 사용자 의견 저장 → 사용자 답장 확인 → 운영자 전용 문의함
- 마음 열매: 기존 기록 비공개 기본값 → 본인 공개 설정 → 친구에게 공개 기록만 표시
