**Technical Requirements Document v4.0** 작성일: 2026-07-30 | 상태: Draft | 이전 버전: TRD v3.5 (2026-05-20)

> **본 버전의 기준:** 코드베이스(`main` = b330303, 2026-07-30)를 사실의 기준으로 삼아 전면 재작성했다.
> v3.5 문서에 기재됐던 Zod·p-limit·structured output·reevaluate는 실제 구현과 달라 정정했고, 마스터 이력서 시스템(§11)을 신설했다.
> 섹션 번호가 v3.5와 달라졌다 — §11 이력서 시스템 신설로 이후 섹션이 밀렸다.

---

## 관련 문서
- [[Micro Projects/Replai/PRD]] — 제품 요구사항 및 기능 명세
- [[Multi Agent Architecture]] — 멀티 에이전트 구조 상세 (PM용)
- [[Agents Prompt]] — 에이전트 프롬프트 설계 및 입출력 구조
- [[Micro Projects/Replai/Decisions]] — 기술 선택 의사결정 기록

---

## 변경 이력

|버전|날짜|주요 변경 내용|
|---|---|---|
|v1.0|2026-03-27|최초 작성|
|v2.0|2026-03-31|코드베이스 반영 전면 업데이트: 모델 변경(gemini-2.5-flash), TTS/STT 추가, ADK 적용 범위 수정, API Route 구조 확정, DB 스키마 최신화|
|v3.0|2026-04-01|BYOK(Gemini) 추가: user_api_settings 테이블, AES-256-GCM(crypto.ts), ai-config.ts, Settings 페이지|
|v3.1|2026-04-04|기술 검증형 페르소나 추가: DB CHECK 제약 마이그레이션, Persona 타입 3종 확장|
|v3.2|2026-04-05|파일 업로드 Presigned URL 전환: Vercel 4.5MB 제한 우회, `pdfjs-dist` → `unpdf` 교체|
|v3.3|2026-05-17|문서 normalize 백그라운드화: `after()` 분리, `normalize_status` 컬럼, `retryNormalizeAction`·`ensureNormalizedAction`·`getNormalizeStatusesAction`, normalize 전용 모델 `gemini-2.5-flash-lite`|
|v3.5|2026-05-20|평가 파이프라인 결정성 강화: `interview_messages.kind` 컬럼 도입(마커 폐기), 질문별 단건 호출 병렬화, 런타임 타입 검증 + 재시도 3회, 서버 후처리 산술|
|**v4.0**|**2026-07-30**|**이력서 시스템 신설(§11): `master_resumes`·`submitted_resumes` 테이블, 4단계 생성 파이프라인, 제출용 이력서 면접 컨텍스트 주입. Git 링크 기능 제거. 평가 타임아웃 예산 관리(§12). v3.5 기술 상세 정정 — Zod·p-limit·structured output·reevaluate는 실제로 존재하지 않음**|

---

## 1. 기술 스택

|영역|기술|버전 / 비고|
|---|---|---|
|**에이전트 프레임워크**|Google ADK (TypeScript)|`@google/adk ^0.6.0` — 면접관 에이전트에만 적용|
|**Framework**|Next.js|`16.2.1`, App Router|
|**React**|React|`19.2.4`|
|**UI**|shadcn/ui + Radix UI + Base UI|`@base-ui/react ^1.3.0`|
|**에디터**|tiptap|`@tiptap/react ^3.26.0`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `tiptap-markdown ^0.9.0` — 마스터 이력서 서술형 필드 (v4.0)|
|**AI — 면접/평가/분석/이력서 생성 (기본)**|Gemini 2.5 Flash|`gemini-2.5-flash` — 서버 키|
|**AI — 상위 모델 (BYOK)**|Gemini 2.5 Pro / 3.1 Pro Preview|사용자 키 등록 시 선택|
|**AI — Normalize**|Gemini 2.5 Flash Lite|`gemini-2.5-flash-lite` (`NORMALIZE_MODEL`) — 항상 서버 키|
|**AI — TTS**|Gemini 2.5 Flash Preview TTS|`gemini-2.5-flash-preview-tts`, voice `Kore` — 항상 서버 키|
|**AI — STT**|Gemini 2.5 Flash|`/api/transcribe` — 항상 서버 키|
|**암호화**|Node.js `crypto` (AES-256-GCM)|사용자 API 키 암호화 저장|
|**Database**|Supabase|무료 티어, `@supabase/supabase-js ^2.100.1`|
|**Auth**|Supabase Auth|Google OAuth, `@supabase/ssr ^0.9.0`|
|**Storage**|Supabase Storage|무료 티어 (1GB), `documents` 버킷|
|**배포**|Vercel|무료 티어|
|**문서 파싱**|`unpdf`|`^1.6.2` — 서버 사이드, PDF 전용, `serverExternalPackages`로 번들 제외|
|**테스트**|Vitest|`^4.1.10`, `npm run test` / `npm run test:watch`|
|**분석**|Google Analytics|`@next/third-parties ^16.2.2`, `gaId="G-NLL8P9G6YE"`|

**`next.config.ts`:**

```typescript
{
  serverExternalPackages: ["unpdf"],
  experimental: {
    serverActions: { bodySizeLimit: "21mb" },
    proxyClientMaxBodySize: "21mb",   // Turbopack dev 프록시 버퍼
  },
}
```

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
[클라이언트]
├─ 타이머 관리 (setInterval 카운트다운)
├─ UI 상태 (React useState / useRef)
├─ 마이크 녹음 (MediaRecorder API)
├─ 문서 카드 폴링 (DocumentSection 5초 간격, pending 있을 때만)
├─ 마스터 이력서 폼 (tiptap 마크다운 에디터)          ← v4.0
└─ AI 호출 → API Route 위임 (직접 호출 금지)

[Next.js Server]
├─ /api/interview            — 5개 액션 (analyze / respond / hint / skip / evaluate)
├─ /api/resume/generate      — 이력서 4단계 생성 파이프라인 (v4.0)
├─ /api/resume/submitted/[id]— 제출용 이력서 삭제 (DELETE) (v4.0)
├─ /api/transcribe           — STT (항상 서버 키)
├─ /api/tts                  — TTS (항상 서버 키)
├─ Server Actions            — §5 참조
├─ Background                — Next.js `after()`로 normalize 실행 후 status 업데이트
└─ Middleware                — Supabase 세션 갱신

