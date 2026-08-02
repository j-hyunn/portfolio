**문서 유형:** PM 기술 이해 문서
**버전:** v4.0 | 작성일: 2026-07-30
**이전 버전:** Multi-Agent Architecture v3.5 (2026-05-20)
**참고:** 코드베이스 `main` = b330303 (2026-07-30) 직접 반영 — `src/app/api/interview/route.ts`, `src/app/api/resume/generate/route.ts`, `src/lib/agents/runners.ts`, `src/lib/evaluation/`, `src/lib/ai-config.ts`, `src/app/(main)/resume/actions.ts`

---

## 관련 문서
- [[Micro Projects/Replai/PRD]] — 제품 요구사항 및 기능 명세
- [[TRD]] — 기술 구현 명세 (API Route·DB 스키마·코드 구조)
- [[Agents Prompt]] — 에이전트 프롬프트 입출력·데이터 구조 상세
- [[Micro Projects/Replai/Decisions]] — 에이전트 구조 선택 의사결정 기록

---

## 변경 이력

|버전|날짜|주요 변경 내용|
|---|---|---|
|v1.0|2026-03-31|최초 작성 (설계 문서 기반)|
|v2.0|2026-03-31|코드베이스 반영: SequentialAgent 제거, ADK 적용 범위 수정(면접관만), runOneShot 패턴 추가, 콜드 스타트 재구성 로직, API Route 액션 5종|
|v3.0|2026-04-01|BYOK 추가: getUserAiConfig() 주입, user_api_settings, crypto.ts·ai-config.ts 신규|
|v3.1|2026-04-04|기술 검증형(technical) 페르소나 추가|
|v3.4|2026-05-17|문서 normalize를 별도 보조 호출로 정리: `after()` 백그라운드화, `gemini-2.5-flash-lite` 분리, `normalize_status`, 인터뷰 시작 가드|
|v3.5|2026-05-20|평가 파이프라인 결정성 강화: `interview_messages.kind` 도입(마커 폐기), 질문별 병렬 호출, 서버 후처리 산술, 힌트 캡 30점|
|**v4.0**|**2026-07-30**|**이력서 생성 파이프라인 신설(§5-6, 4단계). 제출용 이력서 → 면접 컨텍스트 주입 우선순위 도입. 평가 타임아웃 예산 관리. v3.5 기재 오류 정정 — `p-limit`·Zod·structured output·`reevaluate`·"힌트 중립 안내 문구"는 실제로 존재하지 않음. BYOK가 면접관 에이전트에는 적용되지 않는다는 사실 명시**|

---

## 1. 왜 멀티 에이전트인가?

하나의 AI 호출로 전체를 처리할 수 없다. 작업마다 목표와 컨텍스트가 다르기 때문이다.

|작업|특성|단일 모델로 처리 시 문제|
|---|---|---|
|JD + 이력서 분석, 질문 생성|1회성, 구조화 출력|면접 대화 컨텍스트와 섞여 품질 저하|
|면접 대화 진행|다중 턴, 페르소나 유지, 상태 보존|분석·평가 로직이 섞여 페르소나 흔들림|
|답변 평가, 리포트 생성|질문 단위 독립, 전체 이력 참조|일괄 처리 시 특정 질문 누락이 조용히 발생|
|이력서 생성 (v4.0)|단계별 목표가 다름 (분석 → 선별 → 문체 변환)|한 번에 시키면 선별 기준이 무너지고 문체가 섞임|

문서 normalize(§5-5)와 이력서 생성(§5-6)은 면접 흐름 밖의 별도 파이프라인이다.

---

## 2. 전체 구조

