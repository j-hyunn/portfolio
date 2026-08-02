**문서 유형:** PM 프롬프트 설계 문서
**버전:** v4.0 | 작성일: 2026-07-30
**이전 버전:** Agents Prompt v3.5 (2026-05-20)
**참고:** 코드베이스 `main` = b330303 (2026-07-30)의 `src/lib/prompts/` 직접 반영

---

## 관련 문서
- [[Micro Projects/Replai/PRD]] — 기능 명세 및 힌트·리포트·페르소나 UX 요구사항
- [[TRD]] — 에이전트 실행 패턴·API Route·DB 스키마
- [[Multi Agent Architecture]] — 에이전트 간 데이터 흐름 및 실행 순서
- [[Micro Projects/Replai/Decisions]] — 프롬프트 설계 의사결정 기록

---

## 변경 이력

|버전|날짜|주요 변경 내용|
|---|---|---|
|v1.0|2026-03-27|최초 작성|
|v2.0|2026-03-31|코드베이스 반영: 모델 변경, 페르소나 확정, explorer depth 2 상한, 힌트 실시간 생성, 건너뛰기 추가|
|v3.0|2026-04-01|분석 에이전트 personaContext 교체(startup·enterprise 제거). 평가 출력 `model_answer`(string) → `model_answers`(배열)|
|v3.1|2026-04-04|기술 검증형(technical) 페르소나 추가|
|v3.2|2026-05-17|`buildNormalizePrompt()`를 면접 흐름 밖 보조 프롬프트로 정리. 분석/면접관/평가 입력에 normalize 가드 통과 보장 명시|
|v3.5|2026-05-20|평가 프롬프트를 단건/요약/스킵 3종으로 분리, 점수 앵커 명문화, QaGroup을 kind 컬럼 기반으로 전환, 힌트 상한 40→30점|
|**v4.0**|**2026-07-30**|**이력서 생성 프롬프트 4종 신설(§5). 평가 프롬프트 실제 함수명·출력 구조로 정정(`buildQuestionEvaluationPrompt`). v3.5 기재 오류 정정 — Zod·structured output·8s AbortController·"힌트 중립 안내 문구"는 실제로 존재하지 않음**|

---

## 개요

Replai의 면접·이력서 품질은 프롬프트로 결정된다. **5개의 프롬프트 파일**로 구성되며 각각 독립된 역할을 가진다.

|파일|에이전트|역할|실행 방식|
|---|---|---|---|
|`analysis.ts`|분석|JD + 이력서 → 질문 세트 생성|`runOneShot` (BYOK 키)|
|`interview.ts`|면접관|페르소나 대화 + 꼬리질문 + 힌트|ADK `LlmAgent` + `Runner` (**서버 키 고정**)|
|`evaluation.ts`|평가|질문별 단건 평가 + 종합 요약|`runOneShot` × N + 1 (BYOK 키)|
|`normalize.ts`|보조 (면접 흐름 밖)|PDF raw 텍스트 정제|Gemini REST 직접 (서버 키 고정)|
|`resume-generate.ts`|보조 (v4.0)|JD 맞춤 이력서 4단계 생성|Gemini REST 직접 (BYOK 키)|

**면접 흐름 모델:** `gemini-2.5-flash` 기본 / BYOK 등록 시 `gemini-2.5-pro`·`gemini-3.1-pro-preview`
**Normalize 전용 모델:** `gemini-2.5-flash-lite` (`NORMALIZE_MODEL`, 서버 키 고정)

> **주의 — 면접관 에이전트는 BYOK 미적용.** `runners.ts`의 `interviewAgent`가 모듈 레벨 싱글턴이며 서버 키로 고정 생성된다. 상위 모델은 분석·힌트·평가·이력서 생성에만 적용된다.

## 설계 원칙

|원칙|내용|
|---|---|
|JSON 출력 통일|면접 흐름 에이전트 출력은 JSON, 마크다운 코드 블록 없이 순수 JSON만|
|예외 2종|`normalize.ts`는 순수 마크다운, `buildHintPrompt()`는 순수 텍스트|
|한국어 발화|모든 질문·피드백·리포트는 한국어|
|서류 합격자 전제|필수 요건 갭 질문 생성 금지, 우대사항 갭만 허용|
|JD 선택 입력|JD 없이도 면접 가능 — 없으면 지원동기 질문 생성 안 함|
|모범 답변 개인화|이력서에 실제 기재된 내용만 근거, 없는 내용 생성 금지|
|userProfile 활용|난이도·깊이 조정에만 사용, 답변 내용에 직접 포함 금지|
|AI 꼬리질문 판단|룰 기반 필터 없음, AI가 전체 맥락 보고 판단|
|입력 텍스트 신뢰|분석/면접관/평가 프롬프트는 입력 `resumeTexts`가 normalize 가드를 통과한 텍스트라고 가정한다|

---

## 1. 분석 프롬프트

**파일:** `src/lib/prompts/analysis.ts` — `buildAnalysisPrompt()`

### 역할

JD와 이력서를 분석해 면접 질문 세트를 생성한다. 면접관 에이전트가 사용할 질문 목록과 힌트 생성용 메타데이터를 만든다.

### 입력 파라미터

