# Tree Growth Atlas v2

이 폴더는 `growth_count` 0~365+를 14개의 성장 이미지로 표시하기 위한 작업 공간입니다. 현재 운영 `app.html`의 내 정원·친구 정원에 연결되어 있습니다.

## 확정 규격

- 원본: 500×500 투명 PNG
- 파일명: `source/tree_stage01.png` ~ `source/tree_stage14.png`
- 아틀라스 셀: 512×512
- 셀 내부 여백: 사방 6px
- 공통 기준점 권장값: x=250, y=480
- 배포 포맷: 투명 WebP, quality 86
- 초기 아틀라스: Stage 1~7, 4×2
- 장기 아틀라스: Stage 8~14, 4×2
- 시간대·날씨·애니메이션은 별도 파일로 관리

## 파일 역할

- `tree_growth_stage_map_v1.json`: 기록 수 → 14단계 매핑
- `tree-growth-stage-map.js`: 매핑 계산과 다음 단계 정보
- `tree-growth-atlas.js`: WebP 아틀라스에서 한 프레임 표시
- `tree-growth-renderer.js`: 기록 수를 받아 올바른 아틀라스를 자동 선택
- `source/`: 승인된 개별 PNG 원본
- `tools/tree_atlas/validate_tree_assets.py`: 원본 규격 검사
- `tools/tree_atlas/build_tree_growth_all.py`: 검사 후 두 아틀라스 자동 생성

## 성장 구간

| Stage | growth_count |
|---:|---:|
| 1 | 1 |
| 2 | 2~3 |
| 3 | 4~6 |
| 4 | 7~10 |
| 5 | 11~15 |
| 6 | 16~21 |
| 7 | 22~30 |
| 8 | 31~45 |
| 9 | 46~60 |
| 10 | 61~90 |
| 11 | 91~120 |
| 12 | 121~180 |
| 13 | 181~240 |
| 14 | 241 이상 |

`growth_count = 0`은 Stage 1 이미지를 사용하면서 문구만 `마음을 기다리는 새싹`으로 표시합니다. 30회와 365회는 별도 기념 연출을 사용할 수 있습니다.

## 원본이 완성된 뒤 실행

프로젝트 최상단에서:

```bash
python tools/tree_atlas/validate_tree_assets.py
python tools/tree_atlas/build_tree_growth_all.py
```

생성 파일:

```text
assets/garden/tree_growth_v2/tree_growth_early_atlas_v1.webp
assets/garden/tree_growth_v2/tree_growth_early_atlas_v1.json
assets/garden/tree_growth_v2/tree_growth_late_atlas_v1.webp
assets/garden/tree_growth_v2/tree_growth_late_atlas_v1.json
```

## 운영 연결 예시

스크립트 순서:

```html
<script src="./assets/garden/tree_growth_v2/tree-growth-stage-map.js"></script>
<script src="./assets/garden/tree_growth_v2/tree-growth-atlas.js"></script>
<script src="./assets/garden/tree_growth_v2/tree-growth-renderer.js"></script>
```

렌더링:

```js
const state = await TodayForestTreeRenderer.render(treeElement, {
  growthCount: profile.growth_count,
  displaySize: 390,
});

console.log(state.stage, state.nextAt, state.milestone);
```

## 현재 상태

- 매핑 및 빌드 파이프라인: 준비 완료
- 기존 1~6 아침 이미지 프로토타입: 구조 검증 완료
- 신규 Stage 1~14 원본: 아직 넣지 않음
- 운영 `app.js`, `app.html`, `style.css`: 변경하지 않음

## 개발 QA 화면

신규 원본이 들어오면 아래 주소에서 14단계 전체와 공통 밑동선을 확인합니다.

```text
/dev/tree-growth-qa.html
```

QA 화면은 운영 나무를 바꾸지 않으며, `source/tree_stage01.png`부터 `tree_stage14.png`까지가 없으면 각 칸에 `원본 없음`을 표시합니다.

## 구조 검사

이미지가 없어도 성장 구간과 아틀라스 좌표 구조는 먼저 검사할 수 있습니다.

```bash
python tools/tree_atlas/check_tree_growth_pipeline.py
```

검사 결과는 `assets/garden/tree_growth_v2/pipeline_check_report.json`에 저장됩니다. `structureValid=true`는 코드 구조가 정상이라는 뜻이고, `readyForProductionBuild=true`는 승인된 14개 PNG까지 모두 준비됐다는 뜻입니다.