```
[클라이언트]
└─ 타이머 관리 / UI 상태
└─ 마스터 이력서 폼 (tiptap)                          ← v4.0
└─ API Route 호출만 — AI 직접 호출 금지

[Next.js Server Actions — 문서 업로드 경로]
└─ getUploadUrlAction              ← Presigned URL 발급
└─ processUploadedDocumentAction
     ├─ Storage download → unpdf.extractText
     ├─ parsedText === "" → Storage cleanup + 거부
     ├─ createDocument(normalize_status='pending')
     ├─ after(() => normalize → status='done'|'failed')
     └─ return { documentId }                          (응답 ~5초)
└─ ensureNormalizedAction          ← 인터뷰 시작 가드 (동기 normalize)
└─ retryNormalizeAction            ← 카드 재시도

[Next.js Server Actions — 마스터 이력서]                ← v4.0
└─ saveMasterResumeAction / deleteMasterResumeAction

[Next.js API Route — /api/interview]   maxDuration = 300
├─ getUser()                       ← 인증 검증
├─ getUserAiConfig(userId)         ← BYOK: 사용자 키/모델 조회
├─ resumeTexts 조립                ← 제출용 > 마스터 > 업로드 문서 (v4.0)
├─ type: "analyze"   → 분석 에이전트 (runOneShot) → 면접관 첫 질문 (ADK)
├─ type: "respond"   → 면접관 에이전트 (ADK runAsync)
├─ type: "hint"      → 힌트 에이전트 (runOneShot)
├─ type: "skip"      → 면접관 에이전트 (ADK runAsync)
└─ type: "evaluate"  → 질문별 평가 (동시성 4) + 종합 요약

[Next.js API Route — /api/resume/*]    maxDuration = 300   ← v4.0
├─ POST   /api/resume/generate       → 4단계 이력서 생성 파이프라인
└─ DELETE /api/resume/submitted/[id] → 제출용 이력서 삭제 (소유자 검증)

[Next.js API Route — /api/tts, /api/transcribe]
└─ 항상 서버 GOOGLE_API_KEY 사용 — 사용자 BYOK 키 무관

[Supabase]
├─ Auth (Google OAuth)
├─ DB (sessions, messages, reports, profiles, persona_settings, api_settings,
│       documents[normalize_status], master_resumes, submitted_resumes)
└─ Storage (이력서·포트폴리오 파일)
```

---

## 3. BYOK 키 주입 흐름

모든 AI 라우트에서 인증 직후 `getUserAiConfig()`를 호출해 해당 유저의 API 키와 모델을 결정한다.

```
API Route 진입
  ▼ getUser()                        ← 인증 검증
  ▼ getUserAiConfig(userId)
      ├─ user_api_settings에 api_key_enc 존재?
      │     YES → decrypt(api_key_enc) → 사용자 키 + 저장된 모델
      │     NO  → 서버 GOOGLE_API_KEY + gemini-2.5-flash
  ▼ { apiKey, model, isCustom }
  ▼ makeGemini(apiKey, model) → runOneShot()  /  callGemini(apiKey, model)
```

### 3-1. 적용 범위 — 중요

|대상|BYOK 적용|근거|
|---|---|---|
|분석 에이전트|✅|`runOneShot(…, apiKey, model)`|
|힌트 에이전트|✅|동상|
|평가 (질문별 + 요약)|✅|동상|
|이력서 생성 4단계|✅|`callGemini(apiKey, model, …)`|
|**면접관 에이전트**|**❌**|`runners.ts`의 `interviewAgent`가 모듈 레벨 싱글턴이며 `new Gemini({ apiKey: env.googleApiKey })`로 **서버 키 고정** 생성됨|
|TTS / STT / Normalize|❌ (의도된 고정)|모델 자체가 고정. 항상 서버 키|

> **v3.5 이하 문서 정정:** "사용자 BYOK 키/모델은 `runAsync()` 호출 전 에이전트에 동적 주입"이라고 기술했으나 **그런 코드는 없다.** 사용자가 3.1 Pro를 선택해도 면접 대화 자체는 기본 `gemini-2.5-flash`로 진행되고, 상위 모델은 분석·힌트·평가·이력서 생성에만 적용된다.

### 3-2. 지원 모델

|모델 ID|제공 방식|
|---|---|
|`gemini-2.5-flash`|서버 기본 키 (기본값)|
|`gemini-2.5-pro`|사용자 키|
|`gemini-3.1-pro-preview`|사용자 키|

### 3-3. 관련 파일

|파일|역할|
|---|---|
|`src/lib/crypto.ts`|AES-256-GCM `encrypt()` / `decrypt()`|
|`src/lib/ai-config.ts`|`getUserAiConfig(userId)` — DB 조회 후 키/모델 반환|
|`src/app/(main)/settings/actions.ts`|키 저장·삭제·모델 변경|

---

## 4. 에이전트 실행 방식

실행 패턴은 **세 가지**다.

### 4-1. runOneShot — 분석 · 힌트 · 평가

```typescript
async function runOneShot(instruction, userMessage, userId, apiKey, model, timeoutMs = 45_000) {
  const agent = new LlmAgent({ name: "oneshot_agent", model: new Gemini({ model, apiKey }), instruction: () => instruction });
  const runner = new Runner({ agent, appName, sessionService: new InMemorySessionService() });
  // runEphemeral()로 이벤트 drain → withDeadline()으로 대기 시간 제한
}
```

