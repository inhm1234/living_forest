# TodayForest Supabase baseline — 2026-08-08

이 폴더는 **현재 운영 DB의 구조를 다시 만들기 위한 설계도**입니다.
운영 DB에 그대로 실행하는 업데이트 SQL이 아닙니다.

## 포함 범위

- public 테이블: **57개**
- 함수: 기존 스냅샷 **165개** + 이후 추가된 관리자 통계 RPC 1개
- RLS 정책: **29개**
- 인덱스 스냅샷: **141개** (PK/UNIQUE가 자동 생성하는 인덱스는 baseline에서 중복 생성하지 않음)
- 일반 DB 트리거: **9개**
- RLS 자동 활성화 event trigger: baseline에서 표준 이름으로 재구성
- 함수/테이블 권한: 2026-08-08 보안 점검 이후 상태를 기준으로 최소 권한 형태로 정리

## 절대 포함하지 않는 것

- service_role 값
- OOT_PUSH_WEBHOOK_SECRET 실제 값
- VAPID_PRIVATE_KEY 실제 값
- 사용자 비밀번호/토큰
- 원본 `032406.csv`의 secret-bearing webhook 정의

## 중요한 제한

이것은 **schema baseline**입니다. 사용자 데이터 자체를 백업한 파일이 아닙니다.
또한 Supabase의 `auth`, `storage` 같은 관리형 스키마 전체를 덤프한 것도 아닙니다.
실제 재난 복구 시에는 데이터 백업과 함께 사용해야 합니다.

## 새 Supabase 프로젝트로 복구할 때의 순서

1. 새 Supabase 프로젝트를 만든다.
2. `20260808_baseline.sql`을 **새 프로젝트에서만** 실행한다.
3. `supabase/functions/oot-push-invites/index.ts`를 Edge Function으로 배포한다.
4. Edge Function Secrets에 다음 값을 복구한다.
   - `OOT_PUSH_WEBHOOK_SECRET`
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`
   - Supabase 기본 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
5. `oot-push-invites`의 **Verify JWT with legacy secret = OFF**를 확인한다.
6. `oot_invites`의 Database Webhook을 다시 만든다. 헤더에는 service_role을 넣지 말고
   `x-oot-webhook-secret` 전용 secret만 사용한다.
7. 사용자/기준 데이터를 복구한 뒤 기능 테스트를 한다.

## Webhook을 SQL 파일에 자동 복구하지 않는 이유

Database Webhook의 헤더에는 비밀값이 필요합니다. 그 값을 Git에 넣으면 같은 문제가 다시 생깁니다.
따라서 baseline SQL은 webhook trigger를 의도적으로 만들지 않습니다.

## 아직 별도 백업이 필요한 것

- 실제 사용자 데이터
- 기준/카탈로그 데이터(예: 장식 아이템·레시피)의 seed 백업
- Supabase Auth 사용자
- Storage 객체가 생길 경우 Storage 백업
- Edge Function Secret 실제 값(비밀번호 관리자 등 Git 외부 보관)

## 원칙

- raw metadata CSV는 GitHub에 올리지 않습니다.
- 특히 2026-08-08에 내려받았던 secret-bearing trigger CSV는 보관/커밋하지 않습니다.
- 앞으로 DB 구조를 바꿀 때는 baseline을 계속 덮어쓰기보다 `supabase/migrations/`에 변경 SQL을 남기는 것이 좋습니다.