[Supabase]
├─ Auth (Google OAuth)
├─ DB  (sessions, messages, reports, profiles, persona_settings, api_settings,
│       documents[normalize_status], master_resumes, submitted_resumes)
└─ Storage (documents 버킷: 이력서·포트폴리오 파일)
```

### 2.2 아키텍처 결정 원칙

- `GOOGLE_API_KEY`는 서버 환경변수에만 저장 — 클라이언트 절대 노출 금지
- 사용자 API 키는 AES-256-GCM으로 암호화 후 DB 저장 — 서버에서만 복호화
- 모든 AI 호출은 API Route 경유 (API 키 보호 + 인증 검증)
- TTS / STT / Normalize는 항상 서버 `GOOGLE_API_KEY` 사용 — 사용자 키와 무관
- 환경변수는 `src/lib/env.ts`에서 중앙 관리

```typescript
// lib/env.ts
export const env = {
  googleApiKey:           process.env.GOOGLE_API_KEY!,            // 서버 전용
  encryptionKey:          process.env.ENCRYPTION_KEY!,            // 서버 전용 (32바이트 hex)
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!, // 서버 전용
  supabaseUrl:            process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey:        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
} as const;
```

---

## 3. 멀티 에이전트 구조

> 📎 PM용 에이전트 구조 전체 흐름은 [[Multi Agent Architecture]] 참고.

### 3.1 에이전트 개요

```
[분석 에이전트]   — runOneShot (ephemeral, 세션 없음)
  └─ JD + 이력서 → 질문 세트 생성

[면접관 에이전트] — ADK LlmAgent + Runner (세션 보유)
  └─ 페르소나 대화 진행, 꼬리질문 판단

[힌트 에이전트]   — runOneShot (ephemeral)
  └─ 이력서 기반 모범 답안 실시간 생성

[평가 에이전트]   — runOneShot (ephemeral) × 질문 수 + 요약 1회
  └─ 질문별 단건 평가 → 종합 요약

[이력서 생성]     — Gemini REST 직접 호출 × 4단계          ← v4.0
  └─ JD 분석 → 필터링 → 개조식 재작성 → 분석
```

**SequentialAgent 오케스트레이터는 사용하지 않는다.** 에이전트 호출 순서는 API Route에서 코드로 제어한다.

### 3.2 실행 패턴

#### runOneShot (분석 · 힌트 · 평가)

```typescript
async function runOneShot(
  instruction: string, userMessage: string, userId: string,
  apiKey: string, model: string,
  timeoutMs: number = ONESHOT_TIMEOUT_MS,
): Promise<string> {
  const agent = new LlmAgent({
    name: "oneshot_agent",
    model: makeGemini(apiKey, model),
    instruction: () => instruction,
  });
  const runner = new Runner({ agent, appName: APP_NAME, sessionService: new InMemorySessionService() });
  // runner.runEphemeral()로 이벤트를 drain하고 withDeadline()으로 대기 시간을 제한한다.
}
```

- 매 호출마다 새 에이전트·서비스 인스턴스 생성, `runEphemeral()` — 세션 저장 없음
- `makeGemini(apiKey, model)` — 사용자 키/모델 또는 서버 기본값 주입
- `withDeadline(promise, timeoutMs, label)`로 감싸 호출별 상한 적용 (§12.3)

#### ADK Runner (면접관) — `src/lib/agents/runners.ts`

```typescript
export const sessionService = new InMemorySessionService();   // 모듈 레벨 싱글턴

const interviewInstruction: InstructionProvider = (ctx) => {
  const s = ctx.state.toRecord();   // State 인스턴스 — 직접 프로퍼티 접근 금지
  return buildInterviewSystemPrompt({ persona, jdText, resumeTexts, analysisJson,
                                      remainingSeconds, totalSeconds, userProfile, customInstructions });
};

const interviewAgent = new LlmAgent({
  name: "interview_agent",
  model: new Gemini({ model: "gemini-2.5-flash", apiKey: env.googleApiKey }),
  instruction: interviewInstruction,
});

export const interviewRunner = new Runner({ agent: interviewAgent, appName: APP_NAME, sessionService });
```

- Vercel 워밍 인스턴스에서 세션 재사용, `runAsync()`로 턴 추가
- `InstructionProvider`가 매 턴 세션 state에서 시스템 프롬프트 동적 재생성

> **주의:** `interviewAgent`는 모듈 레벨 싱글턴이며 **서버 기본 키로 고정 생성**된다. BYOK 키/모델은 `runOneShot` 계열(분석·힌트·평가·이력서 생성)에만 적용되고, 면접관 에이전트 턴에는 반영되지 않는다.

### 3.3 실행 순서

```
[면접 시작 — type: "analyze"]
  getUserAiConfig(userId) → { apiKey, model }
  resumeTexts 조립 (제출용 이력서 > 마스터 이력서 > 업로드 문서)   ← v4.0
  분석 에이전트 (runOneShot)
  └─ AnalysisOutput 생성 → ADK 세션 생성 (state 주입)
  └─ Supabase: analysis_json + adk_session_id 저장
  └─ 면접관 에이전트 첫 질문 생성 → TTS 병렬

[면접 진행 — type: "respond" / "skip"]
  면접관 에이전트 (ADK runAsync)
  └─ 꼬리질문 여부 판단 → 다음 발화 → TTS 병렬
  └─ 메시지는 kind와 함께 저장 (§10)

[힌트 — type: "hint"]
  힌트 에이전트 (runOneShot) → 순수 텍스트 모범 답안

[면접 종료 — type: "evaluate"]
  API Route에서 QaGroup[] 코드로 조립 (AI 없음)
  └─ 질문별 단건 평가 (동시성 4) → 종합 요약 1회 → §12
  └─ Supabase interview_reports upsert (onConflict: session_id)
```

### 3.4 콜드 스타트 대응

Vercel 콜드 스타트 시 `InMemorySessionService`가 초기화되어 세션이 사라진다. `ensureAdkSession()`이 자동 복구한다.

```
sessionService.getSession() → null
  └─ createSession() + state 주입
  └─ Supabase interview_messages 조회 → 최근 30개만 사용
  └─ createEvent()로 각 메시지 → ADK 이벤트 변환 후 appendEvent()
