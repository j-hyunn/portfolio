---
name: verify-portfolio
description: "포트폴리오 데이터·문서의 경계면 정합성을 교차 검증하는 QA 절차. 커리어·프로젝트·문서를 기입하거나 수정한 뒤 '검증해줘', '잘 들어갔는지 확인해줘', '빌드 되는지 봐줘', '링크 깨진 데 없나' 요청 시, 또는 데이터 기입 작업을 마무리할 때 반드시 이 스킬을 사용할 것. docs slug ↔ 문서 파일, glob 등록, 위키링크 매핑, 커리어 날짜, 민감정보, 빌드까지 검사하는 자동 스크립트와 수동 체크리스트를 담는다."
---

# Verify Portfolio

> **이 스킬은 팀 작업의 구성 요소다.** 사용자 요청에서 직접 트리거됐고 작업이 단일 파일 수정보다 크면(수집·해석·기입·검증이 함께 필요하면) `portfolio-info-orchestrator` 를 먼저 검토하라. 혼자 기입하면 경계면 검증과 소유권 분리가 빠진다.


기입 결과를 검증하는 절차. 핵심은 **경계면 교차 비교**다.

## 왜 빌드 통과가 합격이 아닌가

이 저장소의 결함은 타입이 아니라 **데이터의 짝**에서 난다. 메뉴에 slug를 적었지만 문서 파일이 없고, 문서 파일은 있지만 메뉴에 없고, 위키링크 대상이 매핑 테이블에 없어 링크가 평문으로 죽고, 새 프로젝트 폴더가 `import.meta.glob` 에 등록되지 않아 본문이 전부 빈다. 네 가지 모두 `tsc` 와 `npm run build` 를 **정상 통과한다.** 그래서 교차 비교가 유일한 방어선이다.

## 1단계: 자동 검사

```bash
node .claude/skills/verify-portfolio/scripts/check-integrity.mjs
```

저장소 루트에서 실행한다. 검사하는 경계면:

1. `projects.ts` 의 docs slug → `src/content/{project}/{slug}.md` 또는 `ProjectDetail.tsx` 의 `customDocs` 항목 존재
2. 역방향 — `src/content` 의 모든 `.md` 가 메뉴에 등록됨 (미등록 문서는 URL로만 닿는 유령 문서)
3. `src/content` 프로젝트 폴더 ↔ `project-docs.ts` 의 `import.meta.glob` + `sourcesByProject`
4. 문서의 `[[위키링크]]` ↔ `wikiTargetToSlug` / `missingDocs`
5. `wikiTargetToSlug` 의 값 ↔ 실존 문서 slug (죽은 매핑)
6. `customDocs` ↔ 메뉴 등록 (양방향)

종료 코드 0이면 결함 없음, 1이면 결함 있음, 2면 **스크립트 자체 실패**다. 2는 코드 결함이 아니므로 결함으로 보고하지 말고 수동 검증으로 대체한다.

스크립트는 `projects.ts` 를 esbuild로 트랜스파일해 실제 값을 읽고, `project-docs.ts`·`ProjectDetail.tsx` 는 정규식으로 거칠게 파싱한다. 이 두 파일의 구조가 크게 바뀌면 스크립트를 함께 손봐야 한다.

## 2단계: 수동 교차 검증 (스크립트가 못 잡는 것)

| # | 경계면 | 확인 방법 |
|---|--------|----------|
| 1 | 커리어 날짜 정합 | `career.ts` 의 `startDate`/`endDate` 와 `period`/`duration` 이 서로 맞는가. 배열이 최신순인가. 재직 중 항목이 `endDate: null` 인가 |
| 2 | career ↔ 회사별 프로젝트 파일 | `career.ts` 의 `projects:` 참조가 실제 export와 연결됐는가 |
| 3 | 라우팅 ↔ 프로젝트 slug | `App.tsx` 라우트가 새 slug를 커버하는가 (`/projects/:slug/:docSlug`) |
| 4 | 자산 참조 | 문서·컴포넌트가 가리키는 `src/assets/` 파일이 실제로 있는가 |
| 5 | 민감정보 잔존 | 아래 명령으로 훑고, 걸린 줄을 직접 읽어 판단한다 |
| 6 | 문체 일관성 | 새 항목이 이웃 항목과 어조·시제·수치 표기가 맞는가 |

```bash
grep -rniE "sk-[a-z0-9]{10,}|ghp_|xox[baprs]-|Bearer [A-Za-z0-9._-]{15,}|BEGIN [A-Z ]*PRIVATE KEY" src/content src/data
grep -rnE "https?://[a-z0-9.-]*\.(internal|local|corp)|010-?[0-9]{4}-?[0-9]{4}" src/content
```

민감정보는 자동 판정이 불가능하다. 걸린 줄은 사람이 읽고, 의심스러우면 사용자에게 확인한다 — 공개 사이트로 나가는 내용이므로 "아마 괜찮다"로 넘기지 않는다.

## 3단계: 빌드

```bash
npx tsc --noEmit
npm run build
```

둘 다 통과해야 하지만, 통과만으로 합격 보고를 하지 않는다. 1~2단계 결과를 함께 제시한다.

## 지적 작성 규칙

지적은 받는 사람이 **그 자리에서 고칠 수 있어야** 한다.

| 쓰지 말 것 | 쓸 것 |
|-----------|------|
| "문서 연결 확인 필요" | "`projects.ts:48` 의 `docs` 에 `queue-policy` 가 있으나 `src/content/playball/queue-policy.md` 없음 → 담당: doc-ingestor" |
| "날짜가 이상함" | "`career.ts:62` `startDate: '2024-03'` 인데 `period: '2024.05 - '` → 둘 중 어느 쪽이 맞는지 확인 필요" |

각 지적에 심각도와 담당(portfolio-data-writer / doc-ingestor)을 붙인다. 담당 없는 지적은 아무도 고치지 않는다.

## 판정 기준

- **합격**: 자동 검사 0건, 수동 체크리스트 통과, 빌드 통과
- **조건부 합격**: minor 결함만 남음. 결함을 명시하고 진행 가능
- **불합격**: blocker/major 1건 이상, 또는 빌드 실패

불합격 상태를 "완료"로 보고하지 않는다. 미검증 범위도 반드시 리포트에 남긴다 — 빈 미검증 목록은 "전부 검증"이 아니라 "검증 범위를 적지 않음"인 경우가 많다.