|파라미터|타입|필수|설명|
|---|---|---|---|
|`jdText`|string|선택|빈 문자열이면 JD 없는 면접으로 처리|
|`resumeTexts`|string[]|필수|레이블이 붙은 문서 텍스트 배열. **v4.0: 제출용 이력서 > 마스터 이력서 > 업로드 문서 우선순위로 조립됨**|
|`persona`|string|필수|`explorer` \| `pressure` \| `technical`|
|`durationMinutes`|number|필수|면접 시간 (분)|
|`userProfile`|object|선택|직군, 경력, 기술스택, 보유스킬|

### resumeTexts 조립 규칙 — v4.0

```
[제출용 이력서 - {회사명} {포지션}]   ← 세션에 submitted_resume_id가 있을 때
[마스터 이력서]                        ← 경력 또는 프로젝트가 1개 이상일 때
[이력서: {파일명}]                     ← normalized_text ?? parsed_text
[포트폴리오: {파일명}]
```

앞에 놓인 것이 가장 높은 우선순위다. 제출용 이력서를 선택하고 면접을 시작하면 분석 에이전트는 **그 회사에 실제로 낸 이력서**를 최우선 근거로 질문을 만든다.

### userProfile 구조

```typescript
interface UserProfileContext {
  name: string | null;
  jobCategory: string | null;
  yearsOfExperience: number | null;
  techStack: string[];
  skills: string[];
}
```

난이도·깊이 조정 컨텍스트로만 사용한다. 답변 내용이나 모범 답안에 직접 언급하지 않는다.

### 페르소나 컨텍스트 매핑

```typescript
const personaContext = {
  explorer:  "경험 탐색형 — 열린 질문 선호, 꼬리질문 최대 2회, 대화적 흐름 유지",
  pressure:  "심층 압박형 — 모호하거나 수치 없는 답변에 반드시 꼬리질문, 최대 4회",
  technical: "기술 검증형 — 설계 근거·CS 원리·성능 트레이드오프 검증, why/how 중심, 최대 4회",
}[persona] ?? "";
```

### 질문 수 계산

```
목표 질문 수 = Math.round(durationMinutes / 5 × 1.5)
예: 60분 → 18개
```

### JD 유무에 따른 분기

|상황|고정 질문 순서|
|---|---|
|JD 있음|q1 자기소개 → q2 지원동기 → q3 이직 사유 → 이후 자유|
|JD 없음|q1 자기소개 → q2 이직 사유 → 이후 자유. **지원동기 질문 절대 금지**|

### 처리 단계

```
Step 1  JD 핵심 키워드 추출 (필수 요건 / 우대사항 분리)
Step 2  이력서 분석 (경력, 프로젝트, 수치 성과, 기술스택)
Step 3  JD ↔ 이력서 매핑
        ├─ strengths: 이력서가 JD를 강하게 커버하는 부분
        └─ preferred_gaps: 우대 요건 중 확인 안 되는 부분
           (필수 요건 갭 → 질문 생성 금지)
Step 4  질문 세트 생성 (common / project / preferred_gap)
```

### 출력 구조

```typescript
interface AnalysisOutput {
  analysis: {
    jd_keywords: string[];
    strengths: string[];
    preferred_gaps: string[];
  };
  questions: Array<{
    id: string;               // "q1", "q2", ...
    question: string;
    type: "common" | "project" | "preferred_gap";
    intent: string;           // 이 질문으로 확인하려는 역량
    good_answer_tips: string; // 힌트 생성 기반 데이터
    depth: number;            // 항상 0으로 생성
    source: string;
  }>;
}
```

### 주요 설계 결정

|결정|이유|
|---|---|
|JD 없는 면접 지원|포트폴리오만 있거나 직군 기반 연습 용도 대응|
|필수 요건 갭 질문 금지|서류 합격자 기본 요건 재검증은 목적에 맞지 않음|
|q1~q3 자리 고정|라포 형성 → 동기 확인 → 경험 탐색 순서|
|`good_answer_tips` 필드|힌트 생성 시 가이드로만 사용 (면접관에게는 미노출)|

---

## 2. 면접관 프롬프트

**파일:** `src/lib/prompts/interview.ts` **ADK 구조:** `src/lib/agents/runners.ts`

### 프롬프트 빌더 목록

|함수|호출 시점|역할|
|---|---|---|
|`buildInterviewSystemPrompt()`|매 턴 시스템 프롬프트|페르소나·컨텍스트·진행 규칙|
|`buildFirstQuestionPrompt()`|면접 시작|인사말 + 첫 질문|
|`buildRespondPrompt()`|유저 답변 수신 후|꼬리질문 여부 판단 + 다음 발화|
|`buildSkipPrompt()`|질문 건너뛰기|건너뜀 처리 + 다음 질문|
|`buildHintPrompt()`|힌트 요청|이력서 기반 모범 답안 실시간 생성|

### 2-1. 시스템 프롬프트 — `buildInterviewSystemPrompt()`

**입력:** `persona` / `jdText` / `resumeTexts` / `analysisJson` / `remainingSeconds` / `totalSeconds` / `userProfile` / `customInstructions`

**구성 순서:**