- 매 호출마다 새 `LlmAgent` + `InMemorySessionService` 생성, 세션 저장 없음
- `withDeadline(promise, timeoutMs, label)`로 감싸 호출별 상한 적용
- **주의:** `withDeadline`은 호출자의 대기만 끊는다. ADK Runner가 AbortSignal을 노출하지 않아 Gemini 호출 자체는 계속 진행된다

### 4-2. ADK Runner — 면접관 에이전트

```typescript
// runners.ts — 모듈 레벨 싱글턴
const interviewAgent = new LlmAgent({
  name: "interview_agent",
  model: new Gemini({ model: "gemini-2.5-flash", apiKey: env.googleApiKey }),  // ← 서버 키 고정
  instruction: interviewInstruction,   // InstructionProvider — 매 턴 세션 state에서 동적 생성
});
export const interviewRunner = new Runner({ agent: interviewAgent, appName: APP_NAME, sessionService });
```

- Vercel 워밍 인스턴스에서 세션 재사용, `runAsync()`로 턴 추가
- `InstructionProvider`는 `ctx.state.toRecord()`로 읽는다 (State 인스턴스이므로 직접 프로퍼티 접근 불가)

### 4-3. Gemini REST 직접 호출 — normalize · 이력서 생성

ADK를 거치지 않고 `generativelanguage.googleapis.com`에 직접 `fetch`한다. 대화 세션이 불필요하고 재시도·타임아웃을 직접 제어하기 위함이다.

---

## 5. 에이전트 상세

> 📎 프롬프트 입출력 구조 상세는 [[Agents Prompt]] 참고.

### 5-1. 분석 에이전트

|항목|내용|
|---|---|
|실행 방식|`runOneShot()`|
|호출 시점|`type: "analyze"` — 인터뷰 시작 가드 통과 후|
|모델|`getUserAiConfig(userId).model`|
|프롬프트 빌더|`buildAnalysisPrompt()`|

**입력:** JD 텍스트, `resumeTexts`(§5-7 우선순위로 조립), 페르소나, 면접 시간, userProfile

**처리:** JD 키워드 추출 → 이력서 경력·성과 추출 → 강점/우대사항 갭 매핑 → 질문 세트 `round(duration / 5 × 1.5)`개 생성

**완료 후 즉시:** ADK 세션 생성 → 면접관 첫 질문 요청 → Supabase에 `analysis_json` + `adk_session_id` 저장

### 5-2. 면접관 에이전트

|항목|내용|
|---|---|
|실행 방식|ADK `interviewRunner.runAsync()`|
|호출 시점|첫 질문(analyze), 유저 답변(respond), 건너뛰기(skip)|
|모델|**`gemini-2.5-flash` 고정** (§3-1)|

**세션 state:** `persona` / `jdText` / `resumeTexts` / `analysisJson` / `remainingSeconds` / `totalSeconds` / `userProfile` / `customInstructions`

**액션별 프롬프트:**

|액션|프롬프트|동작|
|---|---|---|
|면접 시작|`buildFirstQuestionPrompt()`|인사말 + 첫 질문|
|유저 답변|`buildRespondPrompt(userAnswer)`|꼬리질문 여부 판단 + 다음 발화|
|건너뛰기|`buildSkipPrompt()`|"알겠습니다" + 다음 질문|

**콜드 스타트 재구성:**

```
sessionService.getSession() → null
  └─ createSession() + state 주입
  └─ Supabase interview_messages 최근 30개 읽기
  └─ kind === 'skipped'인 메시지는 "(질문을 건너뛰었습니다)"로 치환해 재생
  └─ createEvent() → appendEvent() 반복 → runAsync()
```

30개 제한 이유: 시스템 프롬프트에 전체 질문 목록이 있어 초기 이력 손실이 진행에 영향 없음.

### 5-3. 힌트 에이전트

|항목|내용|
|---|---|
|실행 방식|`runOneShot()`|
|호출 시점|`type: "hint"` — 힌트 버튼 클릭|
|출력 형식|**순수 텍스트** (JSON 아님)|

직전 인터뷰어 메시지에서 현재 `question_id`를 찾아 `intent`·`good_answer_tips`를 컨텍스트로 제공하고, 최근 6개 메시지를 함께 전달해 논의 중인 주제를 파악한다.