```

30개 상한 이유: 시스템 프롬프트에 전체 질문 목록이 있으므로 초기 대화 손실이 질문 진행에 영향 없음.

### 3.5 에러 핸들링

> 불완전한 면접 경험은 실전 대응에 치명적이다. 폴백 없이 실패는 실패로 처리한다.

|상황|처리 방식|
|---|---|
|분석 runOneShot 실패|500 반환, 클라이언트 재시도 유도|
|JSON 파싱 실패|`extractJson()`으로 마크다운 코드 펜스 제거 후 재파싱. 실패 시 500|
|ADK 세션 없음|`ensureAdkSession()`으로 자동 재구성|
|TTS 실패|`null` 반환 (non-critical). 텍스트만 표시하고 면접 계속|
|질문 단건 평가 3회 실패|해당 답변만 `failed` 카드로 degrade — 리포트 생성은 계속|
|종합 요약 3회 실패|500 반환 (리포트 미생성)|
|이력서 생성 단계 실패|단계별 메시지와 함께 502|
|폴백|**없음**|

---

## 4. 면접관 에이전트 상세

### 4.1 페르소나

|코드값|이름|depth 상한|특성|
|---|---|---|---|
|`explorer`|경험 탐색형|**최대 2**|편안하고 대화적, depth 2 초과 시 강제 주제 전환|
|`pressure`|심층 압박형|**최대 4**|논리적 허점 지적, 수치·사례 없으면 꼬리질문|
|`technical`|기술 검증형|**최대 4**|설계 근거·CS 원리·성능 트레이드오프 검증, why/how 중심|

### 4.2 커스텀 지침 주입

`customInstructions`가 있으면 페르소나 기본 지침 뒤, 면접 컨텍스트 앞에 `## 사용자 추가 지침` 섹션으로 삽입. 없으면 섹션 자체 생략.

### 4.3 시간 관리

- 남은 시간 `< totalSeconds × 0.2` → 시스템 프롬프트에 경고 삽입 → `type: "closing"` 전환 지시
- `InstructionProvider`가 매 턴 `state.remainingSeconds`를 읽으므로 자동 반영

### 4.4 꼬리질문 판단

룰 기반 필터 없음. AI가 대화 전체 컨텍스트를 보고 판단한다. `good_answer_tips`는 면접관 시스템 프롬프트에서 **제외**된다 (힌트 에이전트 전용).

---

## 5. API Route 및 Server Actions

### 5.1 `POST /api/interview`

`export const maxDuration = 300`

모든 요청에서 `getUser()` 인증 → `getUserAiConfig(userId)` → 세션 소유자 확인 후 처리.

|type|역할|응답|
|---|---|---|
|`analyze`|분석 + 첫 질문 생성|`{ analysisJson, firstMessage, audioBase64 }`|
|`respond`|유저 답변 처리 + 다음 발화|`{ message, audioBase64 }`|
|`hint`|모범 답안 실시간 생성|`{ hint }` — 순수 텍스트|
|`skip`|질문 건너뛰기 + 다음 질문|`{ message, audioBase64 }`|
|`evaluate`|면접 평가 + 리포트 저장|`{ reportJson }`|

> **`reevaluate`는 존재하지 않는다.** v3.5 문서에 기재됐으나 구현되지 않았다.

### 5.2 기타 API Route

|경로|메서드|역할|maxDuration|
|---|---|---|---|
|`/api/resume/generate`|POST|이력서 4단계 생성 파이프라인 (§11.3)|300|
|`/api/resume/submitted/[id]`|DELETE|제출용 이력서 삭제 (소유자 검증)|기본값|
|`/api/transcribe`|POST|STT: webm 오디오 → 한국어 텍스트 (서버 키 고정)|기본값|
|`/api/tts`|POST|TTS: 텍스트 → WAV 반환 (서버 키 고정)|기본값|

### 5.3 Route Segment Config

|경로|설정|이유|
|---|---|---|
|`/api/interview`|`maxDuration = 300`|evaluate의 질문별 병렬 호출 + 요약|
|`/api/resume/generate`|`maxDuration = 300`|4단계 순차 LLM 호출|
|`/interview/page.tsx`|`maxDuration = 60`|`ensureNormalizedAction` 동기 normalize 보장|
|`/resume/page.tsx`|`maxDuration = 60`|업로드 + 백그라운드 `after()` 콜백 lifecycle 보장|

> **확인 필요:** 두 API Route의 `maxDuration = 300`은 문서 전반이 전제해온 "Vercel 무료 티어 60초"와 어긋난다. 현재 배포 플랜·런타임에서 실제 허용되는 상한을 확인하고, 300이 적용되지 않는다면 `EVAL_BUDGET_MS`(240초)와 이력서 4단계 파이프라인을 재설계해야 한다.

### 5.4 Server Actions

**`(main)/interview/actions.ts`**

|함수|역할|
|---|---|
|`createInterviewSessionAction()`|세션 생성 (title, jdText, persona, durationMinutes, resumeIds, submittedResumeId)|
|`updateSessionStatusAction()`|세션 상태 변경 (in_progress / completed / abandoned)|
|`saveRemainingSecondsAction()`|남은 시간 DB 저장|
|`saveAnalysisAction()`|분석 결과 저장|
|`deleteInterviewSessionsAction()`|세션 삭제|

**`(main)/resume/actions.ts`**

|함수|역할|
|---|---|
|`getUploadUrlAction()`|메타데이터 검증 후 Supabase Presigned URL 발급|
|`processUploadedDocumentAction()`|Storage download → unpdf 파싱 → DB 저장(`normalize_status='pending'`). normalize는 `after()` 콜백|
|`deleteDocumentAction()`|DB + Storage 동시 삭제|
|`revalidateDocumentsAction()`|`/resume` revalidate|
|`retryNormalizeAction(documentId)`|카드 재시도 버튼용. 단일 문서 동기 normalize|
|`ensureNormalizedAction(documentIds[])`|인터뷰 시작 가드. 미완료 문서 순차 동기 normalize. `{ ready, failed }` 반환|
|`getNormalizeStatusesAction(documentIds[])`|Polling용 상태 조회|

> **`saveGitLinkAction` 제거됨 (v4.0).** Git 링크 입력 기능이 삭제되었다.

**`(main)/resume/master/actions.ts`** — v4.0

|함수|역할|
|---|---|
|`saveMasterResumeAction(data)`|마스터 이력서 upsert → `/resume`, `/resume/master` revalidate|
|`deleteMasterResumeAction()`|마스터 이력서 삭제|

**`(main)/settings/actions.ts`**

|함수|역할|
|---|---|
|`getApiSettingsAction()`|현재 설정 조회 (키 마스킹, 모델명만 반환)|
|`saveApiKeyAction(apiKey, model)`|`validateGeminiApiKey()` 통과 시 AES-256 암호화 → upsert|
|`updateModelAction(model)`|모델만 변경|
|`deleteApiKeyAction()`|`api_key_enc = null`, 모델 기본값 복귀|
|`updateDisplayNameAction(name)`|표시명 변경|
|`deleteAccountAction()`|계정 삭제|