```
① PERSONA_INSTRUCTIONS[persona]   ← 페르소나 고유 말투·판단 기준
② 사용자 추가 지침 (있을 때만)     ← customInstructions
③ 면접 컨텍스트 (JD, 이력서, 분석 결과, 지원자 프로필)
④ 면접 진행 규칙 (질문 순서, depth, 남은 시간, 출력 형식)
```

> **주의:** ③에서 `analysisJson`을 직렬화할 때 각 질문의 `good_answer_tips`는 제외된다. 면접관이 "좋은 답변"을 미리 알면 꼬리질문·판단이 편향되기 때문이다. `buildHintPrompt()`에는 별도 파라미터로 전달된다.

**`InstructionProvider` 동작:** ADK의 `ctx.state.toRecord()`로 세션 state를 읽어 매 턴 프롬프트를 재구성한다. State는 클래스 인스턴스이므로 직접 프로퍼티 접근이 불가능하다.

### 2-2. 페르소나 — `PERSONA_INSTRUCTIONS`

#### explorer — 경험 탐색형

|항목|내용|
|---|---|
|말투|"~해보셨나요?", "어떤 경험이 있으셨어요?" 열린 질문 어조|
|전환 표현|"아, 그렇군요. 그럼 혹시~" 부드러운 연결|
|**depth 상한**|**최대 2** — 초과 시 반드시 다음 주제로 전환|
|꼬리질문 기준|답변이 너무 짧거나 맥락이 부족할 때만 1회 가볍게|
|목표 분위기|"편하게 내 이야기를 풀어냈다"|

#### pressure — 심층 압박형

|항목|내용|
|---|---|
|말투|"구체적으로 어떤 역할을 하셨나요?", "그 결과는 어떻게 측정했나요?"|
|허점 지적|"말씀하신 부분에서 ~가 불명확한데요." 직접적|
|**depth 상한**|**최대 4**|
|꼬리질문 기준|모호·추상적 답변, 수치·사례 없는 답변, 흥미로운 키워드|
|목표 분위기|"실력이 제대로 시험된 느낌" — 날카롭되 공격적이지 않게|

#### technical — 기술 검증형

|항목|내용|
|---|---|
|말투|"왜 그 방식을 선택하셨나요?", "다른 대안은 어떤 게 있었나요?"|
|집중 영역|설계 결정 근거, CS 기초 원리, 성능 트레이드오프|
|**depth 상한**|**최대 4**|
|꼬리질문 기준|why/how 없이 결과만 언급, 기술적 근거 부족, 트레이드오프 미언급|
|목표 분위기|"기술적 사고방식이 검증된 느낌" — 집요하되 교조적이지 않게|

### 2-3. 커스텀 지침 주입

```
[페르소나 기본 지침]

## 사용자 추가 지침
{customInstructions}

## 면접 컨텍스트
```

커스텀 지침이 없으면 이 섹션 자체가 삽입되지 않는다.

### 2-4. 시간 관리

|조건|동작|
|---|---|
|`remainingSeconds >= totalSeconds × 0.2`|정상 진행|
|`remainingSeconds < totalSeconds × 0.2`|시스템 프롬프트에 경고 삽입 → `type: "closing"` 전환 지시|

### 2-5. 힌트 프롬프트 — `buildHintPrompt()`

사전 생성 텍스트가 아니라 **AI가 실시간으로 이력서를 참조해 모범 답안을 생성**한다.

**입력:**

|파라미터|설명|
|---|---|
|`currentQuestion`|현재 질문 텍스트 (마지막 인터뷰어 메시지)|
|`questionIntent`|analysis의 `intent`|
|`goodAnswerTips`|analysis의 `good_answer_tips`|
|`resumeTexts`|§1의 우선순위로 조립된 배열|
|`recentMessages`|최근 6개 메시지 (논의 중인 주제 파악용)|
|`userProfile`|난이도 조정용|

**핵심 제약:**

- 이력서에 실제로 기재된 내용만 근거로 사용
- 없는 상황·수치·프로젝트·경험 생성 금지
- 직전 대화에서 이미 언급한 프로젝트는 가급적 제외 (관련 경험이 하나뿐이면 재사용 허용)
- STAR 기법을 문서 범위 안에서 활용
- 200~400자 내외, 답변 텍스트만 반환

**출력:** 순수 텍스트 (JSON 아님)

**제출 흐름 (실제 동작):**

```
힌트 텍스트를 화면에 표시
  └─ sendMessage(hint, "hint_shown")
       └─ 힌트 텍스트가 그대로 userMessage로 전송
       └─ DB에 content = 힌트 텍스트, kind = 'hint_shown' 저장
       └─ buildRespondPrompt(힌트 텍스트) — 면접관에게 원문 그대로 전달
```

> **v3.5 문서 정정:** "면접관 에이전트에는 모범 답안 텍스트 대신 '사용자가 모범 답안을 참조했습니다'라는 중립 안내 문구만 전달된다"고 기술했으나 **그런 분기는 코드에 없다.** 면접관은 힌트 원문을 사용자의 실제 답변으로 인식한다. 힌트 사용 사실은 `kind` 컬럼에만 남고, 평가 단계에서 점수 캡으로만 반영된다.

### 2-6. 건너뛰기 — `buildSkipPrompt()`

"알겠습니다"라고 짧게 응답 후 다음 질문으로 이동. `type: "question"`으로 설정.

