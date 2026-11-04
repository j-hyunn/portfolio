---
name: portfolio-info-orchestrator
description: "포트폴리오에 새 정보를 기입하는 에이전트 팀 오케스트레이터. (1) '새 프로젝트 추가해줘', '이 레포 포트폴리오에 넣어줘', '커리어에 회사 추가', '경력 업데이트', '성과 지표 넣어줘', '산출물 문서 올려줘', '옵시디언 문서 가져와줘', '스킬/역량 추가' 요청 시, (2) GitHub URL이나 마크다운·옵시디언 경로를 주면서 '읽고 정리해서 넣어줘' 할 때, (3) 후속 작업 — '다시 실행', '재실행', '업데이트', '수정', '보완', '아까 넣은 것 고쳐줘', '문서만 다시', '커리어만 다시', '이전 결과 기반으로 개선' 요청 시에도 반드시 이 스킬을 사용할 것. career.ts / projects.ts / profile.ts / overview.ts / src/content 에 정보를 넣거나 고치는 모든 작업이 대상이다. 단순 질문(어디에 뭐가 있나)은 직접 답해도 된다."
---

# Portfolio Info Orchestrator

GitHub 저장소와 옵시디언·마크다운 문서를 읽어, 포트폴리오의 네 갈래(커리어 / 사이드 프로젝트 / 산출물 문서 / 프로필·역량)에 정확히 기입하는 팀을 조율한다.

## 실행 모드: 하이브리드

| Phase | 모드 | 이유 |
|-------|------|------|
| Phase 2 (출처 수집) | 서브 에이전트 | 출처별로 독립적이고 서로 참조할 필요가 없다. 병렬이 그대로 이득 |
| Phase 3 (해석 · 기입 · 검증) | 에이전트 팀 | slug·메뉴 등록·매핑을 서로 주고받아야 하고, QA가 모듈 단위로 끼어들어야 한다 |

Phase 3을 팀으로 묶는 이유는 **소유권 때문**이다. 문서를 이식하는 쪽과 메뉴에 등록하는 쪽이 서로 다른 파일을 소유하는데 같은 slug를 공유한다. 서브 에이전트로 나누면 slug 합의가 리더를 거쳐야 하고, 한쪽이 추측한 slug가 그대로 박혀 "메뉴에 있는데 내용이 없는 문서"가 된다.

## 팀 구성

| 팀원 | 에이전트 타입 | 역할 | 스킬 | 소유 파일 |
|------|-------------|------|------|----------|
| source-collector | general-purpose | 출처에서 원재료 추출 | `collect-source` | 없음 (읽기) |
| info-curator | general-purpose | 라우팅 결정 + 기입 계획 | `portfolio-schema` | `_workspace/03_curator_plan.md` |
| portfolio-data-writer | general-purpose | `src/data/**` 기입 | `write-portfolio-data`, `portfolio-schema` | `src/data/**` |
| doc-ingestor | general-purpose | `src/content/**` 이식 | `ingest-project-doc` | `src/content/**`, `src/assets/**` |
| portfolio-qa | general-purpose | 경계면 교차 검증 | `verify-portfolio` | 없음 (검증) |

모든 Agent 호출과 팀원 정의에 `model: "opus"` 를 명시한다.

## 워크플로우

### Phase 0: 컨텍스트 확인

1. `_workspace/` 존재 여부를 확인한다
2. 실행 모드를 정한다:
   - **미존재** → 초기 실행. Phase 1로
   - **존재 + 부분 수정 요청** ("문서만 다시", "커리어 날짜 틀렸어") → **부분 재실행.** 해당 팀원만 호출하고, 이전 산출물 경로를 프롬프트에 넣어 기존 결과를 읽고 고치게 한다. 수집은 다시 하지 않는다
   - **존재 + 새 출처 제공** → **새 실행.** 기존 `_workspace/` 를 `_workspace_{YYYYMMDD_HHMMSS}/` 로 이동한 뒤 Phase 1로
3. `git status --short` 로 커밋되지 않은 이전 기입이 남아 있는지 확인한다. 있으면 사용자에게 알리고 이어서 할지 되돌릴지 확인한다 — 미완료 기입 위에 덮어쓰면 무엇이 새 변경인지 구분할 수 없다

### Phase 1: 준비

1. 사용자 입력에서 파악할 것: **출처**(GitHub URL / 로컬 경로 / 대화 내용), **의도**(신규 추가 / 기존 보강 / 수정), **대상 갈래**(네 갈래 중 어디인지 — 불명확하면 info-curator가 판단)
2. `_workspace/` 생성, 출처 정보를 `_workspace/00_input/request.md` 에 저장
3. 출처가 전혀 없고 대화 내용만 있으면 Phase 2를 건너뛰고, 사용자 발언을 `_workspace/02_collector_conversation_raw.md` 로 정리해 Phase 3으로 간다

### Phase 2: 출처 수집

**실행 모드:** 서브 에이전트

출처마다 하나씩, 단일 메시지에서 병렬 호출한다:

