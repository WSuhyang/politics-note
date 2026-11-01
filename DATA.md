# 정리노트 — 데이터 아키텍처 & 업데이트 운영 문서

> v3부터 적용. 데이터와 UI의 분리, 검증 파이프라인, 업데이트 절차.

## 1. 구조

```
politics-note/
├── data/                 ← ★ 원천 데이터 (사람이 편집, git 버전 관리)
│   ├── persons.json      인물 (id/camp/born/president/party/event/edu)
│   ├── relations.json    관계 (source/target/relation/type/strength)
│   ├── presidents.json   대통령 타임라인 (n/name/from/to/camp/party/event)
│   ├── parties.json      원내 정당 (name/leader/seats/spectrum)
│   ├── pledges.json      공약 + 역대 정부 비교표 (반드시 출처 src 필수)
│   ├── glossary.json     용어 사전 (t/cat/d)
│   └── notes.json        인물 상세 노트 (키=persons.id)
├── scripts/
│   ├── build.js          검증 + data.js 번들 생성  ← 업데이트마다 실행
│   └── make_v3.js        (일회성) v2→v3 변환기
├── data.js               ← 자동 생성 (직접 편집 금지) — v3.html이 읽음
├── v3.html               ← 순수 UI. 데이터 인라인 없음
└── v2.html, v1.html, index.html   이전 버전 보관
```

**데이터 흐름**: `data/*.json` (편집) → `node scripts/build.js` (검증·번들) → `v3.html` 자동 반영.

## 2. 왜 JSON+git 인가 (SQLite가 아니라)

- 현재 규모(인물 30·관계 28·공약 3)에서는 파일이 곧 DB — diff 리뷰 가능, 병합 가능, 실수 추적 가능
- git 커밋 = 자동 변경 이력 ("누가 언제 어떤 근거로 이 관계를 추가했나" 추적)
- 인물 300+ · 관계 질의가 복잡해지는 v2 단계에서 SQLite/그래프DB로 이관 (스키마는 그대로 매핑 가능하게 설계됨)

## 3. 검증 규칙 (build.js가 강제)

| 검사 | 내용 |
|---|---|
| persons | id 유일, camp enum(dem/con/mid), born 숫자·범위 |
| relations | source/target이 persons에 존재(참조 무결성), type enum, strength 1~3 |
| presidents | name이 persons에 존재, from<to, 주요 대통령 누락 경고 |
| parties | seats 0~300, 합계 300 초과 금지(미만은 결원 경고) |
| pledges | politician 존재, **real.src(출처) 필수**, rate엔 total 동반, status enum |
| glossary | 중복 용어 금지 |
| notes | 키가 persons.id와 일치 |

검증 실패 시 **data.js를 갱신하지 않음** → 사이트는 마지막 유효 상태 유지 (데이터 오류가 곧바로 서비스에 반영되지 않는 구조).

## 4. 업데이트 절차 (3종)

### A. 신규 인물 추가 (예: 새 당대표 선출)
1. `data/persons.json`에 항목 추가 (camp/born/party 필수, 출처는 `$comment`의 수집일 갱신)
2. 관계 있으면 `relations.json`에 추가 — relation 라벨에 언론 근거가 담기게 ("친명 캠프"처럼)
3. 중요 인물이면 `notes.json`에 상세 노트 추가
4. `node scripts/build.js` → 오류 0 확인 → 브라우저에서 확인

### B. 정기 업데이트 (월 1회 권장)
1. aside로 조사: 위키백과 '대한민국의 정당'(의석·당대표), 대통령 지지율 등
2. 변경된 수치만 parties.json / pledges.json에 반영 — **출처·수집일 갱신 필수**
3. build → 확인 → git commit (커밋 메시지에 수집일 명시)

### C. 이벤트 발생 시 (탄핵·당명 변경·이별급 정치 사건 등)
1. presidents.json의 event 필드 또는 relations.json에 새 관계 추가
2. relations에 시점을 relation 라벨에 포함 ("3당 합당(1990)" 스타일)
3. 같은 절차로 build + 검증

## 5. 데이터 원칙 (PLAN.md §5와 연동)
- 모든 판정·통계는 출처(real.src) 필수 — 없으면 build가 거부
- 계보 라벨(○○키즈)은 언론 관용표현 — 관계 추가 시 근거 확인
- data.js는 생성물 — 절대 직접 편집하지 않음
- 백업: git 없이 운영 중이라면 최소 data/ 폴더를 data-backup-YYYYMMDD/로 복사 후 작업

## 6. 다음 확장 포인트
- relations에 `since`(숫자 연도) 필드 도입 → 관계 연혁 타임라인 뷰 가능
- persons에 `cohort`(사법연수원 기수 등) 필드 → 동문 질의 뷰
- git 저장소 초기화 + GitHub 백업
- Astro 전환 시: data/*.json이 그대로 콘텐츠 컬렉션으로 이동 (스키마 호환)