건너뛴 질문은 `content: ""`, `kind: 'skipped'`로 저장된다. 콜드 스타트 재생 시에는 `"(질문을 건너뛰었습니다)"`로 치환해 ADK 세션에 넣는다.

### 2-7. 출력 구조

```typescript
interface InterviewAgentOutput {
  message: string;
  type: "question" | "followup" | "closing";
  current_depth: number;
  next_question_id: string | null;
  is_last: boolean;
}
```

---

## 3. 평가 프롬프트

> 📌 모범 답안 문서 기반 생성 원칙, `good_answer_tips` 분리 결정은 [[Micro Projects/Replai/Decisions]] #15·#16 참고.

**파일:** `src/lib/prompts/evaluation.ts`
**후처리 라이브러리:** `src/lib/evaluation/` — `parse.ts` / `postprocess.ts` / `concurrency.ts`

> **v3.5 문서 정정:** `schema.ts`·`run.ts`는 존재하지 않는다. Zod도, Gemini structured output(`responseSchema`)도 사용하지 않는다. 검증은 `parse.ts`의 수동 타입 가드가 담당한다.

### 프롬프트 3종

|프롬프트|함수|용도|
|---|---|---|
|단건 평가|`buildQuestionEvaluationPrompt({ qaGroup, resumeTexts, jdKeywords })`|질문 그룹 1개 평가|
|스킵 모범답안|`buildSkippedModelAnswerPrompt({ qaGroup, resumeTexts })`|건너뛴 질문의 학습용 모범 답안만 생성|
|종합 요약|`buildSummaryEvaluationPrompt({ questionResults, analysisJson, resumeTexts, totalScore, hintCount, skippedCount, failedCount })`|전체 결과 종합 1회|

### 입력 구조 — QaGroup

```typescript
interface QaTurn {
  speaker: "interviewer" | "user";
  content: string;
}

interface QaGroup {
  question_id: string;
  question: string;
  intent: string;
  good_answer_tips: string;
  turns: QaTurn[];      // 본 질문 + 꼬리질문 + 답변 전체
  used_hint: boolean;   // kind === 'hint_shown'
  skipped: boolean;     // kind === 'skipped'
}
```

`used_hint`·`skipped`는 텍스트 파싱이 아니라 `interview_messages.kind` 컬럼에서 직접 결정된다.

### job_fit 라벨 분기

JD 키워드 유무에 따라 세 번째 축의 정의가 달라진다.

|상황|라벨|
|---|---|
|`jdKeywords.length > 0`|`job_fit (직무 적합성)`: JD 핵심 키워드와의 부합도|
|JD 없음|`job_fit (직군 일반 역량 부합도)`: 해당 직군에서 일반적으로 요구되는 역량과의 부합도|

### 점수 앵커 (5단계)

|점수 구간|기준|
|---|---|
|90~100|수치 + 구체적 사례 + 트레이드오프까지 언급. 질문 의도 완전 충족|
|70~89|구체적이나 수치 또는 트레이드오프 중 하나 부족. 의도 대부분 충족|
|50~69|내용은 있으나 일반론 수준이거나 본인 역할이 불명확. 의도 부분 충족|
|30~49|모호하거나 질문 의도와 관련성 낮음. 표면적 언급만|
|0~29|건너뜀, 무관한 답변, 응답 없음|

### 모범 답안 생성 지침 (공통 상수 `MODEL_ANSWER_RULES`)

단건 평가와 스킵 모범답안 프롬프트가 같은 규칙을 공유한다.

- `used_hint` 여부와 무관하게 **모든 질문에서 반드시 생성**
- 제출 문서를 먼저 스캔해 프로젝트명·역할·성과 수치를 파악
- 문서에 등장하는 프로젝트명·역할·수치를 구체적으로 포함. 추상적·일반적 답변 금지
- 문서에 없는 상황·수치·프로젝트·경험은 절대 생성·추측 금지
- 1인칭 한국어, STAR 기법을 문서 범위 안에서 활용
- 본 질문과 꼬리질문의 모범 답안이 같은 프로젝트를 반복하지 않도록 가능한 경우 다른 경험 활용

### 실행 방식

```
Stage 1 — mapWithConcurrency(qaGroups, EVAL_CONCURRENCY=4, evaluateOneGroup)
  ├─ skipped → buildSkippedModelAnswerPrompt() → runOneShot()
  │             → parseSkippedModelAnswer() → buildSkippedAnswer()
  │             (모범 답안 호출이 실패해도 레코드는 생성)
  └─ 그 외   → buildQuestionEvaluationPrompt() → runOneShot() → 최대 3회 재시도
                ├─ 성공 → parseQuestionEvaluation()  ← 수동 타입 가드
                │          → used_hint ? applyHintCap() : applyAnsweredOverrides()
                └─ 3회 실패 또는 예산 소진 → buildFailedAnswer()

computeTotalScore()   ← skipped·failed 제외 평균, 서버 산술

Stage 2 — buildSummaryEvaluationPrompt() → 최대 3회 재시도 → parseSummaryEvaluation()
          3회 실패 시 500 (리포트 미생성)
```