**기타** — `(main)/profile/actions.ts`: `saveProfileAction()` / `(main)/persona/actions.ts`: `savePersonaSettingAction()`

---

## 6. BYOK (Bring Your Own Key)

### 6.1 지원 모델 (`src/lib/models.ts`)

|모델 ID|이름|비고|
|---|---|---|
|`gemini-2.5-flash`|Gemini 2.5 Flash (기본)|서버 키, 무료|
|`gemini-2.5-pro`|Gemini 2.5 Pro|사용자 키 필요|
|`gemini-3.1-pro-preview`|Gemini 3.1 Pro Preview|사용자 키 필요|

### 6.2 키 적용 우선순위 (`src/lib/ai-config.ts`)

```typescript
export const DEFAULT_MODEL = "gemini-2.5-flash";

export async function getUserAiConfig(userId: string): Promise<AiConfig> {
  // user_api_settings에 api_key_enc 있음 → decrypt() 후 사용자 키 + 저장된 모델
  // 없음 → env.googleApiKey + DEFAULT_MODEL
}
```

**적용 범위:** 분석 · 힌트 · 평가 · 이력서 생성. 면접관 ADK 에이전트는 서버 키 고정(§3.2 주의), TTS/STT/Normalize도 서버 키 고정.

### 6.3 암호화 (`src/lib/crypto.ts`)

AES-256-GCM. 저장 형식 `ivHex:tagHex:encryptedHex`. 키는 `ENCRYPTION_KEY`(32바이트 hex) 서버 환경변수.

### 6.4 저장 전 유효성 검사

```
saveApiKeyAction
  → validateGeminiApiKey(apiKey)
      → GET https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}
          ├─ 200 OK → encrypt() → upsert(onConflict: user_id)
          └─ 그 외  → "유효하지 않은 API 키" 반환 (저장 안 됨)
```

---

## 7. 음성 기능 (TTS / STT)

### 7.1 TTS

```typescript
// lib/tts.ts
export async function generateTtsBase64(text: string): Promise<string | null>
```

- 모델 `gemini-2.5-flash-preview-tts`, 음성 `Kore`
- 24000Hz 모노 16bit PCM → WAV 헤더 추가 → base64
- 재생 속도 1.3× (클라이언트 `audio.playbackRate`)
- **non-critical**: 실패 시 `null`, 면접 중단 없음
- TTS 생성과 메시지 DB 저장은 `Promise.all` 병렬

### 7.2 STT

```
MediaRecorder (audio/webm;codecs=opus)
  └─ /api/transcribe 전송
  └─ MIME에서 코덱 제거 (audio/webm;codecs=opus → audio/webm)
  └─ gemini-2.5-flash 전사 → 답변창 자동 입력
```

### 7.3 환경설정 (`/preferences`)

마이크/스피커 장치 선택(MediaDevices API), 음량 슬라이더, 마이크 테스트 레벨 미터(`LEVEL_BARS = 30`), 권한 미허용 시 목록 비활성화.

---

## 8. 상태 관리

### 8.1 면접 세션 상태

```
[브라우저 메모리]
├─ secondsLeft / messages / isPlaying / ttsEnabled / 각종 로딩 상태

[Supabase DB — Server Actions 호출 시점]
├─ 면접 시작    → createSession() — started_at, 설정값
├─ 매 답변 완료 → createMessage() — content + kind
├─ 면접 종료    → updateSession(status: "completed")
├─ 이탈·일시정지 → saveRemainingSecondsAction()
└─ 리포트 생성  → interview_reports upsert
```

### 8.2 타이머

클라이언트 `setInterval` 1초 카운트다운. 초기값 `session.remaining_seconds ?? totalSeconds`. 0 도달 시 자동 `completed` + 종료 다이얼로그.

### 8.3 이어하기

```
이탈 → handleExit() → clearInterval() + saveRemainingSecondsAction() → router.push("/interview")
재접속 → in_progress 세션 진입 → remaining_seconds로 타이머 복원
       → Supabase messages에서 대화 복원 → ensureAdkSession()으로 ADK 재구성
```

> **`beforeunload` / `visibilitychange` 핸들러는 없다.** 이탈 저장은 `handleExit()` 명시 호출 경로에서만 일어난다. 유효 기간(24시간) 만료 로직도 없다.

---

## 9. 문서 파싱 및 normalize

### 9.1 업로드 흐름 (Presigned URL)

```
1. 클라이언트 → getUploadUrlAction() → Presigned URL 발급 (mimeType·size 검증)
2. 클라이언트 → Supabase Storage 직접 업로드 (Vercel 미경유)
3. 클라이언트 → processUploadedDocumentAction() → Storage download → unpdf 파싱 → DB 저장
4. after() → runNormalize → status='done' | 'failed'
```

- 허용 형식: `application/pdf`만
- 크기 상한: `resume` 10MB / `portfolio` 20MB
- `storagePath.startsWith(`${user.id}/`)` 검증으로 타 사용자 경로 접근 차단
- Storage 경로: `{user_id}/{document_id}`
- `parsed_text` 최대 200,000자

### 9.2 파싱 실패 처리

```
├─ Storage.download() 실패 → Storage cleanup + 명시적 에러
├─ parsedText === "" → Storage cleanup + "PDF에서 텍스트를 추출할 수 없습니다.
│                       스캔본/이미지 PDF는 지원하지 않습니다" 에러
├─ createDocument(normalize_status='pending')
└─ after(() => runNormalize → status='done'|'failed')
```

### 9.3 Normalize

|항목|값|
|---|---|
|모델|`gemini-2.5-flash-lite` (`NORMALIZE_MODEL`)|
|Background timeout|`BACKGROUND_NORMALIZE_TIMEOUT_MS = 55_000`|
|Sync timeout|`SYNC_NORMALIZE_TIMEOUT_MS = 55_000`|
|호출 시점|업로드 `after()` / 카드 재시도(`retryNormalizeAction`) / 인터뷰 시작 가드(`ensureNormalizedAction`)|

```
pending --(성공)--> done
       \--(timeout/error)--> failed --(retry/ensure)--> pending → done|failed
```

**모델 분리 이유:** 16K자 포트폴리오 + flash → 응답 45s+ → AbortError. flash-lite는 latency 1/2~1/3. normalize는 텍스트 재구성 작업이라 lite 품질로 충분.

> **잔재:** `DocumentType`에 `'git'`이 남아 있고 `MAX_SIZE_BYTES.git = 0`, `upsertGitDocument()`도 남아 있으나 **호출부가 없다** (dead code).

---

## 10. 메시지 kind 시스템