```
Agent(
  subagent_type: "general-purpose",
  model: "opus",
  run_in_background: true,
  prompt: "`.claude/agents/source-collector.md` 의 역할 정의와 `collect-source` 스킬을 읽고 그에 따라 작업하라.
           수집 대상: {GitHub URL 또는 절대경로}
           수집 의도: {신규 프로젝트 / 커리어 항목 / 산출물 문서}
           출력: {저장소 루트}/_workspace/02_collector_{source-name}_raw.md"
)
```

출처가 1개면 병렬 의미가 없으니 그대로 1회 호출한다. 수집 결과의 `## 미확인 항목` 을 읽고, 사용자에게 바로 물어야 할 것이 있으면 Phase 3 전에 묻는다 — 미확인 값을 안고 기입에 들어가면 보류 항목이 늘어난다.

### Phase 3: 해석 · 기입 · 검증

**실행 모드:** 에이전트 팀

1. 팀 생성:

```
TeamCreate(
  team_name: "portfolio-info-team",
  members: [
    { name: "info-curator", agent_type: "general-purpose", model: "opus",
      prompt: "`.claude/agents/info-curator.md` 와 `portfolio-schema` 스킬에 따라 작업하라. 입력: _workspace/02_collector_*_raw.md" },
    { name: "portfolio-data-writer", agent_type: "general-purpose", model: "opus",
      prompt: "`.claude/agents/portfolio-data-writer.md` 와 `write-portfolio-data`·`portfolio-schema` 스킬에 따라 작업하라. src/data/** 를 소유한다." },
    { name: "doc-ingestor", agent_type: "general-purpose", model: "opus",
      prompt: "`.claude/agents/doc-ingestor.md` 와 `ingest-project-doc` 스킬에 따라 작업하라. src/content/** 와 src/assets/** 를 소유한다." },
    { name: "portfolio-qa", agent_type: "general-purpose", model: "opus",
      prompt: "`.claude/agents/portfolio-qa.md` 와 `verify-portfolio` 스킬에 따라 작업하라. 모듈이 하나 끝날 때마다 그 범위를 검증한다." }
  ]
)
```

2. 작업 등록 — 의존성을 명시한다:

```
TaskCreate(tasks: [
  { title: "기입 계획 수립", assignee: "info-curator",
    description: "수집 파일 전부를 읽고 라우팅을 결정해 _workspace/03_curator_plan.md 작성. 필수 필드 미확인은 '사용자 확인 필요'로 올린다" },
  { title: "문서 slug 확정", assignee: "doc-ingestor", depends_on: ["기입 계획 수립"],
    description: "이식할 문서의 slug를 확정하고 data-writer에게 SendMessage로 전달" },
  { title: "문서 이식", assignee: "doc-ingestor", depends_on: ["문서 slug 확정"],
    description: "src/content 로 이식, 위키링크 전수 처리, 매핑 추가 요청. 결과를 _workspace/04_ingestor_docs.md 에" },
  { title: "데이터 기입", assignee: "portfolio-data-writer", depends_on: ["문서 slug 확정"],
    description: "src/data 기입. 신규 프로젝트면 project-docs.ts 의 glob·sourcesByProject·wikiTargetToSlug 까지. 결과를 _workspace/04_writer_changes.md 에" },
  { title: "점진 검증", assignee: "portfolio-qa", depends_on: ["문서 이식", "데이터 기입"],
    description: "check-integrity.mjs + 수동 체크리스트 + 빌드. 결함을 담당별로 분리해 SendMessage. 리포트는 _workspace/05_qa_report.md" },
  { title: "결함 수정", assignee: "portfolio-data-writer", depends_on: ["점진 검증"],
    description: "QA 지적 중 src/data 담당분 수정" },
  { title: "문서 결함 수정", assignee: "doc-ingestor", depends_on: ["점진 검증"],
    description: "QA 지적 중 src/content 담당분 수정" }
])
```

3. 팀원 간 통신 규칙 — **slug가 모든 통신의 핵심이다:**

| 발신 | 수신 | 내용 |
|------|------|------|
| info-curator | data-writer, doc-ingestor | 기입 계획 경로, 라우팅 결정 |
| doc-ingestor | data-writer | 확정 slug, `docs`/`docGroups` 등록 리터럴, `wikiTargetToSlug`·`missingDocs` 추가 요청 |
| data-writer | doc-ingestor | 등록 완료 + 실제로 등록한 slug (합의와 어긋나면 즉시 신고) |
| writer·ingestor | info-curator | 계획과 실제 스키마가 어긋남 |
| portfolio-qa | writer·ingestor | 결함 목록 (담당별 분리) |
| 전원 | 리더 | 사용자 확인 필요 항목, blocker |