**타임아웃:** 호출별 `ONESHOT_TIMEOUT_MS = 45_000`, 전체 예산 `EVAL_BUDGET_MS = 240_000`. 호출별 상한은 `Math.min(45s, 남은 예산)`이라 재시도가 예산을 넘지 못한다.

> **v3.5 문서 정정:** "8s AbortController 타임아웃", "`p-limit(4)`"는 사실이 아니다. 자체 `mapWithConcurrency`와 `withDeadline`을 쓴다.

### 점수 처리 규칙

|상황|점수 처리|feedback|
|---|---|---|
|`used_hint: true`|모든 항목 **최대 30점** (`HINT_SCORE_CAP`, 서버 강제)|"모범 답안을 참조한 답변입니다" 명시|
|`skipped: true`|모든 항목 **0점**, total_score 제외|건너뜀 안내 + 학습용 모범 답안|
|평가 3회 실패|`status: 'failed'`, 0점, total_score 제외|— (리포트 UI에 표시되지 않음, 아래 주의)|

### 출력 구조

**단건 평가:**

```typescript
interface QuestionEvaluationResult {
  question_id: string;
  question: string;
  answer: string;           // 지원자 답변 요약
  scores: { logic: number; specificity: number; job_fit: number };
  average: number;          // 서버에서 재계산 (LLM 값 무시)
  intent: string[];         // 질문 의도 키워드 2~4개
  feedback: string;         // 자연스러운 한 문단
  model_answers: Array<{ question: string; model_answer: string }>;
}
```

**종합 요약:**

```typescript
interface SummaryEvaluationResult {
  total_score: number;
  summary: string;
  strengths: string;
  strength_keywords: string[];      // 2~4개 명사형 키워드
  improvements: string;
  improvement_keywords: string[];   // 2~4개 명사형 키워드
}
```

**후처리 최종:**

```typescript
type AnswerStatus = "answered" | "hint_shown" | "skipped" | "failed";
interface AnswerFinal extends QuestionEvaluationResult {
  status: AnswerStatus;   // 서버에서 결정
}
```

> **주의 — `status`는 화면에 표시되지 않는다.** 서버는 `status`를 계산해 `report_json`에 저장하지만, 클라이언트 타입 `AnswerReport`에 해당 필드가 없고 `ReportView`도 읽지 않는다. 힌트 사용·건너뜀·평가 실패 답변이 정상 답변과 구분되지 않으며, 단건 재평가 엔드포인트도 없다.

---

## 4. Normalize 프롬프트

> 📎 백그라운드화 결정과 모델 분리 이유는 [[Micro Projects/Replai/Decisions]] #24~26 참고.

**파일:** `src/lib/prompts/normalize.ts` — `buildNormalizePrompt()`

PDF 추출 raw 텍스트의 줄바꿈 노이즈와 레이아웃 파괴를 정리해 깨끗한 마크다운으로 재구성한다.

### 호출 위치

|경로|함수|동기/비동기|
|---|---|---|
|업로드 직후|`processUploadedDocumentAction` → `after(() => runNormalize)`|비동기|
|카드 재시도|`retryNormalizeAction(documentId)`|동기|
|인터뷰 시작 가드|`ensureNormalizedAction(documentIds[])`|동기 (순차)|

### 입력 / 모델 / Timeout

|항목|값|
|---|---|
|`rawText`|unpdf 추출 raw 텍스트|
|`docType`|`'resume' \| 'portfolio' \| 'git'` (git은 기능 제거로 미사용)|
|모델|`gemini-2.5-flash-lite` (서버 키 고정)|
|Background timeout|**55s** (`BACKGROUND_NORMALIZE_TIMEOUT_MS`)|
|Sync timeout|**55s** (`SYNC_NORMALIZE_TIMEOUT_MS`)|

### 프롬프트 지시사항

```
1. 원문의 내용을 절대 추가하거나 삭제하지 마세요. 정제만 허용됩니다.
2. 섹션 제목(경력, 프로젝트, 스킬, 학력 등)을 ## 헤딩으로 구분하세요.
3. 깨진 줄바꿈을 복원해 문장이 자연스럽게 이어지도록 하세요.
4. 헤더/푸터/페이지 번호 등 반복 노이즈는 제거하세요.
5. 테이블 형태 데이터는 목록(- key: value)으로 변환하세요.
6. 결과물은 순수 마크다운 텍스트만 반환하세요.
```

### 상태 전이

```
pending --(성공)--> done
       \--(timeout/error)--> failed --(retry/ensure)--> pending → done|failed
```

### 운영 노트

**Empty text 입력:** `rawText`가 빈 문자열이면 normalize 호출 자체가 없다. 업로드 단계에서 명시적으로 거부 + Storage cleanup.

**lockfile sync 함정:** `unpdf`가 `package-lock.json`과 어긋나면 dev 환경에서 `Cannot find module` → 모든 PDF가 0자 추출 → 모든 업로드가 empty text 거부로 실패. Vercel 빌드는 영향 없어 prod와 dev 동작이 달라진다. `npm install` + lockfile 커밋으로 해결.

---

## 5. 이력서 생성 프롬프트 — v4.0 신규

**파일:** `src/lib/prompts/resume-generate.ts`
**호출:** `POST /api/resume/generate` — Gemini REST 직접 호출, 단계마다 최대 3회 재시도 (`1000ms × attempt` 백오프)