**제출 흐름 (실제 동작):**

```
클라이언트가 힌트 텍스트를 화면에 표시
  └─ sendMessage(hint, "hint_shown")
       └─ 힌트 텍스트가 그대로 userMessage로 전송됨
       └─ DB에 content = 힌트 텍스트, kind = 'hint_shown'으로 저장
       └─ 면접관 에이전트에도 그 텍스트가 그대로 전달됨
```

> **v3.5 문서 정정:** "면접관 에이전트에는 모범 답안 텍스트 대신 '사용자가 모범 답안을 참조했습니다'라는 중립 안내 문구만 전달한다"고 기술했으나 **그런 분기는 없다.** `agentUserMessage = userMessage`로 힌트 원문이 그대로 전달되며, 면접관은 이를 사용자의 실제 답변으로 인식한다.

평가 시 `kind === 'hint_shown'`을 감지해 점수 상한 30점을 서버에서 강제한다.

### 5-4. 평가 — 질문별 단건 + 종합 요약

|항목|내용|
|---|---|
|실행 방식|`runOneShot()` × 질문 수 + 요약 1회. 오케스트레이션은 `route.ts` 인라인|
|호출 시점|`type: "evaluate"` — 면접 종료 후|
|동시성|`mapWithConcurrency(items, 4, task)` — **자체 구현** (`src/lib/evaluation/concurrency.ts`)|
|호출별 타임아웃|`ONESHOT_TIMEOUT_MS = 45_000`|
|전체 예산|`EVAL_BUDGET_MS = 240_000`|

**QaGroup 조립 (AI 호출 없이 코드로 처리):**

```
Supabase interview_messages 전체 읽기
  └─ question_id로 그룹핑 (꼬리질문은 직전 question_id 승계)
  └─ kind === 'hint_shown' → used_hint = true
  └─ kind === 'skipped'    → skipped = true
```

**파이프라인:**

```
Stage 1 — mapWithConcurrency(qaGroups, 4, evaluateOneGroup)
  ├─ skipped 그룹 → buildSkippedModelAnswerPrompt() → buildSkippedAnswer()
  │                  (모범 답안 호출이 실패해도 레코드는 생성)
  └─ 그 외        → buildQuestionEvaluationPrompt() → 최대 3회 재시도
                     ├─ 성공 → parseQuestionEvaluation() (수동 타입 가드)
                     │          → used_hint ? applyHintCap() : applyAnsweredOverrides()
                     └─ 3회 실패 또는 예산 소진 → buildFailedAnswer()

computeTotalScore()  ← skipped·failed 제외 평균, 서버 산술

Stage 2 — buildSummaryEvaluationPrompt() → 최대 3회 재시도 → parseSummaryEvaluation()
          3회 실패 시 500 (리포트 미생성)

→ interview_reports.upsert({ onConflict: "session_id" })
```

> **v3.5 문서 정정 3건:**
> - `p-limit` 의존성 없음 → 자체 `mapWithConcurrency`
> - Zod 없음 → `parse.ts`의 수동 타입 가드 + `InvalidEvaluationError`
> - Gemini structured output(`responseSchema`) 미사용 → `extractJson` 후 파싱
> - `src/lib/evaluation/`의 실제 구성은 `parse.ts` / `postprocess.ts` / `concurrency.ts` (`schema.ts`·`run.ts` 없음)

### 5-5. Document Normalize (보조)

면접 흐름 밖에서 동작하는 보조 LLM 호출.

|항목|내용|
|---|---|
|실행 방식|Raw `fetch` — ADK 미사용|
|호출 시점|① 업로드 후 `after()` 콜백 ② 카드 재시도 ③ 인터뷰 시작 가드|
|모델|`gemini-2.5-flash-lite` (`NORMALIZE_MODEL`, 항상 서버 키)|
|Timeout|백그라운드 55s / 동기 55s|
|상태|`user_documents.normalize_status` (`pending`/`done`/`failed`)|

**왜 면접 모델과 분리했는가:** 16K자 이상 포트폴리오에 `gemini-2.5-flash`는 45초+ 소요 → AbortError 빈발. normalize 프롬프트가 "원문 그대로 정제"라 input ≈ output이라 응답 시간이 입력 크기에 비례한다. flash-lite는 latency 1/2~1/3이고, 노이즈 제거·줄바꿈 복원·헤딩 부여 작업에는 lite 품질로 충분하다.

