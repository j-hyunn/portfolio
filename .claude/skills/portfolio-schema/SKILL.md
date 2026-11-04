---
name: portfolio-schema
description: "포트폴리오(src/data, src/content)의 데이터 스키마 정본. 커리어 항목(CareerEntry/CareerProject/ProjectSection), 사이드 프로젝트(ProjectEntry/ProjectDoc/ProjectDocGroup), 프로필·역량, 산출물 문서 배치 규칙과 네 갈래 라우팅 기준을 담는다. 포트폴리오에 새 회사·프로젝트·성과·문서·역량을 넣거나 기존 항목을 고칠 때, 어느 파일의 어느 필드에 무엇을 넣어야 하는지 판단해야 하면 반드시 이 스킬을 먼저 읽을 것. career.ts, projects.ts, profile.ts, overview.ts, project-docs.ts, src/content 를 편집하기 전에도 읽을 것."
---

# Portfolio Schema

> **이 스킬은 팀 작업의 구성 요소다.** 사용자 요청에서 직접 트리거됐고 작업이 단일 파일 수정보다 크면(수집·해석·기입·검증이 함께 필요하면) `portfolio-info-orchestrator` 를 먼저 검토하라. 혼자 기입하면 경계면 검증과 소유권 분리가 빠진다.


`src/data/` 와 `src/content/` 의 구조 정본. 정보를 어디에 넣을지 판단하고, 필드를 채우는 기준을 정한다.

**중요:** 이 문서는 요약이고, 최종 정본은 각 `.ts` 파일의 `export type` 선언이다. 기입 전 해당 파일의 타입 선언을 직접 읽어 대조하라. 타입이 바뀌었는데 이 문서가 갱신되지 않았을 수 있다.

## 네 갈래 라우팅

정보가 들어갈 수 있는 곳은 네 군데뿐이다. 먼저 어디인지 정하고 나서 필드를 채운다.

| 갈래 | 대상 파일 | 화면 | 들어가는 정보 |
|------|----------|------|-------------|
| 커리어 | `career.ts` → `paprika-projects.ts` / `techup-projects.ts` | Career 페이지, 드로어 | 고용·교육 이력, 그 안에서 수행한 회사 프로젝트와 성과 |
| 사이드 프로젝트 | `projects.ts` | Projects 목록 + 프로젝트 상세 | 독립 산출물 문서를 가진 프로젝트 |
| 산출물 문서 | `src/content/{project}/{slug}.md` | 프로젝트 문서 뷰어 | PRD·TRD·정책·기능명세 등 실제 작업 문서 |
| 프로필 · 역량 | `profile.ts`, `overview.ts` | Overview 페이지 | 인물 정보, 가치관, 강점, 스킬, 역량 카테고리 |

### 커리어 프로젝트 vs 사이드 프로젝트

가르는 기준은 규모가 아니라 **문서 트리를 가지는가**다.

- **CareerProject** (`paprika-projects.ts` 등): 회사·교육 과정 소속으로 수행. 드로어 안의 카드로 보이고, 상세는 `sections`(제목 + 본문/불릿/인용) 로 한 덩어리씩 쓴다. 별도 URL이 없다.
- **ProjectEntry** (`projects.ts`): 자체 상세 페이지와 좌측 문서 메뉴를 가진다. PRD 같은 마크다운 산출물이 여러 개 있을 때 선택한다.

같은 프로젝트를 양쪽에 중복 기입하지 않는다. 회사 프로젝트인데 문서를 공개하고 싶으면, 커리어 항목의 `links` 로 프로젝트 페이지를 가리키는 방식을 택한다.

## 커리어 스키마 (`src/data/career.ts`)

```ts
type CareerEntry = {
  type: 'work' | 'education'
  company: string          // 교육은 '[Tech Up] Product Management 1기' 처럼 과정명
  role?: string            // 교육 과정은 생략 → 화면에 미노출
  domain: string           // 'B2B SaaS · 프로덕트팀', 'Bootcamp · KT Cloud'
  startDate: string        // 'YYYY-MM' — 정렬용
  endDate: string | null   // 'YYYY-MM', 재직 중은 null
  period: string           // 표시용 '2023.11 - 2025.09'
  duration: string         // 표시용 '1년 11개월'
  description: string      // 없으면 빈 문자열
  projects?: CareerProject[]  // 회사별 파일에서 import 해 연결
}

type CareerProject = {
  title: string
  period: string
  summary: string
  role?: string
  goal?: string
  metrics?: string[]       // 카드 하단 뱃지. 수치 중심 짧은 문구
  tags?: string[]
  sections?: ProjectSection[]  // 중첩 드로어 상세 본문
  links?: { label: string; url: string }[]
}

type ProjectSection = {
  heading: string
  body?: string
  bullets?: string[]
  quote?: string
}
```