마스터 이력서와 JD를 입력받아 제출용 이력서를 만든다. **4단계 순차 파이프라인**이며 각 단계 출력이 다음 단계 입력이 된다.

### 왜 4단계로 나눴는가

한 번에 시키면 "선별"과 "문체 변환"이 섞여 선별 기준이 무너진다. 1단계에서 전략을 고정하고, 2단계는 id 선별만, 3단계는 문장 변환만 담당해 각 단계의 판단 기준을 독립시켰다.

### 5-1. 1단계 — JD 분석 · 전략 수립

**함수:** `buildJdAnalysisPrompt(companyName, position, jdText)`
**역할:** IT 채용 전문 컨설턴트 관점으로 JD를 해석해 이력서 최적화 전략을 세운다.

|분석 항목|기준|
|---|---|
|포지션 페르소나|`manager`(전략/리더십/조율 중심) 또는 `executor`(기술/실행/구현 중심)|
|3대 핵심 역량(기둥)|JD가 가장 강조하는 역량 3가지. **기술 스택 나열 금지**, 역량 단위로 추상화|
|AI 스크리닝 키워드|ATS 통과용 필수 키워드 5개|
|기업 컨텍스트|규모(스타트업/대기업), 국내/외국계, 문화적 특성 한 문장|

```typescript
interface JdAnalysis {
  persona: 'manager' | 'executor';
  core_pillars: [string, string, string];
  keywords: string[];
  company_context: string;
}
```

### 5-2. 2단계 — 마스터 이력서 필터링

**함수:** `buildFilterPrompt(masterResume, jdAnalysis)`
**역할:** 마스터 이력서에서 JD에 맞는 항목만 **id로** 선별한다. 이 단계는 문장을 고치지 않는다.

**입력 압축:** 경력은 `description` 앞 200자, 프로젝트는 `achievement` 앞 200자만 전달해 토큰을 절약한다.

**선별 기준:**

```
1. JD 핵심 역량 기둥과 무관한 경력/프로젝트 제거
2. 성과(achievement)가 비어 있거나 단순 업무 나열인 프로젝트 제거
3. 비즈니스 임팩트(매출·사용자 수·성능 개선 등 수치 성과) 있는 항목 우선
4. 최종 1.5~2페이지 분량(약 6~10개 항목)으로 압축
```

```typescript
interface FilteredContent {
  selected_experiences: string[];   // 경력 id
  selected_projects: string[];      // 프로젝트 id
  priority_order: string[];         // 경력+프로젝트 통합 우선순위
  removed_reasons: Record<string, string>;
}
```

### 5-3. 3단계 — 개조식 재작성

**함수:** `buildRewritePrompt(masterResume, filteredContent, jdAnalysis, companyName, position)`
**역할:** 선별된 항목의 텍스트 필드를 제출용 문장으로 변환한다. 서버가 `priority_order` 기준으로 정렬한 뒤 원문을 전달한다.

**핵심 규칙:**

|규칙|내용|
|---|---|
|**개조식 필수**|`description`/`decisions`/`achievement`는 마크다운 불릿 리스트. 줄글 금지|
|**종결 형태**|명사형·동사 어간 종결 ("…전환율 8% 개선"). `~했습니다`·`~주도했습니다` 등 **서술형 종결어미 금지**|
|불릿 분량|한 불릿 = 한 가지 성과/활동, 항목당 2~4개 권장|
|**수치 필수**|`achievement` 불릿에 수치(%, 배수, 건수, 금액) 포함. 원본에 없으면 합리적 추정치 + `(추정)` 표시|
|contribution|백분율·역할 비중으로 구체화 (예: "백엔드 개발 80%, 인프라 20%")|
|JD 키워드|1단계의 필수 키워드를 불릿에 자연스럽게 배치|
|**원본 유지 필드**|`id`, `company`, `position`, `start_date`, `end_date`, `is_current`, `leave_reason`, `name`, `tech_stack`, `school`, `degree`, `major`, `status`, `entry_type`, `title`, `issuer`, `date`|
|basics / skills / educations / activities|원본 그대로 유지|
|`summary`|**유일하게 서술형 허용.** 3~4문장. 주어는 지원자의 직무 정체성|

**주체 혼동 방지 장치:** 프롬프트 상단에 경고 블록이 있다. LLM이 자기 역할명("이력서 작성 전문가")을 `summary`에 넣거나 회사 소개문을 베끼는 회귀가 있었기 때문이다.

```
- 이력서의 주인공은 해당 포지션에 지원하는 사람이며, 신원은 마스터 이력서에서만 가져온다
- 작성 도구의 역할명을 이력서 본문(특히 summary)에 넣지 말 것
- summary는 반드시 지원자를 해당 직군의 전문가로 서술
- 회사 소개("○○는 ~기업입니다")나 JD 복붙 금지
```

**출력:** `RewrittenContent = SubmittedResumeContent` — 마스터 이력서와 같은 구조 + `summary`

### 5-4. 4단계 — 분석 생성

**함수:** `buildFinalResumePrompt(rewrittenContent, jdAnalysis, companyName, position)`
**역할:** 3단계 결과를 분석해 키워드 매핑·강조 포인트·부족 항목을 도출한다. 이력서 본문은 다시 만들지 않고 그대로 되돌려받는다.