**인터뷰 흐름과의 연결:**

```
업로드 → after() 백그라운드 normalize → status='done'/'failed'
                                        ▼
인터뷰 시작 버튼 클릭
  └─ ensureNormalizedAction(선택 문서)
       ├─ 모두 done → 통과
       ├─ pending/failed → 동기 normalize (최대 55s/문서)
       └─ failed 있음 → 인터뷰 진입 차단
  ▼
가드 통과한 문서만 분석 에이전트로 흘러감 (normalized_text 보장)
```

### 5-6. 이력서 생성 파이프라인 — v4.0 신규

`POST /api/resume/generate`. 마스터 이력서와 JD를 입력받아 제출용 이력서를 만든다. **4단계 순차 호출**이며 각 단계의 출력이 다음 단계 입력이 된다.

|항목|내용|
|---|---|
|실행 방식|Gemini REST 직접 호출 (`callGemini`) — ADK 미사용|
|모델|`getUserAiConfig(userId).model` (BYOK 적용)|
|재시도|단계마다 최대 3회, `1000ms × attempt` 백오프|
|maxDuration|300|

```
인증 → 입력 검증 (company_name / position / jd_text 필수, 없으면 400)
     → getMasterResume(user.id)   없으면 422 "마스터 이력서를 먼저 작성해주세요"
     → getUserAiConfig(user.id)

1단계  buildJdAnalysisPrompt()   → JdAnalysis
       포지션 페르소나(manager/executor) 판정, 3대 핵심 역량, ATS 키워드 5개, 기업 컨텍스트
       실패 → 502 "JD 분석에 실패했습니다"

2단계  buildFilterPrompt()       → FilteredContent
       마스터 이력서의 경력·프로젝트 중 JD에 맞는 것만 id로 선별 + 우선순위 + 제거 사유
       실패 → 502 "이력서 필터링에 실패했습니다"

3단계  buildRewritePrompt()      → RewrittenContent (= SubmittedResumeContent)
       선별 항목의 텍스트 필드를 개조식 불릿으로 재작성. 수치 필수, JD 키워드 삽입
       id·회사명·기간·학력 등 사실 필드는 원본 유지
       실패 → 502 "문장 변환에 실패했습니다"

4단계  buildFinalResumePrompt()  → ---RESUME_JSON--- / ---ANALYSIS--- 구분자 텍스트
       키워드 매핑 / 강조 포인트 / 부족한 항목 도출
       실패 → 502 "최종 이력서 생성에 실패했습니다"

파싱  RESUME_JSON 블록 성공 → content_json
      실패 → 3단계 결과를 그대로 사용 (canonical fallback)
      ANALYSIS 블록 실패 → 빈 분석으로 저장 (hard failure 아님)

→ createSubmittedResume({ content_md: "", content_json, analysis_json })
```

**왜 4단계로 나눴는가:** 한 번에 시키면 "선별"과 "문체 변환"이 섞여 선별 기준이 무너진다. 1단계에서 전략을 고정하고, 2단계는 id 선별만, 3단계는 문장 변환만 담당해 각 단계의 판단 기준을 독립시켰다.

### 5-7. 컨텍스트 우선순위 — v4.0 신규

`/api/interview`가 매 요청에서 문서·프로필·페르소나 설정·마스터 이력서·제출용 이력서를 **병렬 조회**한 뒤 `resumeTexts` 배열을 아래 순서로 조립한다. 앞에 놓인 것이 가장 높은 우선순위다.

```
[제출용 이력서 - {회사명} {포지션}]   ← content_json 있으면 serializeSubmittedResume()
                                       없으면 content_md 폴백 (레거시 행)
[마스터 이력서]                        ← 경력 또는 프로젝트가 1개 이상일 때만 포함
[이력서: {파일명}]                     ← normalized_text ?? parsed_text
[포트폴리오: {파일명}]
```

이 배열이 분석·면접관·힌트·평가 전 에이전트에 동일하게 전달된다. 제출용 이력서를 선택하고 면접을 시작하면, 면접관은 **그 회사에 실제로 낸 이력서를 읽은 상태**로 질문한다.

---

## 6. API Route 액션 플로우

### `/api/interview` — 5개 액션

#### analyze