`[모범 답안]` / `[질문 건너뛰기]` 텍스트 마커는 폐기되었고 `interview_messages.kind` 컬럼으로 대체되었다.

|kind|저장 주체|의미|평가 영향|
|---|---|---|---|
|`answer`|respond 핸들러|일반 사용자 답변|정상 평가|
|`hint_shown`|respond 핸들러 (힌트 사용 후)|힌트 참조 후 제출한 답변|각 축 최대 30점 cap (서버 강제)|
|`skipped`|skip 핸들러|건너뛴 질문 (content 빈 문자열)|0점, total_score 제외|
|`interviewer`|analyze/respond/skip 핸들러|면접관 발화|평가 제외|

- `QaGroup.used_hint` = `kind === 'hint_shown'`, `QaGroup.skipped` = `kind === 'skipped'`
- 텍스트 파싱이나 LLM 호출 없이 DB 값에서 직접 결정
- `InterviewMessage.kind`는 `MessageKind | null` — null은 컬럼 도입 이전 레거시 행
- 마이그레이션 `20260519080147_add_message_kind.sql`이 컬럼 추가 + 기존 마커 백필·제거

---

## 11. 이력서 시스템 — v4.0

### 11.1 구성

```
master_resumes (유저당 1개)
  └─ 7개 섹션 JSONB — basics / experiences / projects / skills / educations / activities / self_intro_memo

submitted_resumes (JD별 N개)
  └─ company_name · position · jd_text
  └─ content_json  — 구조화 이력서 (SubmittedResumeContent)
  └─ content_md    — 레거시 마크다운 (신규 생성 시 빈 문자열)
  └─ analysis_json — ResumeAnalysis
```

### 11.2 타입 (`src/lib/types/master-resume.ts`)

```typescript
ResumeBasics      { name, email, phone, website, summary }
ResumeExperience  { id, company, position, start_date, end_date, is_current, description, leave_reason }
ResumeProject     { id, name, company, start_date, end_date, description, decisions, achievement, contribution, tech_stack }
ResumeSkills      { hard: string[], soft: string[] }
ResumeEducation   { id, school, major, degree, start_date, end_date, entry_type, status }
ResumeActivity    { id, title, issuer, date, description }

ResumeAnalysis    { keyword_mapping: [{keyword, found_in}],
                    highlights:      [{item, reason}],
                    missing_items:   [{item, recommendation}] }

SubmittedResumeContent = MasterResume의 섹션들 + summary?: string   // summary는 optional
```

- `degree`: `고등학교 | 전문학사 | 학사 | 석사 | 박사 | 기타`
- `status`: `졸업 | 중퇴 | 재학중` / `entry_type`: `입학 | 편입`
- 날짜는 `YYYY-MM` 문자열 (월 단위 피커)

### 11.3 생성 파이프라인 — `POST /api/resume/generate`

```
인증 → 입력 검증(company_name·position·jd_text 필수, 없으면 400)
     → getMasterResume(user.id)  — 없으면 422
     → getUserAiConfig(user.id)  — BYOK 적용

1단계  buildJdAnalysisPrompt()    → JdAnalysis        실패 시 502 "JD 분석에 실패했습니다"
2단계  buildFilterPrompt()        → FilteredContent   실패 시 502 "이력서 필터링에 실패했습니다"
3단계  buildRewritePrompt()       → RewrittenContent  실패 시 502 "문장 변환에 실패했습니다"
4단계  buildFinalResumePrompt()   → raw               실패 시 502 "최종 이력서 생성에 실패했습니다"

4단계 출력 파싱: ---RESUME_JSON--- … ---ANALYSIS--- … 구분자
  ├─ RESUME_JSON 블록 파싱 성공 → content_json
  └─ 실패 → 3단계 결과(RewrittenContent)를 그대로 사용 (canonical fallback)
  ├─ ANALYSIS 블록 파싱 성공 → analysis_json
  └─ 실패 → 빈 분석으로 저장 (hard failure 아님)

→ createSubmittedResume({ content_md: "", content_json, analysis_json })
→ { id } 반환
```

**호출 재시도:** `callGemini()`가 단계마다 최대 3회. 실패 시 `1000ms × attempt` 대기 후 재시도. Gemini REST 직접 호출(ADK 미사용).

### 11.4 면접 컨텍스트 주입

`/api/interview`가 매 요청에서 병렬로 로드한 뒤 `resumeTexts`를 우선순위로 조립한다.

```
[제출용 이력서 - {회사명} {포지션}]   ← content_json 있으면 serializeSubmittedResume()
                                      없으면 content_md 폴백
[마스터 이력서]                       ← 경력 또는 프로젝트가 1개 이상일 때만
[이력서: {파일명}] / [포트폴리오: …]  ← normalized_text ?? parsed_text
```

- `serializeMasterResume(input)` / `serializeSubmittedResume(content)` — `src/lib/utils/serializeMasterResume.ts`
- **JD 맞춤 요약 위치:** 생성기가 LLM 출력을 그대로 저장해 스키마가 강제되지 않는다. 실제 데이터는 최상위 `summary` 대신 `basics.summary`에 들어가는 경우가 있어, 뷰어·직렬화 모두 **최상위 → basics 순 폴백**으로 읽고 basics에서 끌어올린 경우 본문 '소개' 항목을 생략한다

### 11.5 쿼리 (`src/lib/supabase/queries/master-resume.ts`)

`getMasterResume` / `upsertMasterResume` / `deleteMasterResume` / `getSubmittedResumes` / `getSubmittedResume` / `createSubmittedResume` / `deleteSubmittedResume`

### 11.6 화면

|경로|역할|
|---|---|
|`/resume`|서류 관리 허브 — 마스터 이력서 카드 / 제출용 이력서 목록 / 업로드 문서 섹션|
|`/resume/master`|마스터 이력서 편집 폼 (`MasterResumeForm`, 섹션별 작성 완료 표시)|
|`/resume/submitted/[id]`|제출용 이력서 뷰어 — 경력 하위에 동일 회사 프로젝트 통합, 미매칭은 "기타 프로젝트"|
|`/interview?submittedResumeId=…`|제출용 이력서를 고정한 채 면접 설정 진입|

---

## 12. 평가 파이프라인

> v3.5 문서는 이 파이프라인을 Zod · `p-limit` · Gemini structured output · `src/lib/evaluation/{schema,run}.ts` 구성으로 기술했으나 **실제 구현은 다르다.** 아래가 실제다.

### 12.1 구성 파일