**출력 형식 — 구분자 2개:**

```
---RESUME_JSON---
{ …3단계 결과 그대로… }
---ANALYSIS---
{
  "keyword_mapping": [{ "keyword": "…", "found_in": "…" }],
  "highlights":      [{ "item": "…", "reason": "…" }],
  "missing_items":   [{ "item": "…", "recommendation": "…" }]
}
```

**`found_in` 표기 규칙:** 배열 인덱스나 필드 경로(`experiences[0].description`) 금지. 회사명·프로젝트명·섹션명으로 사람이 읽을 수 있게 서술한다 (예: "Paprika Data Lab 경력", "핵심 역량 요약").

**서버 파싱 규칙:**

|블록|파싱 실패 시|
|---|---|
|`RESUME_JSON`|3단계 결과(`RewrittenContent`)를 그대로 canonical로 사용|
|`ANALYSIS`|빈 분석으로 저장 (hard failure 아님)|

### 5-5. 알려진 함정 — summary 위치

생성기가 `content_json`을 LLM 출력 그대로 저장하므로 스키마가 강제되지 않는다. 실제 데이터에서 최상위 `summary` 대신 `basics.summary`에 들어가는 경우가 관측됐다. 뷰어와 직렬화 모두 **최상위 → basics 순 폴백**으로 읽고, basics에서 끌어올린 경우 본문의 '소개' 항목을 생략해 같은 문단이 두 번 들어가지 않게 한다. `SubmittedResumeContent.summary`는 이 때문에 optional이다.

---

## 6. 프롬프트 간 데이터 흐름

```
[문서 업로드 — 보조 흐름]
parsed_text (unpdf raw)
    ▼ buildNormalizePrompt()
normalized_text → normalize_status='done'

[이력서 생성 — v4.0 보조 흐름]
마스터 이력서 + 회사명·포지션·JD
    ▼ buildJdAnalysisPrompt()    → JdAnalysis
    ▼ buildFilterPrompt()        → FilteredContent
    ▼ buildRewritePrompt()       → RewrittenContent
    ▼ buildFinalResumePrompt()   → RESUME_JSON + ANALYSIS
submitted_resumes 저장

[면접 시작 — 메인 흐름]
ensureNormalizedAction(선택 문서)   ← normalize 가드
    ▼
resumeTexts 조립 (제출용 > 마스터 > 업로드 문서)   ← v4.0
    ▼ buildAnalysisPrompt()
[분석 에이전트] → AnalysisOutput
    ▼
[면접관 에이전트 — ADK Runner]
  매 턴: buildInterviewSystemPrompt()  ← 세션 state에서 동적 생성
  시작:  buildFirstQuestionPrompt()
  답변:  buildRespondPrompt()
  힌트:  buildHintPrompt()             → 순수 텍스트
  건너뜀: buildSkipPrompt()
    │ 매 턴 interview_messages 저장 (content + kind)
    ▼
[평가]
  QaGroup[] 조립 (kind 기반)
  질문별: buildQuestionEvaluationPrompt() / buildSkippedModelAnswerPrompt()
  종합:   buildSummaryEvaluationPrompt()
    ▼
interview_reports 저장 → 리포트 화면
```

---

## 7. ADK 적용 범위

> 📎 실행 흐름은 [[Multi Agent Architecture]], 코드 구현은 [[TRD]] 참고.

|에이전트|ADK 사용|BYOK 적용|이유|
|---|---|---|---|
|분석|미사용 (`runOneShot`)|✅|1회성 호출, 세션 불필요|
|**면접관**|**사용 (LlmAgent + Runner)**|**❌ 서버 키 고정**|다중 턴 대화, 세션 상태 유지 필요|
|힌트|미사용 (`runOneShot`)|✅|1회성|
|평가|미사용 (`runOneShot` × N)|✅|질문 단위 독립 호출|
|Normalize|미사용 (raw fetch)|❌ (의도된 고정)|서버 키 고정, 전용 경량 모델|
|이력서 생성 (v4.0)|미사용 (raw fetch)|✅|4단계 재시도·타임아웃 직접 제어|

v1.0 문서의 SequentialAgent 오케스트레이터는 실제 구현에 없다. 순서는 API Route에서 코드로 제어한다.

---

## 8. 품질 관리 체크리스트

### 분석 프롬프트

- [ ] JD 없이 실행 시 지원동기 질문이 생성되지 않는가?
- [ ] JD 있을 때 q1=자기소개, q2=지원동기, q3=이직 사유 순인가?
- [ ] 이력서에 없는 내용을 프로젝트 질문에서 참조하지 않는가?
- [ ] 질문 수가 `round(duration / 5 × 1.5)` 범위인가?
- [ ] 제출용 이력서가 선택된 세션에서 그 내용이 질문에 반영되는가? (v4.0)

### 면접관 프롬프트