```
1. getUser() → getUserAiConfig(userId)
2. 병렬 조회: documents / userProfile / personaSettings / masterResume / submittedResume
3. resumeTexts 조립 (§5-7)
4. buildAnalysisPrompt() → runOneShot() → AnalysisOutput 파싱 (실패 시 500)
5. ADK 세션 생성 (state 주입)
6. Supabase: analysis_json + adk_session_id 저장
7. interviewRunner.runAsync(buildFirstQuestionPrompt()) → 첫 질문
8. createMessage(kind:'interviewer') + generateTtsBase64() 병렬
9. 응답: { analysisJson, firstMessage, audioBase64 }
```

#### respond

```
요청: { type: "respond", sessionId, userMessage, kind }

1. getUser() → getUserAiConfig(userId)
2. userKind 결정 — body.kind가 'answer' | 'hint_shown'이면 그대로, 아니면 'answer'
3. createMessage(content: userMessage, kind: userKind)   ← 원문 그대로 저장
4. ensureAdkSession() — 콜드 스타트 재구성
5. interviewRunner.runAsync(buildRespondPrompt(userMessage))
6. 면접관 메시지 저장(kind:'interviewer') + TTS 병렬
7. 응답: { message, audioBase64 }
```

#### hint

```
1. getUser() → getUserAiConfig(userId)
2. 마지막 인터뷰어 메시지의 question_id 조회
3. analysisJson에서 intent + good_answer_tips 조회
4. 최근 6개 메시지 컨텍스트로 buildHintPrompt() → runOneShot()
5. 응답: { hint } — 순수 텍스트
※ 클라이언트가 이 텍스트를 kind:'hint_shown'으로 respond에 다시 보낸다
```

#### skip

```
1. getUser() → getUserAiConfig(userId)
2. createMessage(content: "", kind: 'skipped')   ← 빈 문자열이 정상
3. ensureAdkSession()
4. interviewRunner.runAsync(buildSkipPrompt())
5. 면접관 메시지 저장 + TTS 병렬
6. 응답: { message, audioBase64 }
```

#### evaluate

```
1. getUser() → getUserAiConfig(userId)
2. 전체 대화 이력 조회 (kind 포함)
3. QaGroup[] 조립 (kind로 used_hint / skipped 판별)
4. Stage 1: mapWithConcurrency(qaGroups, 4, evaluateOneGroup) → AnswerFinal[]
5. computeTotalScore() — 서버 산술
6. Stage 2: 종합 요약 1회 (재시도 3회, 실패 시 500)
7. interview_reports.upsert({ onConflict: "session_id" })
8. 응답: { reportJson }
```

> **`reevaluate`는 존재하지 않는다.** v3.5 문서에 명세까지 기재됐으나 구현되지 않았다. 리포트 UI가 `failed` 상태를 표시하지 않아 진입점도 없다.

### `/api/resume/*` — v4.0

|경로|메서드|흐름|
|---|---|---|
|`/api/resume/generate`|POST|§5-6|
|`/api/resume/submitted/[id]`|DELETE|`getUser()` → 조회 → 404(없음) / 403(타인) → 삭제|

---

## 7. 메시지 kind 시스템

`[모범 답안]`, `[질문 건너뛰기]` 텍스트 마커는 폐기되었고 `interview_messages.kind` 컬럼으로 대체되었다. 마커 방식은 파싱 취약성, LLM 오독, 텍스트 노출 문제가 있었다.

|kind|저장 주체|content|평가 영향|
|---|---|---|---|
|`answer`|respond 핸들러|사용자 답변 원문|정상 평가|
|`hint_shown`|respond 핸들러|**힌트 텍스트 원문**|각 축 최대 30점 cap (서버 강제)|
|`skipped`|skip 핸들러|**빈 문자열**|0점, total_score 제외|
|`interviewer`|analyze/respond/skip|면접관 발화|평가 제외|

- `QaGroup.used_hint` = `kind === 'hint_shown'`, `QaGroup.skipped` = `kind === 'skipped'` — 텍스트 파싱 없이 DB 값에서 직접 결정
- `InterviewMessage.kind`는 `MessageKind | null`. null은 컬럼 도입 이전 레거시 행
- 렌더링 시 `kind === 'skipped'`는 화면에서 안내 문구로 치환된다 (content가 비어 있으므로)

**면접관 에이전트 전달:** `answer`·`hint_shown` 모두 `content` 원문을 그대로 전달한다. 별도 분기 없음(§5-3).

---

## 8. 데이터 흐름