|파일|역할|
|---|---|
|`src/lib/evaluation/parse.ts`|런타임 타입 검증. `parseQuestionEvaluation` / `parseSkippedModelAnswer` / `parseSummaryEvaluation`, `InvalidEvaluationError`|
|`src/lib/evaluation/postprocess.ts`|결정론적 후처리. `HINT_SCORE_CAP` / `applyHintCap` / `applyAnsweredOverrides` / `buildSkippedAnswer` / `buildFailedAnswer` / `computeTotalScore` / `countByStatus`|
|`src/lib/evaluation/concurrency.ts`|`mapWithConcurrency(items, limit, task)` — 자체 구현 (외부 의존성 없음)|
|`src/lib/utils/withDeadline.ts`|`withDeadline(promise, ms, label)`, `DeadlineExceededError`|
|호출·재시도 오케스트레이션|`src/app/api/interview/route.ts`에 인라인 (`run.ts` 없음)|

**Zod 미사용.** `parse.ts`가 수동 타입 가드(`isScore`, `isStringArray` 등)로 검증하고, 실패 시 `InvalidEvaluationError`를 throw해 호출자의 재시도 루프가 네트워크 실패와 동일하게 취급한다.
**Gemini structured output(`responseSchema`) 미사용.** `runOneShot` + `extractJson` 후 파싱한다.

### 12.2 실행 흐름

```
QaGroup[] 조립 (question_id 기준 그룹핑, kind로 used_hint/skipped 판정)
  │
Stage 1: mapWithConcurrency(qaGroups, EVAL_CONCURRENCY=4, evaluateOneGroup)
  └─ skipped 그룹  → buildSkippedModelAnswerPrompt() → buildSkippedAnswer()
  │                   (모범 답안 호출 실패해도 레코드는 생성)
  └─ 그 외         → buildQuestionEvaluationPrompt() → 최대 3회 재시도
                      ├─ 성공 → parseQuestionEvaluation()
                      │          → used_hint ? applyHintCap() : applyAnsweredOverrides()
                      └─ 3회 실패 or 예산 소진 → buildFailedAnswer()
  │
computeTotalScore(questionResults)   ← skipped·failed 제외 평균, 서버 산술
  │
Stage 2: buildSummaryEvaluationPrompt() → 최대 3회 재시도 → parseSummaryEvaluation()
  └─ 3회 실패 시 500 (리포트 미생성)
  │
reportJson 조립 → interview_reports.upsert({ onConflict: "session_id" })
```

### 12.3 타임아웃 예산

|상수|값|의미|
|---|---|---|
|`EVAL_CONCURRENCY`|4|동시 실행 상한|
|`ONESHOT_TIMEOUT_MS`|45,000|호출 1회 대기 상한|
|`EVAL_BUDGET_MS`|240,000|evaluate 핸들러 전체 wall-clock 예산|

- 호출별 상한 = `Math.min(ONESHOT_TIMEOUT_MS, remainingBudgetMs())` — 재시도가 예산을 넘지 못한다
- 예산 소진 후 남은 질문은 재시도하지 않고 `failed` 카드로 degrade
- `withDeadline`은 **호출자의 대기 시간만 제한**한다. ADK Runner가 AbortSignal을 노출하지 않아 실제 Gemini 호출은 계속 진행된다

### 12.4 서버 결정 사항

|항목|규칙|
|---|---|
|`average`|`Math.round((logic + specificity + job_fit) / 3)` — LLM 값 무시하고 재산출|
|`total_score`|skipped·failed 제외 평균 — 서버 산술|
|힌트 cap|`HINT_SCORE_CAP = 30`, 각 축 `Math.min(score, 30)` 후 average 재계산. LLM이 초과하면 `console.warn`으로 prompt drift 경보|
|`AnswerStatus`|`answered` / `hint_shown` / `skipped` / `failed` — 서버가 결정해 `report_json`에 저장|

> **리포트 UI는 `status`를 사용하지 않는다.** 클라이언트 타입 `AnswerReport`(`src/lib/supabase/queries/reports.ts`)에 `status` 필드가 없고 `ReportView`도 읽지 않는다. 힌트 사용·건너뜀·평가 실패 답변이 화면에서 정상 답변과 구분되지 않는다. **단건 재평가 엔드포인트도 없다.** 두 항목은 한 세트로 남은 작업이다.

### 12.5 테스트

Vitest. `npm run test`. 5개 파일 62 케이스 — `evaluation/{parse,postprocess,concurrency}.test.ts`, `utils/{withDeadline,serializeMasterResume}.test.ts`.

> `scripts/eval-consistency.ts`, `CHANGELOG.md`, `TODOS.md`는 존재하지 않는다. `package.json` 버전은 `0.1.0`이다.

---

## 13. Supabase DB 스키마

### 13.1 테이블