**리더가 반드시 개입할 지점:**
- info-curator의 `사용자 확인 필요` 가 비어 있지 않으면 → 팀을 기다리게 하고 사용자에게 묻는다. 추측으로 채운 경력·성과는 포트폴리오에서 최악의 결함이므로 여기서 멈추는 것이 맞다
- 커리어 프로젝트 vs 사이드 프로젝트 판단이 갈리면 → 리더가 결정하거나 사용자에게 묻는다
- QA 판정이 불합격인데 담당이 2회 수정에 실패하면 → 변경을 남긴 채 사용자에게 보고한다

### Phase 4: 통합 보고

1. `TaskGet` 으로 전원 완료 확인
2. `_workspace/04_*`, `_workspace/05_qa_report.md` 를 읽는다
3. QA 판정이 합격·조건부 합격인지 확인한다. **불합격 상태를 완료로 보고하지 않는다**
4. 팀 정리 (`TeamDelete`)
5. `_workspace/` 는 보존한다 (후속 부분 재실행의 입력이 된다)
6. 사용자 보고에 담을 것:
   - 어디에 무엇이 들어갔는지 (파일 + 항목)
   - 기입하지 않은 것과 그 이유
   - 사용자 확인이 남은 항목
   - QA 판정과 남은 결함
   - 커밋하지 않았다는 사실 (커밋은 사용자 승인 후)

## 데이터 흐름

```
[출처: GitHub / 옵시디언]
         ↓  Phase 2 (서브, 병렬)
  02_collector_{source}_raw.md
         ↓  Phase 3 (팀)
  info-curator → 03_curator_plan.md
         ↓
  doc-ingestor ──slug 합의──→ portfolio-data-writer
   src/content/**                  src/data/**
  04_ingestor_docs.md          04_writer_changes.md
         └──────────┬──────────────┘
                    ↓
            portfolio-qa → 05_qa_report.md
                    ↓ 결함
         담당별 수정 → 재검증
                    ↓
              [리더: 보고]
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 출처 접근 실패 (private repo, 경로 오류) | 1회 재시도 → 사용자에게 권한·경로 요청. 저장소 이름으로 내용을 추정해 채우지 않는다 |
| 수집 결과에 필수 필드 없음 | 해당 항목만 보류하고 나머지 기입 진행. 보류 항목을 사용자 확인 목록에 올린다 |
| slug 충돌 | doc-ingestor·data-writer·curator 3자 합의. 기존 slug는 바꾸지 않는다 (URL·매핑이 깨진다) |
| 팀원 1명 실패/유휴 | 리더가 SendMessage로 상태 확인 → 재시작. 재실패 시 그 범위를 보류로 남기고 나머지를 완료 |
| 팀원 간 데이터 충돌 (기간·수치) | 삭제하지 않고 출처와 함께 병기, 사용자 판단 요청 |
| QA 불합격 + 수정 2회 실패 | 변경을 되돌리지 않고 남긴 채 결함 전문을 사용자에게 보고 |
| 빌드 실패 | 담당 소유자에게 오류 전문 전달. QA·리더가 추측으로 고치지 않는다 |
| 민감정보 의심 | 기입을 멈추고 사용자에게 확인. 공개 사이트로 나가는 내용이므로 "아마 괜찮다"로 넘기지 않는다 |

## 테스트 시나리오

### 정상 흐름 — GitHub 저장소 1개로 신규 사이드 프로젝트 추가

1. 사용자: "github.com/j-hyunn/foo 읽어서 프로젝트에 추가해줘"
2. Phase 0: `_workspace/` 없음 → 초기 실행
3. Phase 2: source-collector 1명이 README·package.json·커밋 이력으로 `02_collector_foo_raw.md` 작성, 기간은 커밋 이력 기준
4. Phase 3: curator가 "문서 트리를 가지므로 `ProjectEntry`" 로 라우팅 → doc-ingestor가 `docs/` 의 PRD를 `src/content/foo/prd.md` 로 이식하고 slug `prd` 확정 → data-writer가 `projects.ts` 에 `ProjectEntry` 추가 + `project-docs.ts` 의 glob·`sourcesByProject`·`wikiTargetToSlug` 추가 → QA가 `check-integrity.mjs` 통과 확인 + `npm run build`
5. Phase 4: 변경 파일 5개, 미기입 0, QA 합격 보고
6. 예상 결과: `/projects/foo` 와 `/projects/foo/prd` 가 정상 렌더

### 에러 흐름 — 메뉴 등록은 됐지만 문서가 없는 상태

1. Phase 3에서 data-writer가 `docs` 에 `queue-policy` 를 등록했는데, doc-ingestor가 원본 파일 읽기 실패로 이식을 못 함
2. QA의 `check-integrity.mjs` 가 blocker로 검출 — 빌드는 통과하므로 이 검사만이 유일한 방어선
3. QA가 doc-ingestor에게 결함 전달 → 원본 경로 재확인 → 재이식
4. 원본이 끝까지 없으면: data-writer가 `docs` 에서 해당 항목을 **제거**하고, 리더가 "queue-policy 문서는 원본 부재로 미기입" 을 보고에 명시
5. 메뉴에 남긴 채 완료 보고하는 것은 금지 — 사용자가 누르면 빈 페이지가 뜬다
