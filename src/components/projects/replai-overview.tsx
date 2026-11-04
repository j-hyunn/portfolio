import type { ReactNode } from 'react'
import {
  Arrow,
  CaseSection as Section,
  MetaRows,
} from '@/components/projects/case-study'

function FlowBox({
  tone = 'muted',
  title,
  note,
}: {
  tone?: 'muted' | 'accent'
  title: string
  note: string
}) {
  const styles =
    tone === 'accent'
      ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-200'
      : 'bg-secondary text-muted-foreground'
  return (
    <div className={`flex-1 rounded-lg px-4 py-3 text-center ${styles}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs opacity-80">{note}</p>
    </div>
  )
}

function Feature({ title, body, why }: { title: string; body: string; why: string }) {
  return (
    <div className="border-border border-t py-3.5 first:border-t-0 first:pt-0">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        {body} <span className="text-blue-700">{why}</span>
      </p>
    </div>
  )
}

const metaRows: { label: string; value: ReactNode }[] = [
  {
    label: 'Role',
    value: '서비스 기획 · 멀티 에이전트 설계 · 바이브 코딩 · 출시 · 운영',
  },
  {
    label: 'Stack',
    value: (
      <div className="flex flex-wrap gap-1.5">
        {['Next.js', 'Google ADK', 'Supabase', 'Vercel', 'Gemini'].map((s) => (
          <span key={s} className="bg-secondary rounded-md px-2 py-0.5 text-xs">
            {s}
          </span>
        ))}
      </div>
    ),
  },
  {
    label: 'Period',
    value: '2026.03 ~ 2026.08 · v4.0 이력서 시스템 2026.07 추가',
  },
  {
    label: 'Links',
    value: (
      <a
        href="https://github.com/j-hyunn/Replai"
        target="_blank"
        rel="noreferrer"
        className="border-border hover:border-blue-400 hover:text-blue-700 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors"
      >
        ↗ GitHub
      </a>
    ),
  },
]

const decisions = [
  {
    title: '폴백 없는 에러 처리',
    body: 'AI 호출이 실패하면 반쪽짜리로 진행하지 않고 즉시 오류를 보여주고 재시도를 유도한다.',
    note: '"불완전한 면접 경험은 실전 대응에 치명적"이라는 원칙. 단 TTS·부분 평가 실패는 예외로 두어 나머지를 살린다.',
  },
  {
    title: 'ADK는 면접관 에이전트에만 적용',
    body: '처음엔 세 에이전트를 모두 ADK로 묶었으나, 대화 세션이 필요한 건 면접관뿐이라 나머지를 분리했다.',
    note: '호출 순서를 코드로 명시 제어 → 경계가 명확해지고 디버깅 효율이 올라감.',
  },
  {
    title: '평가 파이프라인 전면 재설계',
    body: '일괄 호출에서 특정 질문이 조용히 누락되던 문제를 질문별 단건 병렬 호출로 구조적으로 차단했다.',
    note: '평균·총점은 서버가 직접 계산 → LLM 점수 드리프트 차단. 부분 리포트가 무 리포트보다 낫다.',
  },
  {
    title: '제출용 이력서 저장 형식 전환과 그 교훈',
    body: 'content_md → content_json 전환 중, 읽는 쪽을 안 고쳐 제출용 이력서가 면접에 전혀 주입되지 않는 버그가 있었다.',
    note: '교훈: 컬럼을 전환할 때 그 컬럼을 읽는 쪽을 전수 확인해야 한다. 쓰기만 바꾸면 조용히 죽는다.',
  },
  {
    title: '이력서 생성 4단계 분할',
    body: 'JD 맞춤 이력서 생성을 한 번의 호출로 끝내지 않고, 전략 수립 → 필터링 → 재작성 → 분석으로 나눴다.',
    note: '선별과 문체 변환을 섞으면 둘 다 어중간해진다. 대가로 수십 초·비용 4배를 감수.',
  },
]

const metrics = [
  { label: '면접 완주율', value: '65', unit: '%', prefix: '≥ ' },
  { label: '피드백 열람률', value: '75', unit: '%', prefix: '≥ ' },
  { label: '7일 재방문율', value: '30', unit: '%', prefix: '≥ ' },
  { label: '사용자 수 (4주)', value: '100', unit: '명', prefix: '' },
]

export function ReplaiOverview() {
  return (
    <div>
      {/* Hero */}
      <section>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          ◆ Vibe Coding
        </span>

        <div className="mt-5 flex items-baseline gap-3">
          <h1 className="text-4xl font-bold tracking-tight">Replai</h1>
          <span className="text-muted-foreground text-base">리플레이</span>
        </div>

        <p className="mt-4 max-w-xl text-xl leading-relaxed font-medium">
          이력서부터 면접까지,{' '}
          <span className="bg-blue-100/70 text-blue-800">데이터가 끊기지 않는</span> AI 준비 도구
        </p>

        <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
          하나의 마스터 이력서로 회사별 제출용 이력서를 만들고, 그 이력서를 그대로 읽은 AI
          면접관과 모의면접까지 이어서 진행한다. 취업 준비의 두 축인 이력서와 면접을 하나의
          흐름으로 연결한 서비스.
        </p>

        <MetaRows rows={metaRows} />
      </section>

      {/* 01 문제 정의 */}
      <Section
        id="why"
        eyebrow="01 — 문제 정의"
        title="이력서와 면접이 끊어져 있다"
        lead='각각을 돕는 도구는 있지만, "내가 이 회사에 실제로 낸 이력서로 그 회사 면접을 연습한다"는 흐름은 어디에서도 완결되지 않는다.'
      >
        <div className="border-border mt-6 space-y-6 rounded-xl border p-5">
          <div>
            <p className="text-muted-foreground text-xs font-medium">기존 방식</p>
            <div className="mt-3 flex flex-wrap items-stretch gap-2">
              <FlowBox title="이력서 도구" note="회사마다 수동으로 수정" />
              <div className="flex items-center px-1">
                <span className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                  끊김
                </span>
              </div>
              <FlowBox title="면접 도구" note="이력서 맥락 없이 연습" />
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              둘을 잇는 건 사용자의 머릿속뿐 — 반복 노동과 맥락 손실
            </p>
          </div>

          <div className="border-border border-t pt-6">
            <p className="text-xs font-medium text-blue-600">Replai</p>
            <div className="mt-3 flex flex-wrap items-stretch gap-2">
              <FlowBox tone="accent" title="마스터 이력서" note="한 번만 정리" />
              <div className="flex items-center">
                <Arrow tone="accent" />
              </div>
              <FlowBox tone="accent" title="제출용 이력서" note="공고 붙여넣기" />
              <div className="flex items-center">
                <Arrow tone="accent" />
              </div>
              <FlowBox tone="accent" title="AI 면접관" note="그 이력서를 읽음" />
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              하나의 데이터가 이력서 작성부터 면접 질문까지 끊기지 않고 흐른다
            </p>
          </div>
        </div>
      </Section>

      {/* 02 핵심 기능 */}
      <Section
        id="what"
        eyebrow="02 — 핵심 기능"
        title="두 시스템, 하나의 흐름"
        lead="지원 전의 이력서와 서류 합격 후의 면접을 각각 다루되, 같은 데이터로 잇는다."
      >
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="border-border rounded-xl border p-5">
            <p className="font-medium">◫ 이력서 시스템</p>
            <p className="text-muted-foreground mt-1 mb-4 text-xs">
              지원 전 — 한 번 정리해 회사마다 재사용
            </p>
            <Feature
              title="마스터 이력서"
              body="경력·프로젝트·스킬·학력을 7개 섹션으로 구조화."
              why="회사마다 처음부터 쓰지 않기 위한 기준 이력서."
            />
            <Feature
              title="JD 맞춤 제출용 이력서"
              body="공고를 붙여넣으면 핵심 역량 3가지를 도출해 맞는 경험만 선별·재작성."
              why='"골라내기"와 "문장 고치기"를 4단계로 분리.'
            />
            <Feature
              title="이력서 분석 리포트"
              body="JD 키워드 매핑, 강조 포인트, 부족한 항목 제시."
              why="지원 전 보완 지점을 스스로 판단할 근거."
            />
          </div>

          <div className="border-border rounded-xl border p-5">
            <p className="font-medium">◑ 면접 시스템</p>
            <p className="text-muted-foreground mt-1 mb-4 text-xs">
              서류 합격 후 — 그 이력서를 읽은 면접관과 연습
            </p>
            <Feature
              title="맥락 있는 질문 + 꼬리질문"
              body="제출용·마스터 이력서·JD 기반 질문 생성, 답변 깊이에 따라 실시간 추가 질문."
              why="룰 없이 AI가 심층 여부를 직접 판단."
            />
            <Feature
              title="3가지 면접관 페르소나"
              body="탐색형·압박형·기술 검증형 + 커스텀 지침."
              why="목적이 명확한 연습을 위한 스타일 제어."
            />
            <Feature
              title="음성 · 힌트 · 이어하기"
              body="TTS 음성 질문과 마이크 STT 답변, 막히면 이력서 기반 모범 답안 힌트, 이탈해도 남은 시간·대화 복원."
              why="힌트를 쓴 답변은 점수 상한 30점을 서버에서 강제."
            />
            <Feature
              title="3축 평가 리포트"
              body="논리성·구체성·직무 적합성 점수 + 질문별 모범 답안."
              why="이력서에 실제 기재된 내용만 근거."
            />
          </div>
        </div>
      </Section>

      {/* 03 시장 · 포지셔닝 */}
      <Section
        id="market"
        eyebrow="03 — 시장 · 포지셔닝"
        title="포지셔닝 재정의"
        lead="강점이라 믿었던 지점이 이미 경쟁사에 있다는 걸 확인하고, 차별화를 다시 설계했다."
      >
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="border-border rounded-xl border p-5">
            <span className="bg-secondary text-muted-foreground rounded-md px-2.5 py-1 text-xs">
              처음의 포지셔닝
            </span>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              "JD와 이력서를 읽은 AI가 맞춤 질문을 생성한다." 일반 AI 챗봇, 단방향 콘텐츠와
              비교하면 분명한 우위였다.
            </p>
          </div>
          <div className="border-border rounded-xl border p-5">
            <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
              재조사에서 확인한 사실
            </span>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              사람인 AI 모의면접이 면접 축을, 원티드 이력서 코칭이 이력서 축을 이미 커버하고
              있었다. 두 축이 각각 국내 최대 플랫폼과 정면으로 겹쳤다.
            </p>
          </div>
        </div>

        <div className="border-border mt-3 rounded-xl border p-5">
          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
            정직한 결론
          </span>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            개별 기능으로는 우위가 없다고 판단했다. 무료로 같은 기능을 제공하는 플랫폼과 "기능이
            있다"는 메시지로는 경쟁할 수 없었다. 강점을 재발명하는 대신, 남아 있는 공백이 무엇인지부터
            다시 정의했다.
          </p>
        </div>

        <h3 className="mt-8 font-medium">재정의한 차별화</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            {
              n: '01',
              t: '두 축의 데이터 연결',
              d: '마스터 이력서 → JD 맞춤 이력서 → 그 이력서를 읽은 면접관까지 데이터가 끊기지 않는다.',
            },
            {
              n: '02',
              t: '면접관 스타일 제어',
              d: '탐색형·압박형·기술 검증형 3종 + 커스텀 지침. 플랫폼 AI는 단일 스타일이다.',
            },
            {
              n: '03',
              t: '플랫폼 종속 없음 + BYOK',
              d: '어떤 회사 공고든 붙여넣을 수 있고, 자기 API 키로 상위 모델을 쓸 수 있다.',
            },
          ].map((axis) => (
            <div key={axis.n} className="bg-secondary rounded-xl p-4">
              <p className="text-xs font-medium text-blue-600">{axis.n}</p>
              <p className="mt-1.5 text-sm font-medium">{axis.t}</p>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{axis.d}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-8 font-medium">인정한 구조적 열위</h3>
        <ul className="border-border text-muted-foreground mt-3 list-disc space-y-1.5 border-l-2 py-1 pr-0 pl-6 text-sm leading-relaxed">
          <li>원티드가 가진 실제 합격 이력서 데이터가 없다 — JD와 사용자 이력서만 본다.</li>
          <li>연습이 끝나면 지원을 위해 다시 채용 플랫폼으로 돌아가야 한다.</li>
          <li>구직자가 매일 방문하는 유입 경로가 없다.</li>
        </ul>
      </Section>

      {/* 04 설계 */}
      <Section
        id="how"
        eyebrow="04 — 설계"
        title="작업 성격에 맞춰 실행을 나눴다"
        lead="세 에이전트를 같은 방식으로 돌리지 않았다. 대화 세션이 필요한 면접관만 ADK로 유지하고, 나머지는 1회성 호출로 단순화했다."
      >
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="bg-secondary rounded-xl p-5">
            <p className="font-medium">runOneShot</p>
            <p className="text-muted-foreground mt-0.5 text-xs">1회성 호출 · 매번 새 인스턴스</p>
            <div className="mt-4 space-y-2">
              {[
                { t: '분석 에이전트', d: 'JD × 이력서 → 질문 세트 생성' },
                { t: '평가 에이전트', d: '전체 대화 → 3축 리포트 생성' },
                { t: '힌트', d: '온디맨드 모범 답안 생성' },
              ].map((a) => (
                <div key={a.t} className="rounded-lg bg-violet-50 px-3.5 py-2.5">
                  <p className="text-sm font-medium text-violet-900">{a.t}</p>
                  <p className="mt-0.5 text-xs text-violet-800/80">{a.d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 p-5">
            <p className="font-medium text-blue-900">ADK Runner</p>
            <p className="mt-0.5 text-xs text-blue-800/80">세션 유지 · 다중 턴</p>
            <div className="mt-4 rounded-lg bg-white px-4 py-6 text-center ring-1 ring-blue-200">
              <p className="text-sm font-medium text-blue-900">면접관 에이전트</p>
              <p className="text-muted-foreground mt-2 text-xs">페르소나 · 대화 맥락 유지</p>
              <p className="text-muted-foreground text-xs">꼬리질문 여부 직접 판단</p>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          처음엔 3개를 모두 ADK로 묶었으나, 세션이 필요한 건 면접관뿐이라 나머지를 분리 — 코드가
          단순해지고 디버깅이 쉬워졌다.
        </p>

        <h3 className="mt-10 font-medium">이력서 생성 4단계 파이프라인</h3>
        <p className="text-muted-foreground mt-1.5 text-sm">
          AI 호출 한 번으로 끝내지 않고, 전략을 먼저 고정한 뒤 순차로 실행한다.
        </p>
        <div className="mt-4 flex flex-wrap items-stretch gap-2">
          {[
            { n: '1단계', t: 'JD 분석', d: '핵심 역량 3개 고정' },
            { n: '2단계', t: '필터링', d: '맞는 경험만 선별' },
            { n: '3단계', t: '개조식 재작성', d: '문장만 변환' },
            { n: '4단계', t: '분석 생성', d: '키워드·부족 항목' },
          ].map((step, i) => (
            <div key={step.n} className="flex flex-1 items-center gap-2">
              {i > 0 && <Arrow tone="accent" />}
              <div className="flex-1 rounded-lg bg-blue-50 px-3.5 py-3 ring-1 ring-blue-100">
                <p className="text-xs text-blue-700/70">{step.n}</p>
                <p className="mt-1 text-sm font-medium text-blue-900">{step.t}</p>
                <p className="mt-0.5 text-xs text-blue-800/70">{step.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-sm font-medium">나눈 이유</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              선별과 문체 변환을 함께 시키면 둘 다 어중간해진다 — 기준을 먼저 고정.
            </p>
          </div>
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-sm font-medium">트레이드오프</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              순차 호출이라 생성 1건에 수십 초 · 비용 4배. BYOK·횟수 제한이 수익 모델 검토 대상.
            </p>
          </div>
        </div>

      </Section>

      {/* 05 핵심 의사결정 */}
      <Section
        id="decisions"
        eyebrow="05 — 핵심 의사결정"
        title="기록한 37건 중, 다섯"
        lead="각 결정에는 선택 이유와 트레이드오프가 함께 기록돼 있다."
      >
        <div className="mt-6 space-y-2.5">
          {decisions.map((d, i) => (
            <div
              key={d.title}
              className="border-border grid grid-cols-[36px_1fr] rounded-xl border px-5 py-4"
            >
              <span className="text-sm font-medium text-blue-600">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="font-medium">{d.title}</p>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{d.body}</p>
                <p className="text-muted-foreground mt-2 flex gap-1.5 text-xs leading-relaxed">
                  <span className="shrink-0 text-blue-500">›</span>
                  <span>{d.note}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 06 지표 */}
      <Section id="kpi" eyebrow="06 — 지표 · 검증 설계" title="목표와 측정 설계">
        <p className="bg-secondary text-muted-foreground mt-5 flex gap-2 rounded-lg px-4 py-3 text-sm">
          <span className="text-blue-500">◆</span>
          <span>
            아래는 달성 결과가 아니라 <strong className="text-foreground font-medium">정의한 목표치와 측정 설계</strong>다. 측정은 Google
            Analytics + Supabase 직접 쿼리로 병행한다.
          </span>
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="bg-secondary rounded-xl p-4">
              <p className="text-muted-foreground text-xs leading-snug">{m.label}</p>
              <p className="mt-2 text-2xl font-medium">
                {m.prefix}
                {m.value}
                <span className="text-muted-foreground ml-0.5 text-sm font-normal">{m.unit}</span>
              </p>
            </div>
          ))}
        </div>

        <h3 className="mt-8 font-medium">아직 정의되지 않은 지표 (v4.0에서 새로 필요해짐)</h3>
        <ul className="border-border text-muted-foreground mt-3 list-disc space-y-2 rounded-xl border p-5 pl-9 text-sm leading-relaxed">
          <li>
            <strong className="text-foreground font-medium">마스터 이력서 작성 완료율</strong> — 7개
            섹션 입력이 진입 장벽. 여기서 이탈하면 제품 가치가 발생하지 않아, 다른 지표보다
            우선한다.
          </li>
          <li>
            <strong className="text-foreground font-medium">섹션별 이탈 지점</strong> — 어느 섹션에서
            포기하는지. GA 커스텀 이벤트가 필요해 현재 미구현.
          </li>
          <li>
            <strong className="text-foreground font-medium">제출용 이력서 → 면접 전환율</strong> — 두
            축의 "연결"이 실제로 작동하는지 검증하는 핵심 지표.
          </li>
        </ul>
      </Section>
    </div>
  )
}