```sql
-- 유저 문서 (resume / portfolio)
user_documents
├─ id uuid PK
├─ user_id uuid → auth.users
├─ type text CHECK ('resume' | 'portfolio')   ← 코드의 DocumentType에는 'git'이 남아 있으나 미사용
├─ file_url text          ← Storage 경로
├─ file_name text         ← 원본 파일명 (※ 생성 마이그레이션 없음, §13.4)
├─ parsed_text text       ← unpdf 추출 텍스트 (최대 200,000자)
├─ normalized_text text   ← Gemini로 정제된 텍스트
├─ normalize_status text NOT NULL DEFAULT 'pending' CHECK ('pending'|'done'|'failed')
├─ created_at / updated_at timestamptz
└─ INDEX user_documents_normalize_status_idx (user_id, normalize_status)

-- 면접 세션
interview_sessions
├─ id uuid PK
├─ user_id uuid → auth.users
├─ title text
├─ jd_text text
├─ persona text CHECK ('explorer' | 'pressure' | 'technical')
├─ duration_minutes integer
├─ remaining_seconds integer
├─ resume_ids uuid[]
├─ analysis_json jsonb
├─ adk_session_id uuid
├─ submitted_resume_id uuid → submitted_resumes(id) ON DELETE SET NULL   ← v4.0
├─ started_at / ended_at timestamptz
├─ status text CHECK ('in_progress' | 'completed' | 'abandoned')
└─ created_at timestamptz

-- 대화 이력
interview_messages
├─ id uuid PK
├─ session_id uuid → interview_sessions
├─ role text CHECK ('interviewer' | 'user')
├─ content text                ← 답변 원문만. 마커 금지
├─ kind text NOT NULL DEFAULT 'answer'
│     CHECK ('answer' | 'hint_shown' | 'skipped' | 'interviewer')
├─ depth integer DEFAULT 0
├─ question_id text            ← 꼬리질문은 부모 question_id 상속
└─ created_at timestamptz

-- 리포트
interview_reports
├─ id uuid PK
├─ session_id uuid → interview_sessions
├─ total_score integer
├─ summary text
├─ report_json jsonb
├─ created_at timestamptz
└─ UNIQUE INDEX (session_id)

-- 유저 프로필
user_profiles
├─ id uuid PK / user_id uuid → auth.users (UNIQUE)
├─ job_category text / years_of_experience integer
├─ tech_stack text[] / skills text[]
├─ email text / name text                      ← 20260401000002
└─ created_at / updated_at timestamptz

-- 페르소나 커스텀 지침
user_persona_settings
├─ id uuid PK / user_id uuid → auth.users
├─ persona text CHECK ('explorer' | 'pressure' | 'technical')
├─ custom_instructions text NOT NULL DEFAULT ''
├─ updated_at timestamptz
└─ UNIQUE(user_id, persona)

-- 사용자 API 설정 (BYOK)
user_api_settings
├─ id uuid PK / user_id uuid → auth.users NOT NULL (UNIQUE)
├─ model text NOT NULL DEFAULT 'gemini-2.5-flash'
├─ api_key_enc text            ← AES-256-GCM. null이면 서버 기본 키
└─ updated_at timestamptz

-- 마스터 이력서 (v4.0)
master_resumes
├─ id uuid PK
├─ user_id uuid → auth.users (UNIQUE)
├─ basics jsonb NOT NULL DEFAULT '{}'
├─ experiences / projects / skills / educations / activities jsonb NOT NULL DEFAULT '[]'
├─ self_intro_memo text NOT NULL DEFAULT ''    ← 이력서 출력물에 미포함
└─ created_at / updated_at timestamptz

-- 제출용 이력서 (v4.0)
submitted_resumes
├─ id uuid PK
├─ user_id uuid → auth.users
├─ company_name / position / jd_text text NOT NULL DEFAULT ''
├─ content_md text NOT NULL DEFAULT ''         ← 레거시. 신규 생성은 빈 문자열
├─ content_json jsonb NULL                     ← canonical (20260616000001)
├─ analysis_json jsonb NOT NULL DEFAULT '{}'
└─ created_at timestamptz
```

### 13.2 RLS

모든 테이블에 적용. `master_resumes` / `submitted_resumes`는 `auth.uid() = user_id`, 메시지·리포트는 세션 소유권 서브쿼리.

|테이블|정책명|
|---|---|
|user_documents|own documents only|
|interview_sessions|own sessions only|
|interview_messages|own messages only|
|interview_reports|own reports only|
|user_profiles|own profile only|
|user_persona_settings|own persona settings only|
|user_api_settings|own api settings only|
|master_resumes|own master_resumes only|
|submitted_resumes|own submitted_resumes only|

### 13.3 마이그레이션 (13개, 시간순)

```
20260327000001_initial_schema.sql
20260331000001_add_title_to_sessions.sql
20260331000002_add_persona_settings.sql
20260401000001_add_user_api_settings.sql
20260401000002_add_email_name_to_profiles.sql
20260403000001_add_normalized_text.sql
20260403000002_add_technical_persona.sql
20260517000001_add_normalize_status.sql
20260519080147_add_message_kind.sql
20260520114921_add_interview_reports_session_unique.sql
20260611000001_add_resume_tables.sql                       ← v4.0
20260615000001_add_submitted_resume_id_to_sessions.sql     ← v4.0
20260616000001_add_content_json_to_submitted_resumes.sql   ← v4.0
```

### 13.4 스키마 정합성 미해결

마이그레이션 파일 없이 원격 DB에만 존재하는 것으로 보이는 항목. 신규 환경 재현이 불가능하다.

- `user_documents.file_name` — initial_schema에 없고 추가 마이그레이션도 없음
- `user_profiles` 테이블 자체 — 생성 마이그레이션 없음 (`20260401000002`는 컬럼 추가만)
- `initial_schema`의 `interview_sessions.persona` CHECK가 `('startup','enterprise','pressure')` — `20260403000002`가 교체하므로 최종 상태는 정상이나, 초기 파일은 사용하지 않는 값을 담고 있음

---

## 14. 프롬프트 구조

> 📎 상세 설계는 [[Agents Prompt]] 참고.

|프롬프트|빌더 함수|파일|출력 형식|
|---|---|---|---|
|분석|`buildAnalysisPrompt()`|`prompts/analysis.ts`|JSON (`AnalysisOutput`)|
|면접관 시스템|`buildInterviewSystemPrompt()`|`prompts/interview.ts`|시스템 프롬프트 텍스트|
|첫 질문|`buildFirstQuestionPrompt()`|`prompts/interview.ts`|JSON|
|유저 답변|`buildRespondPrompt()`|`prompts/interview.ts`|JSON|
|건너뛰기|`buildSkipPrompt()`|`prompts/interview.ts`|JSON|
|힌트|`buildHintPrompt()`|`prompts/interview.ts`|순수 텍스트|
|질문 단건 평가|`buildQuestionEvaluationPrompt({ qaGroup, resumeTexts, jdKeywords })`|`prompts/evaluation.ts`|JSON (`QuestionEvaluationResult`)|
|건너뛴 질문 모범답안|`buildSkippedModelAnswerPrompt({ qaGroup, resumeTexts })`|`prompts/evaluation.ts`|JSON (`SkippedModelAnswerResult`)|
|종합 요약|`buildSummaryEvaluationPrompt({ questionResults, analysisJson, resumeTexts, totalScore, hintCount, skippedCount, failedCount })`|`prompts/evaluation.ts`|JSON (`SummaryEvaluationResult`)|
|Normalize|`buildNormalizePrompt()`|`prompts/normalize.ts`|순수 마크다운|
|이력서 — JD 분석|`buildJdAnalysisPrompt(company, position, jd)`|`prompts/resume-generate.ts`|JSON (`JdAnalysis`)|
|이력서 — 필터링|`buildFilterPrompt(masterResume, jdAnalysis)`|`prompts/resume-generate.ts`|JSON (`FilteredContent`)|
|이력서 — 재작성|`buildRewritePrompt(masterResume, filtered, jdAnalysis, company, position)`|`prompts/resume-generate.ts`|JSON (`RewrittenContent`)|
|이력서 — 최종/분석|`buildFinalResumePrompt(rewritten, jdAnalysis, company, position)`|`prompts/resume-generate.ts`|`---RESUME_JSON---` / `---ANALYSIS---` 구분자 텍스트|

**JSON 파싱 주의:** Gemini가 마크다운 코드 펜스로 JSON을 감싸는 경우가 있어 `extractJson(raw)`로 펜스를 제거한 뒤 파싱한다.