- [ ] explorer에서 depth 2를 초과하지 않는가?
- [ ] pressure·technical에서 depth 4를 초과하지 않는가?
- [ ] 남은 시간 20% 이하에서 `type: "closing"`으로 전환되는가?
- [ ] 한 번에 하나의 질문만 하는가?
- [ ] 힌트 모범 답안에 이력서에 없는 내용이 포함되지 않는가?
- [ ] 커스텀 지침이 기본 지침을 덮어쓰지 않고 보완하는가?
- [ ] 힌트 제출 직후 면접관이 그 텍스트를 사용자 답변으로 다루는 것이 의도한 동작인가? (§2-5 — 현재 동작)

### 평가 프롬프트

- [ ] `used_hint: true` 질문의 모든 점수가 30점 이하인가?
- [ ] `skipped: true` 질문이 0점이고 학습용 모범 답안이 생성되는가?
- [ ] feedback이 항목별 나열 없이 자연스러운 한 문단인가?
- [ ] `model_answers`가 본 질문 + 꼬리질문마다 생성되는가?
- [ ] `intent`가 2~4개 키워드 배열인가? (문장 아님)
- [ ] `strength_keywords`·`improvement_keywords`가 명사형 2~4개인가?
- [ ] 점수 앵커 5단계가 프롬프트에 명시되어 있는가?
- [ ] 검증 실패 시 3회 재시도 후 `failed` degrade가 작동하는가?

### Normalize 프롬프트

- [ ] 원문 내용을 추가·삭제하지 않는가? (재구성만)
- [ ] 섹션 헤딩(`##`)이 적절히 부여되는가?
- [ ] 반복 노이즈(헤더/푸터/페이지 번호)가 제거되는가?
- [ ] 출력이 순수 마크다운인가?
- [ ] 큰 문서(16K자+)도 timeout 안에 응답하는가?

### 이력서 생성 프롬프트 (v4.0)

- [ ] 1단계 `core_pillars`가 기술 스택 나열이 아닌 역량 단위인가?
- [ ] 2단계가 성과 없는 프로젝트를 실제로 제거하는가?
- [ ] 3단계 출력이 줄글이 아닌 불릿이고, 서술형 종결어미가 없는가?
- [ ] 3단계가 `id`·회사명·기간·학력 등 사실 필드를 변조하지 않는가?
- [ ] `summary`에 작성 도구 역할명이나 회사 소개문이 들어가지 않는가?
- [ ] 4단계 `found_in`이 필드 경로가 아닌 사람이 읽을 표현인가?
- [ ] 구분자 2개(`---RESUME_JSON---`, `---ANALYSIS---`)가 정확히 출력되는가?
- [ ] `summary`가 최상위와 `basics` 중 어디에 있어도 뷰어가 올바르게 읽는가?

---

## 9. v2 예정 사항

|항목|현재|v2 예정|
|---|---|---|
|평가 가중치|동일 가중치|질문 유형별 차등 (project > common)|
|힌트 사용 점수 상한|30점 고정 (서버 강제)|사용 횟수·시점 기반 유동 조정|
|리포트 상태 표시|`status` 계산만 하고 미표시|4-상태 UI + 단건 재평가|
|userProfile 활용|난이도 조정만|직군별 맞춤 평가 기준|
|페르소나|3종 고정|추가 또는 완전 커스텀 페르소나|
|Normalize 출력|"원문 그대로 정제"|요약형 옵션 검토 (input ≈ output 제약 해제)|
|이력서 생성|4단계 순차|단계 병합 또는 병렬화로 소요 시간 단축|

---

## 10. 용어 정의

|용어|정의|
|---|---|
|depth|꼬리질문 깊이. 본 질문 = 0. explorer 최대 2, pressure/technical 최대 4|
|QaGroup|하나의 본 질문 + 그에 달린 모든 꼬리질문·답변 turns를 묶은 단위|
|used_hint|`kind === 'hint_shown'`인 답변이 있으면 true. 각 축 최대 30점 cap (서버 강제)|
|skipped|`kind === 'skipped'`. 모든 점수 0점, total_score 제외. content는 빈 문자열|
|`kind`|`interview_messages`의 메시지 유형: answer / hint_shown / skipped / interviewer|
|AnswerStatus|answered / hint_shown / skipped / failed. 서버 후처리로 결정되나 **UI에는 미반영**|
|customInstructions|유저가 페르소나별로 작성한 추가 지침. 기본 지침에 보완적으로 적용|
|InstructionProvider|ADK의 동적 시스템 프롬프트 생성 함수. 매 턴 세션 state를 읽어 재구성|
|model_answers|질문 그룹 내 각 질문마다 생성되는 이력서 기반 모범 답안 배열|
|normalize_status|문서 정제 상태 (`pending`/`done`/`failed`). 인터뷰 시작 가드의 단일 소스|
|normalize 가드|`ensureNormalizedAction`. 선택된 모든 문서가 `done`임을 보장하는 동기 단계|
|core_pillars (v4.0)|JD가 요구하는 3대 핵심 역량. 이력서 필터링·재작성의 기준축|
|개조식 (v4.0)|이력서 본문을 불릿 + 명사형 종결로 쓰는 형식. 3단계 재작성의 핵심 제약|

---

_본 문서는 코드베이스 `main` = b330303 (2026-07-30) 기준 v4.0이다. v3.5 문서의 오류(평가 함수명·Zod·structured output·8s 타임아웃·힌트 중립 안내 문구)는 각 절에 정정 표기했다._