규칙:
- `career` 배열은 **최신순**(위가 최근). `startDate` 와 배열 순서가 어긋나면 안 된다.
- `startDate`/`endDate` 는 정렬·계산용, `period`/`duration` 은 표시용이다. 한쪽만 고치면 모순이 생기니 함께 고친다.
- 회사별 프로젝트는 `career.ts` 에 인라인하지 않고 `{company}-projects.ts` 로 분리해 `import` 한다. 새 회사가 생기면 같은 패턴으로 파일을 만든다.
- 선택 필드를 빈 배열·빈 문자열로 채우지 말고 **생략**한다. 생략하면 화면에 노출되지 않는다.

## 사이드 프로젝트 스키마 (`src/data/projects.ts`)

```ts
type ProjectEntry = {
  slug: string             // URL·폴더명. 영소문자+하이픈
  title: string
  subtitle?: string        // 한글 표기 등
  description: string      // 한 문단. 문제 → 해결 → 효과 순서로 압축
  period: string           // '2026.03 ~ (운영 중)' / '2026.01 – 2026.04'
  tags: string[]
  docs: ProjectDoc[]       // 그룹 없이 단독 노출되는 문서
  docGroups?: ProjectDocGroup[]  // 아코디언으로 묶인 문서 그룹
}

type ProjectDoc = { slug: string; title: string }
type ProjectDocGroup = { title: string; docs: ProjectDoc[] }
```

규칙:
- `docs[].slug` 는 `src/content/{project}/{slug}.md` 의 파일명과 **정확히** 일치해야 한다. 어긋나면 메뉴 항목을 눌러도 빈 문서가 나온다.
- 문서가 4~5개를 넘고 성격이 갈리면 `docGroups` 로 묶는다(예: `기능 명세`, `운영 · 정책`, `약관`).
- PRD·BRD처럼 대표 문서는 `docs` 에 단독으로 두어 메뉴 최상단에 노출한다.
- `allProjectDocs(project)` 가 단독+그룹을 합쳐 반환한다. 메뉴 전수 검사는 이 함수 기준으로 한다.

## 산출물 문서 배치 (`src/content/` + `project-docs.ts`)

`project-docs.ts` 가 빌드 시 `import.meta.glob` 으로 마크다운을 읽어 `markdownDocs['{project}/{doc}']` 맵을 만들고, 옵시디언 문법을 정규화한다.

**신규 프로젝트를 추가할 때 `project-docs.ts` 에서 함께 고쳐야 하는 네 곳:**
1. `const {project}Modules = import.meta.glob('../content/{project}/*.md', ...)` 블록 추가
2. `sourcesByProject` 에 `{project}: toSlugMap({project}Modules)` 추가
3. `wikiTargetToSlug` 에 `{project}: { ... }` 키 추가
4. 이식하지 않는 참조 문서가 있으면 `missingDocs` 에 추가

1~2를 빼먹으면 메뉴는 보이는데 문서 본문이 전부 비는 상태가 된다. 이것이 이 저장소에서 가장 자주 나는 결함이다.

정규화 동작(이식 시 전제해야 하는 것):
- `![[image.png]]` 임베드는 **제거**된다 → 보여줄 이미지는 `src/assets/` 로 옮겨 컴포넌트에서 쓴다
- `[[문서]]` 는 `wikiTargetToSlug[project][소문자 파일명]` 에 있으면 내부 링크, 없으면 **라벨 텍스트만** 남는다
- `missingDocs` 에 있는 제목을 가리키는 리스트 줄은 통째로 제거된다
- claude.ai 채팅 링크는 라벨만 남는다

## 프로필 · 역량 (`profile.ts`, `overview.ts`)

- `profile.ts`: 단일 객체. 이름·직함·헤드라인(2줄 배열)·인트로·학력·연락처·링크. `avatarUrl` 은 `import.meta.env.BASE_URL` 기준 상대 경로를 유지한다 (GitHub Pages 하위 경로 배포 때문).
- `overview.ts`: `principles`, `strengths`(각 `{title, body}`), `skillGroups`(문자열 배열의 배열 — 줄 단위 묶음), `capabilities`(카테고리별 역량).

연락처·링크는 공개 사이트에 노출되는 값이다. 변경 요청이 사용자 본인에게서 온 것인지 확인하고 기입한다.

## 문체 규칙

기존 항목과 결을 맞춘다. 새 항목만 톤이 튀면 전체 신뢰도가 떨어진다.
- 평서형 `~합니다` / `~했다` 혼용 금지 — 해당 파일의 기존 항목을 따른다
- 성과는 수치와 기준을 함께 (`전환율 12% → 18%`), 근거 없는 형용사(`획기적인`, `완벽한`) 금지
- `description`·`summary` 는 한 문단. 문제 → 해결 → 효과 순서