---

## 15. 성능

|항목|내용|대응|
|---|---|---|
|Gemini API 레이턴시|프록시 경유 추가 지연|TTS 생성과 메시지 저장 `Promise.all` 병렬|
|Vercel 콜드 스타트|InMemorySessionService 초기화|`ensureAdkSession()` 최근 30개 메시지 재구성|
|평가 총 소요|질문 수만큼 LLM 호출|동시성 4 + 호출별 45초 + 전체 예산 240초|
|이력서 생성 소요|4단계 **순차** LLM 호출|현재 대응 없음. 단계 병합·모델 경량화 검토 필요|
|Server Action 파일 크기|Next.js 기본 4MB 제한|`serverActions.bodySizeLimit: "21mb"` + `proxyClientMaxBodySize`|
|Vercel 요청 바디 4.5MB|대용량 PDF 업로드 413|Presigned URL로 Vercel 미경유 직접 업로드|
|Supabase DB 쓰기|무료 티어 API 제한|답변 완료 단위로만 저장|
|Storage 용량|무료 티어 1GB|Cloudflare R2 마이그레이션 검토|
|업로드 응답 지연|큰 PDF normalize 동기 호출 30~60s|`after()` 분리 → 응답 ~5s|

> **스트리밍 미구현.** v3.5 이하 문서는 "스트리밍 응답 필수(`text/event-stream`)"로 기술했으나 모든 API Route가 `Response.json()` 일괄 응답이다. 클라이언트 타이프라이터 UX도 없다.

---

## 16. 보안

|항목|처리 방식|
|---|---|
|서버 Gemini API 키|`GOOGLE_API_KEY` 서버 환경변수 전용, `lib/env.ts` 중앙 관리|
|사용자 API 키 저장|AES-256-GCM 암호화 후 저장(`api_key_enc`). 평문 저장 금지|
|암호화 키|`ENCRYPTION_KEY` 서버 환경변수 전용|
|복호화 위치|서버(`ai-config.ts`)에서만. 클라이언트에 평문 키 전달 금지|
|클라이언트 AI 직접 호출|금지 — API Route 경유|
|API Route 인증|모든 요청에서 `getUser()` → 리소스 소유자 검증 (`/api/resume/submitted/[id]`는 403 분기)|
|유저 문서 접근|Supabase RLS + Storage 경로 `{user_id}/{document_id}` 격리|
|Presigned URL|`storagePath.startsWith(`${user.id}/`)` 검증|
|문서 삭제|DB record + Storage file `Promise.all` 동시 삭제|
|파일 업로드|PDF 전용, 이력서 10MB·포트폴리오 20MB, Server Action 검증|
|Empty text PDF|업로드 단계 명시적 거부 + Storage cleanup|
|OAuth|Supabase Auth 위임, Middleware에서 세션 갱신|
|Privacy Policy|사용자 API 키·이력서 원문 서버 저장 사실을 약관·Privacy Policy에 명시 필요|

---

## 17. 신규 / 수정 파일 (v4.0)

|구분|파일|내용|
|---|---|---|
|신규|`src/lib/types/master-resume.ts`|이력서 도메인 타입 전체|
|신규|`src/lib/supabase/queries/master-resume.ts`|마스터·제출용 이력서 쿼리 7개|
|신규|`src/lib/prompts/resume-generate.ts`|4단계 프롬프트 빌더|
|신규|`src/lib/utils/serializeMasterResume.ts`|`serializeMasterResume` / `serializeSubmittedResume`|
|신규|`src/lib/utils/withDeadline.ts`|호출 대기 상한|
|신규|`src/app/api/resume/generate/route.ts`|생성 파이프라인|
|신규|`src/app/api/resume/submitted/[id]/route.ts`|삭제 (소유자 검증)|
|신규|`src/app/(main)/resume/master/{page,actions}.ts(x)`|마스터 이력서 편집|
|신규|`src/app/(main)/resume/submitted/[id]/page.tsx`|제출용 이력서 뷰어|
|신규|`src/components/resume/master/{MasterResumeForm,MasterResumeCard}.tsx`|편집 폼 / 카드|
|신규|`src/components/resume/submitted/{GenerateResumeButton,GenerateResumeDialog,SubmittedResumeCard,SubmittedResumeViewer}.tsx`|생성·목록·뷰어|
|신규|`src/components/ui/{markdown-editor,markdown-preview,month-picker,inline-input,label}.tsx`|tiptap 기반 입력 컴포넌트|
|신규|마이그레이션 3개|§13.3 참조|
|수정|`src/app/api/interview/route.ts`|`maxDuration=300`, resumeTexts 우선순위 주입, 평가 파이프라인 인라인화|
|수정|`src/lib/prompts/evaluation.ts`|단건/요약/건너뛰기 프롬프트 3종 분리|
|수정|`src/components/interview/NewInterviewDialog.tsx`|제출용 이력서 선택 + JD 자동 채움|
|수정|`src/app/(main)/resume/page.tsx`|서류 관리 허브로 재구성|
|삭제|`src/components/resume/GitLinkSection.tsx`|Git 링크 기능 제거|
|삭제|`saveGitLinkAction` (resume/actions.ts)|동상|

---

## 18. 버전별 주요 변경

|항목|v2.0|v3.0|v3.3|v3.5|**v4.0**|
|---|---|---|---|---|---|
|AI 모델|gemini-2.5-flash|+BYOK 2종|normalize만 flash-lite 분리|동일|동일|
|평가 방식|runOneShot 단일 호출|동일|동일|질문별 단건 + 동시성 4|+ 타임아웃 예산 240초, 건너뛴 질문 모범답안|
|마커 시스템|텍스트 마커|동일|동일|**kind 컬럼으로 대체**|동일|
|문서 처리|서버 파싱|동일|`after()` 백그라운드 + normalize_status|동일|동일|
|이력서|업로드 PDF만|동일|동일|동일|**마스터/제출용 이력서 + 4단계 생성**|
|Git 링크|README fetch|동일|동일|동일|**기능 제거**|
|DB 테이블|profiles, persona_settings|+api_settings|documents.normalize_status|messages.kind, reports UNIQUE|**+master_resumes, submitted_resumes, sessions.submitted_resume_id**|
|maxDuration|—|—|page 60|동일|**API route 300**|

---

_본 문서는 코드베이스 `main` = b330303 (2026-07-30) 기준 v4.0이다. 문서와 구현이 어긋났던 항목은 §12(평가 파이프라인), §13.4(스키마 정합성), §15(스트리밍)에 명시했다._