```
[문서 업로드]
client → uploadToSignedUrl                                  ~1~5s
client → processUploadedDocumentAction
          ├─ Storage download → unpdf.extractText
          ├─ parsedText === "" → Storage cleanup + error
          ├─ createDocument(normalize_status='pending')
          ├─ after(() => runNormalize → status='done'|'failed')
          └─ return                                          ★ ~5s 응답

[이력서 생성 — v4.0]
마스터 이력서 작성 (/resume/master) → saveMasterResumeAction
    │
    ▼ 회사명·포지션·JD 입력
POST /api/resume/generate
    ├─ 1단계 JD 분석      → JdAnalysis
    ├─ 2단계 필터링       → FilteredContent
    ├─ 3단계 재작성       → RewrittenContent
    └─ 4단계 분석         → keyword_mapping / highlights / missing_items
    ▼
submitted_resumes insert → /resume/submitted/[id]

[면접 시작]
NewInterviewDialog handleStart
    ▼ ensureNormalizedAction(선택 문서)
        ├─ 모두 done → 통과
        ├─ pending/failed → 동기 normalize (최대 55s/문서)
        └─ failed 있음 → 진입 차단
    ▼ createInterviewSessionAction (submittedResumeId 포함)
    ▼ type: "analyze"
getUserAiConfig() → resumeTexts 조립 (제출용 > 마스터 > 문서)
buildAnalysisPrompt() → runOneShot() → AnalysisOutput
    ▼
ADK 세션 생성 → analysis_json + adk_session_id 저장
    ▼ buildFirstQuestionPrompt() → runAsync()
첫 질문 + TTS → interview_messages 저장

[면접 진행 — 매 턴]
유저 답변 → type: "respond"
createMessage(content, kind) → ensureAdkSession() → runAsync()
    ▼ 다음 발화 + TTS → interview_messages 저장

[면접 종료]
type: "evaluate"
전체 messages 조회 → QaGroup[] 조립 (코드, AI 없음)
    ▼ Stage 1 질문별 평가 (동시성 4, 예산 240s)
    ▼ computeTotalScore (서버 산술)
    ▼ Stage 2 종합 요약
interview_reports upsert (onConflict: session_id)
```

---

## 9. DB 스키마 (약식)

> 📌 전체 스키마·RLS·마이그레이션은 [[TRD]] §13 참고.

마이그레이션 **13개** 기준. v4.0에서 추가된 테이블은 아래 둘이다.

```sql
-- 마스터 이력서 (v4.0)
master_resumes
  id uuid PK
  user_id uuid → auth.users (UNIQUE)
  basics jsonb NOT NULL DEFAULT '{}'
  experiences / projects / skills / educations / activities jsonb NOT NULL DEFAULT '[]'
  self_intro_memo text NOT NULL DEFAULT ''   ← 이력서 출력물에 미포함
  created_at, updated_at timestamptz

-- 제출용 이력서 (v4.0)
submitted_resumes
  id uuid PK
  user_id uuid → auth.users
  company_name / position / jd_text text NOT NULL DEFAULT ''
  content_md text NOT NULL DEFAULT ''        ← 레거시. 신규 생성은 빈 문자열
  content_json jsonb NULL                    ← canonical
  analysis_json jsonb NOT NULL DEFAULT '{}'
  created_at timestamptz

-- 면접 세션에 추가된 컬럼 (v4.0)
interview_sessions.submitted_resume_id uuid → submitted_resumes(id) ON DELETE SET NULL
```

기존 테이블(`user_documents`, `interview_sessions`, `interview_messages`, `interview_reports`, `user_profiles`, `user_persona_settings`, `user_api_settings`)은 v3.5와 동일하다.

**RLS:** 전 테이블 적용. `master_resumes` / `submitted_resumes`는 `auth.uid() = user_id`.

---

## 10. 에러 핸들링

> 불완전한 면접 경험은 실전 대응에 치명적이다. 폴백 없이 실패는 실패로 처리한다.

