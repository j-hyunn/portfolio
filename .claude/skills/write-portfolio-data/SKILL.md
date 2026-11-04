---
name: write-portfolio-data
description: "src/data 의 커리어·프로젝트·프로필 데이터를 실제로 기입하는 절차. 새 회사·경력·회사 프로젝트·성과 지표·사이드 프로젝트·스킬·역량을 추가하거나 기존 항목을 수정·보완할 때, career.ts / paprika-projects.ts / techup-projects.ts / projects.ts / profile.ts / overview.ts / project-docs.ts 를 편집할 때 반드시 이 스킬을 사용할 것. 신규 프로젝트 등록 시 함께 고쳐야 하는 파일, 컨벤션 유지, tsc 검증 절차를 담는다."
---

# Write Portfolio Data

> **이 스킬은 팀 작업의 구성 요소다.** 사용자 요청에서 직접 트리거됐고 작업이 단일 파일 수정보다 크면(수집·해석·기입·검증이 함께 필요하면) `portfolio-info-orchestrator` 를 먼저 검토하라. 혼자 기입하면 경계면 검증과 소유권 분리가 빠진다.


`src/data/` 하위 TS 데이터 파일을 기입하는 절차. 스키마 정본은 `portfolio-schema` 스킬에 있으므로 먼저 읽는다.

## 기입 전 2분

1. 대상 배열의 **이웃 항목 2개를 읽는다.** 필드 순서, 따옴표, 주석 위치, 날짜 표기가 정본이다. 이 저장소에는 포매터 설정이 없어 스타일이 사람 손으로 유지된다
2. 추가하려는 항목이 **이미 있는지** 확인한다 (`grep -n "{회사명}\|{slug}" src/data/*.ts`). 있으면 추가가 아니라 수정이다
3. 타입 선언을 직접 읽어 필드명을 확정한다. 계획서의 필드명이 타입에 없으면 타입을 바꾸지 말고 계획을 쓴 쪽에 물어본다

## 커리어 항목 추가

새 회사:
1. `src/data/{company}-projects.ts` 를 만들고 `CareerProject[]` 를 `export const {company}Projects` 로 내보낸다 — 기존 `paprika-projects.ts` 의 구조를 따른다
2. `career.ts` 상단에 `import` 추가
3. `career` 배열 **맨 앞**(최신이면)에 `CareerEntry` 추가
4. `startDate`/`endDate` 와 `period`/`duration` 을 함께 계산해 모순이 없게 한다. 재직 중은 `endDate: null`

기존 회사에 프로젝트 추가: 해당 `{company}-projects.ts` 배열에만 추가한다. `career.ts` 는 건드리지 않는다.

`duration` 계산은 개월 수를 직접 세서 쓴다 (`2023-11` ~ `2025-09` = 1년 11개월). 자동 계산 로직이 없으므로 틀리면 그대로 노출된다.

## 사이드 프로젝트 추가

`projects.ts` 의 `ProjectEntry` 추가만으로는 **문서가 렌더되지 않는다.** 네 곳을 함께 고친다:

1. `projects.ts` — `ProjectEntry` 추가 (`docs`/`docGroups` 는 doc-ingestor가 확정한 slug만)
2. `project-docs.ts` — `import.meta.glob('../content/{slug}/*.md', { query: '?raw', import: 'default', eager: true })` 블록 추가
3. `project-docs.ts` — `sourcesByProject` 에 `{slug}: toSlugMap({slug}Modules)` 추가
4. `project-docs.ts` — `wikiTargetToSlug` 에 `{slug}: { ... }` 키 추가 (doc-ingestor가 요청한 매핑)

2~3을 빼면 메뉴는 보이고 본문은 전부 빈 페이지가 된다. 빌드는 통과하므로 QA의 교차 검증에서만 잡힌다.

`import.meta.glob` 의 경로 리터럴은 **정적 문자열이어야 한다** — 변수로 조립하면 Vite가 번들에 포함하지 못한다.

## 프로필 · 역량 수정

- `profile.ts` 의 `avatarUrl` 은 `import.meta.env.BASE_URL` 접두사를 유지한다. 절대 경로(`/images/...`)로 바꾸면 GitHub Pages 하위 경로 배포에서 깨진다
- `overview.ts` 의 `skillGroups` 는 배열의 배열이고 내부 배열이 화면의 한 줄이다. 항목을 추가할 때 줄 균형(한 줄에 4~6개)을 본다
- 연락처·링크 변경은 사용자 요청이 명시적일 때만 기입한다

## 타입 확장이 필요할 때

기존 항목 전체를 고쳐야 하는 **필수 필드 추가를 피한다.** 선택 필드(`field?: T`)로 추가하고, 위에 한 줄 주석으로 용도와 화면 노출 위치를 남긴다 — 기존 주석들이 그 역할을 하고 있으니 같은 형식을 따른다.

## 검증

```bash
npx tsc --noEmit
```

통과했다고 끝이 아니다. 타입은 맞고 데이터 짝이 틀린 상태가 이 저장소의 주된 결함이므로, `verify-portfolio` 의 정합성 검사까지 돌려야 기입이 완료된다.

## 출력

`_workspace/04_writer_changes.md` 에 변경 표와 추가한 slug 목록, `tsc` 결과를 남긴다. 추가한 slug는 doc-ingestor·QA가 교차 검증의 기준으로 쓰므로 빠뜨리면 검증이 헛돈다.