|상황|처리 방식|
|---|---|
|분석 runOneShot 실패|500 반환, 클라이언트 재시도 유도|
|JSON 파싱 실패|`extractJson()`으로 코드 펜스 제거 후 재파싱. 실패 시 500|
|ADK 세션 없음 (콜드 스타트)|`ensureAdkSession()`으로 자동 재구성|
|TTS 실패|`null` 반환 (non-critical), 면접 계속|
|STT 실패|500 반환, 텍스트 직접 입력 유도|
|질문 단건 평가 3회 실패|해당 답변만 `failed`로 degrade — 리포트 생성은 계속|
|종합 요약 3회 실패|500 반환 (리포트 미생성)|
|평가 예산 소진|남은 질문은 재시도 없이 `failed` 처리|
|이력서 생성 단계 실패|단계별 메시지와 함께 502|
|이력서 4단계 파싱 실패|3단계 결과로 폴백 (유일한 폴백 지점)|
|사용자 API 키 무효|Gemini 401/403 → 500 + 키 오류 안내|
|Normalize timeout|`status='failed'` 표기 + 사용자 명시 재시도|
|Empty text PDF|업로드 단계 명시적 거부 + Storage cleanup|

---

## 11. 성능

|항목|내용|대응|
|---|---|---|
|Gemini API 레이턴시|프록시 경유 추가 지연|TTS 생성과 메시지 저장 `Promise.all` 병렬|
|Vercel 콜드 스타트|InMemorySessionService 초기화|`ensureAdkSession()` 최근 30개 재구성|
|평가 총 소요|질문 수만큼 호출|동시성 4 + 호출별 45s + 전체 예산 240s|
|이력서 생성 소요|4단계 **순차** 호출|현재 대응 없음 — 단계 병합·모델 경량화 검토 필요|
|API Route 타임아웃|`maxDuration = 300` 설정|문서가 전제해온 "무료 티어 60초"와 불일치 — 실제 상한 확인 필요|
|과도한 DB 쓰기|Supabase 무료 티어 제한|답변 완료 단위로만 저장|
|업로드 응답 지연|큰 PDF normalize 동기 호출 30~60s|`after()` 분리 → 응답 ~5s|

> **스트리밍 미구현.** 모든 AI 라우트가 `Response.json()` 일괄 응답이다.

---

## 12. 보안

|항목|처리 방식|
|---|---|
|서버 Gemini API 키|`env.googleApiKey` 서버 전용|
|사용자 API 키|AES-256-GCM 암호화 후 저장. 평문 저장·클라이언트 전달 금지|
|암호화 키|`ENCRYPTION_KEY` 서버 전용|
|복호화 위치|`ai-config.ts` 서버에서만|
|클라이언트 AI 직접 호출|금지 — API Route 경유|
|세션 접근 제어|`session.user_id !== user.id` 검증|
|제출용 이력서 접근|`resume.user_id !== user.id` → 403 (v4.0)|
|문서·이력서 접근|Supabase RLS — 본인 데이터만|
|Presigned URL|`storagePath.startsWith(user.id + "/")` 검증|
|Empty text PDF|업로드 단계 거부 + Storage cleanup|

---

## 13. 버전별 변경 사항

|항목|v2.0|v3.0|v3.1|v3.4|v3.5|**v4.0**|
|---|---|---|---|---|---|---|
|AI 키 관리|서버 단일 키|BYOK 추가|동일|Normalize는 서버 키 고정|동일|**면접관 에이전트는 BYOK 미적용임이 확인됨**|
|면접 모델|flash 고정|BYOK로 상위 모델|동일|동일|동일|동일|
|페르소나|2종|동일|**3종**|동일|동일|동일|
|평가 방식|runOneShot 단일|동일|동일|동일|**질문별 병렬 (동시성 4)**|**+ 타임아웃 예산 240s, 건너뛴 질문 모범답안**|
|마커 시스템|텍스트 마커|동일|동일|동일|**kind 컬럼**|동일|
|힌트 점수 상한|40점|동일|동일|동일|**30점 (서버 강제)**|동일|
|total_score|LLM 출력값|동일|동일|동일|**서버 산술**|동일|
|문서 normalize|동기|동일|동일|**`after()` + flash-lite + 상태 추적**|동일|동일|
|이력서|업로드 PDF만|동일|동일|동일|동일|**마스터/제출용 + 4단계 생성 + 컨텍스트 우선순위**|
|Git 링크|README fetch|동일|동일|동일|동일|**기능 제거**|
|엔드포인트|interview 5종|동일|동일|동일|동일|**+ resume/generate, resume/submitted/[id]**|

---

_본 문서는 코드베이스 `main` = b330303 (2026-07-30) 기준 v4.0이다. v3.5 문서의 오류(§3-1 BYOK 적용 범위, §5-3 힌트 전달 방식, §5-4 평가 구현, §6 reevaluate)는 각 절에 정정 표기했다._
