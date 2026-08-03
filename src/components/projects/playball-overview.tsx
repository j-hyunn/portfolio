import type { ReactNode } from 'react'
import { Arrow, CaseSection, MetaRows } from '@/components/projects/case-study'

/**
 * 화면 캡처. `src/assets/playball/`에 파일을 넣으면 자동으로 붙고,
 * 파일이 없으면 해당 이미지만 조용히 빠진다.
 */
const screenAssets = import.meta.glob('../../assets/playball/*.{png,webp,jpg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function screenshot(name: string): string | undefined {
  const key = Object.keys(screenAssets).find((path) =>
    /\/([^/]+)\.(png|webp|jpg)$/.exec(path)?.[1] === name,
  )
  return key ? screenAssets[key] : undefined
}

function Figure({ name, caption }: { name: string; caption: string }) {
  const src = screenshot(name)
  if (!src) return null
  return (
    <figure className="border-border mt-4 overflow-hidden rounded-xl border">
      <div className="flex justify-center bg-white p-4 sm:p-6">
        <img src={src} alt={caption} className="block w-full" loading="lazy" />
      </div>
      <figcaption className="border-border text-muted-foreground border-t px-4 py-2.5 text-xs">
        {caption}
      </figcaption>
    </figure>
  )
}

function ScreenBlock({
  label,
  title,
  lead,
  children,
}: {
  label: string
  title: string
  lead: string
  children: ReactNode
}) {
  return (
    <div className="border-border mt-10 border-t pt-8 first:mt-6 first:border-t-0 first:pt-0">
      <p className="text-xs font-medium tracking-wider text-blue-600 uppercase">{label}</p>
      <h3 className="mt-2 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm leading-relaxed">{lead}</p>
      {children}
    </div>
  )
}

/** 온보딩에서 수집하는 조건 묶음 */
const preferenceGroups = [
  {
    tag: 'Required',
    title: '핵심 조건은 추천 결과에 필수 반영',
    items: ['경기관람 위치', '응원하는 구단', '응원석'],
    accent: true,
  },
  {
    tag: 'Optional',
    title: '추가 조건은 가능한 범위 내에서 우선 적용',
    items: ['관람 환경 선호도', '관람 분위기', '시야 선호도', '가격대'],
    accent: false,
  },
]

/** 경기 상세의 추천 모드 분기 */
const bookingModes = [
  {
    title: '구역 추천 ON',
    body: '설정한 선호도에 맞는 구역을 먼저 보여준다. 인근 좌석 추천·인원 수·내 선호 구역을 예매 진입 전에 확정한다.',
    accent: true,
  },
  {
    title: '구역 추천 OFF',
    body: '추천 기능이 비활성화되고 좌석을 직접 선택한다. 기존 좌석맵 방식 그대로 진행된다.',
    accent: false,
  },
]

const DECK_URL =
  'https://www.figma.com/deck/LaRGmGm4ki3R99JBciTnhz/Playball-%EC%B5%9C%EC%A2%85-%EB%B0%9C%ED%91%9C--Copy-?node-id=275-4383&viewport=-419%2C-130%2C0.1&t=cixhaTWunG3Vy57L-1&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1'

const metaRows: { label: string; value: ReactNode }[] = [
  {
    label: 'Role',
    value: '기획 총괄 · 추천/대기열/VQA 정책 설계 · KPI 정의 · 부하테스트 시나리오 설계',
  },
  { label: 'Team', value: '14인 · 8개 직군 크로스펑셔널' },
  { label: 'Period', value: '2026.01 – 2026.04 · KT Cloud Tech UP 1기' },
  {
    label: 'Links',
    value: (
      <a
        href={DECK_URL}
        target="_blank"
        rel="noreferrer"
        className="border-border hover:border-blue-400 hover:text-blue-700 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors"
      >
        ↗ 최종 발표자료
      </a>
    ),
  },
]

const marketStats = [
  { value: '1,200만+', label: '2025 KBO 총 관중 (2년 연속 최다)' },
  { value: '80%+', label: '평균 좌석 점유율' },
  { value: '1,290억', label: '연간 티켓 판매 규모 (평균 16,000원)' },
]

const subStats = [
  { value: '72.5%', label: '19~39세 KBO 팬 중 2차 티켓 구매를 고려한 비율' },
  { value: '26.5%', label: '암표 횡행 원인 1위 — "매크로/봇 차단 기술 부족"' },
]

const asIsChain = ['좌석맵 진입', '동일 핫스팟 확대', '클릭 폭주 · Lock 경합', '락 실패 반복']

const options = [
  {
    title: '완전 자동 배정',
    points: [
      { ok: true, text: '확보 속도는 빠름' },
      { ok: false, text: '어디 앉을지 사전에 알 수 없어 만족도 저하' },
    ],
    win: false,
  },
  {
    title: '완전 수동 선택',
    points: [
      { ok: true, text: '원하는 위치를 직접 선택' },
      { ok: false, text: '경합 실패로 남은 좌석이 흩어져 연석 실패' },
    ],
    win: false,
  },
  {
    title: 'Playball — 블록 추천 + 연석 자동배정',
    points: [
      { ok: true, text: '원하는 구역 + 빠른 확보 + 연석 보장' },
      { ok: true, text: "추천 단위를 '블록'으로 두어 Lock 경합 집중 회피" },
    ],
    win: true,
  },
]

const teamChips = [
  { label: 'PM ×1 · 김제현', me: true },
  { label: 'PD ×2', me: false },
  { label: 'BE ×2', me: false },
  { label: 'FE ×1', me: false },
  { label: 'FS ×1', me: false },
  { label: 'Cloud ×3', me: false },
  { label: 'Security ×3', me: false },
  { label: 'AI ×2', me: false },
]

const myWork = [
  { text: '기획 총괄 — 문제 정의부터 제품 의사결정까지' },
  { text: '정책 설계 — 추천 · 대기열 · VQA · 취소/환불' },
  { text: 'KPI · 측정 구조 정의 — Hold 성공률 증명 설계' },
  { text: '부하테스트 시나리오 설계', note: '실행은 클라우드·백엔드 파트가 담당' },
  { text: '8개 직군 크로스펑셔널 조율' },
]

const teamWork = [
  { text: 'AI 공격·방어 시스템', note: 'AI 파트 — 공격 에이전트 · 행동 스코어링' },
  { text: 'MSA · 성능 최적화', note: '백엔드 · 클라우드 파트' },
  { text: '프론트엔드 구현', note: 'FE · FS 파트' },
  { text: '디자인 시스템 · 화면 설계', note: 'PD 파트' },
]

const techCards = [
  {
    tag: 'AI 파트 구현',
    title: 'AI 공격 · 방어',
    subtitle: '공격자가 되어 방어를 검증한다',
    items: [
      {
        term: '공격 에이전트',
        body: '곡선 궤적·미세 떨림으로 사람을 재현, LLM 코디네이터가 전략을 조정하는 멀티 에이전트',
      },
      {
        term: '실시간 방어',
        body: '행동 지표(마우스 직선도·손떨림·머뭇거림) 스코어링 → Tier T0~T3 대응, 핫패스엔 LLM 미사용',
      },
      { term: '2중 게이트', body: '등급과 무관하게 VQA 관문 필수 통과' },
      { term: '사후 판단', body: 'LLM 재검토 + 5→20→50→100% 점진 적용·자동 롤백' },
    ],
    mine: '봇 차단 부족(팬 인식 26.5%)을 문제로 정의하고, VQA를 발동 시점·재시도·공정성 정책으로 설계',
  },
  {
    tag: '백엔드 · 클라우드 파트 구현',
    title: 'MSA · 성능 최적화',
    subtitle: '추가 인프라 비용 없이 코드·설정으로',
    items: [
      {
        term: '이벤트드리븐 MSA',
        body: 'Kafka 비동기 통신, Istio 서비스 메시, ArgoCD GitOps',
      },
      {
        term: 'Phase 1~4 최적화',
        body: 'Caffeine·Redis 캐시, OSIV off, Redis Lua 원자 연산, Resilience4j',
      },
      {
        term: '동시성 제어',
        body: '블록 단위 분산 락 + WatchDog 자동 연장으로 좌석 탐색 직렬화',
      },
      {
        term: '결과',
        body: 'Queue P99 -87% · 처리량 12.8배 · 5xx 0건 (1,000 VU 부하테스트)',
      },
    ],
    mine: '티켓팅 핵심 경로(Queue·Seat)의 안정성 목표를 정의하고 검증 시나리오를 설계',
  },
]

const loadSteps = [
  { n: '01', title: '성능 목표 정의', who: 'PM', mine: true },
  { n: '02', title: '부하테스트 시나리오 설계', who: 'PM', mine: true },
  { n: '03', title: '테스트 실행 · 최적화', who: '클라우드 · 백엔드', mine: false },
  { n: '04', title: '결과 검증', who: '공동', mine: false },
]

const perfMetrics = [
  { label: 'Queue P99 지연', before: '8,342 ms', after: '898 ms', delta: '-87%' },
  { label: '시나리오 완주 시간', before: '2분 38초', after: '15초', delta: '-90.5%' },
  { label: '좌석 경합 (409)', before: '2,472건', after: '0건', delta: '완전 제거' },
  { label: 'HOLD 성공률 (추천 ON)', before: '60.4%', after: '100%', delta: '+39.6%p' },
]

export function PlayballOverview() {
  return (
    <div>
      {/* Hero */}
      <section>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          ◆ KT Cloud Tech UP · 팀 프로젝트
        </span>

        <div className="mt-5 flex items-baseline gap-3">
          <h1 className="text-4xl font-bold tracking-tight">Playball</h1>
          <span className="text-muted-foreground text-base">플레이볼</span>
        </div>

        <p className="mt-4 max-w-xl text-xl leading-relaxed font-medium">
          문제는 수요 부족이 아니라,{' '}
          <span className="bg-blue-100/70 text-blue-800">수요 분배의 비효율</span>이다
        </p>

        <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
          KBO 티켓팅의 좌석 핫스팟 쏠림을, 온보딩 선호 기반 블록 추천 + 연석 자동배정으로 완화해
          좌석 확보 성공률을 높이는 티켓팅 플랫폼.
        </p>

        <MetaRows rows={metaRows} />
      </section>

      {/* 01 문제 · 시장 */}
      <CaseSection
        id="why"
        eyebrow="01 — 문제 · 시장"
        title="수요는 충분하다, 몰리는 게 문제다"
        lead="KBO 티켓팅 시장은 구조적으로 성장 중이다. 해결할 것은 그 수요가 특정 좌석에 동시에 몰리는 구조다."
      >
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {marketStats.map((stat) => (
            <div key={stat.label} className="bg-secondary rounded-xl p-5">
              <p className="text-2xl font-medium">{stat.value}</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {subStats.map((stat) => (
            <div
              key={stat.value}
              className="border-border flex items-baseline gap-3 rounded-xl border p-4"
            >
              <span className="shrink-0 text-lg font-medium text-blue-700">{stat.value}</span>
              <span className="text-muted-foreground text-xs leading-relaxed">{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="border-border mt-6 rounded-xl border p-5">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            As-Is · 현재의 좌석 쏠림 구조
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {asIsChain.map((node) => (
              <span key={node} className="contents">
                <span className="bg-secondary text-muted-foreground rounded-lg px-3 py-2 text-xs">
                  {node}
                </span>
                <Arrow />
              </span>
            ))}
            <span className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              이탈 · 2차 시장 유입
            </span>
          </div>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            모두가 같은 최선호 좌석을 동시에 클릭한다. 먼저 클릭한 사람이 먹는 구조라 네트워크 빠른
            사람이 유리하고, 나머지는 락 실패를 반복하다 이탈한다.
          </p>
        </div>
      </CaseSection>

      {/* 02 제품 의사결정 */}
      <CaseSection
        id="decision"
        eyebrow="02 — 제품 의사결정"
        title="완전 자동도, 완전 수동도 아닌"
        lead="두 극단 모두 한계가 있다. 추천 단위를 좌석이 아니라 블록으로 두어, 경합 집중을 구조적으로 회피하는 방향을 택했다."
      >
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {options.map((option) => (
            <div
              key={option.title}
              className={`rounded-xl border p-5 ${
                option.win ? 'border-blue-300 bg-blue-50' : 'border-border'
              }`}
            >
              <h3
                className={`text-sm font-medium ${option.win ? 'text-blue-900' : 'text-foreground'}`}
              >
                {option.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {option.points.map((point) => (
                  <li key={point.text} className="flex gap-2 text-xs leading-relaxed">
                    <span
                      aria-hidden="true"
                      className={`shrink-0 ${point.ok ? 'text-blue-600' : 'text-red-600'}`}
                    >
                      {point.ok ? '✓' : '✕'}
                    </span>
                    <span className={option.win ? 'text-blue-900/80' : 'text-muted-foreground'}>
                      {point.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="bg-secondary text-muted-foreground mt-3 rounded-xl p-4 text-sm leading-relaxed">
          <strong className="text-foreground font-medium">핵심 결정:</strong> 좌석 단위 추천은 다시
          특정 좌석에 경합을 몰기 때문에 금지했다. 블록을 선택하면 서버가 인원 수에 맞는 연석을 자동
          배정하고, 추천 정렬은 연석 확보 가능성을 1순위, 선호도를 tie-breaker로 둔다.
        </p>
      </CaseSection>

      {/* 03 화면 */}
      <CaseSection
        id="screens"
        eyebrow="03 — 화면"
        title="세 화면이 분산 전략을 나눠 실행한다"
        lead="온보딩에서 선호를 모으고, 경기 상세에서 모드를 정하고, 예매 화면에서 블록을 고른다. 각 화면이 경합 분산의 한 단계씩을 맡는다."
      >
        {/* 온보딩 */}
        <ScreenBlock
          label="Set Preferences · 온보딩"
          title="선호 구역을 최대 10개까지 맞춤 설정"
          lead="원하는 구역을 미리 골라두면 예매 시점에 빠르게 좌석을 배정한다. 이 단계에서 모은 데이터가 추천 점수의 입력값이 된다."
        >
          <Figure
            name="onboarding-map"
            caption="경기장 블록 맵에서 선호 구역을 직접 선택 — 선택 수를 8 / 10처럼 실시간 표시"
          />

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {preferenceGroups.map((group) => (
              <div
                key={group.tag}
                className={`rounded-xl border p-5 ${
                  group.accent ? 'border-blue-300 bg-blue-50' : 'border-border'
                }`}
              >
                <p
                  className={`text-xs font-medium tracking-wider uppercase ${
                    group.accent ? 'text-blue-700' : 'text-muted-foreground'
                  }`}
                >
                  {group.tag}
                </p>
                <p
                  className={`mt-1.5 text-sm font-medium ${group.accent ? 'text-blue-900' : ''}`}
                >
                  {group.title}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className={`rounded-md px-2.5 py-1 text-xs ${
                        group.accent
                          ? 'bg-white text-blue-800'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      # {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Figure name="onboarding-required" caption="필수 — 관람 위치·응원 구단·응원석 거리" />
            <Figure
              name="onboarding-optional"
              caption="선택 — 관람 환경·분위기·시야 민감도·가격대"
            />
          </div>
        </ScreenBlock>

        {/* 경기 상세 */}
        <ScreenBlock
          label="Game Details · 경기 상세"
          title="더 빠르고 안정적인 예매를 위한 사전 준비"
          lead="예매 진입 전에 추천 모드·인원 수·선호 구역을 확정한다. 좌석 화면에서 고민할 것을 미리 줄여 경합 구간의 체류 시간을 짧게 만든다."
        >
          <Figure
            name="match-detail"
            caption="경기 상세 — 가격 정보와 함께 우측에 예매 진입 제어 패널을 배치"
          />

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {bookingModes.map((mode) => (
              <div
                key={mode.title}
                className={`rounded-xl border p-5 ${
                  mode.accent ? 'border-blue-300 bg-blue-50' : 'border-border'
                }`}
              >
                <p className={`text-sm font-medium ${mode.accent ? 'text-blue-900' : ''}`}>
                  {mode.title}
                </p>
                <p
                  className={`mt-1.5 text-xs leading-relaxed ${
                    mode.accent ? 'text-blue-900/80' : 'text-muted-foreground'
                  }`}
                >
                  {mode.body}
                </p>
              </div>
            ))}
          </div>

          <Figure name="match-mode-compare" caption="구역 추천 ON / OFF 상태별 예매 패널 비교" />

          <div className="border-border mt-3 rounded-xl border p-5">
            <p className="text-sm font-medium">인근 좌석 추천이란?</p>
            <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
              선택한 인원 수만큼의 연속 좌석(연석)을 확보하되, 같은 행 · 1열 이내 · 동일 블럭 내까지
              허용 범위를 넓힌다. 4매 이상 구매 시 열을 나눠서라도 확보할 수 있어 Hold 실패를 줄인다.
            </p>
          </div>

          <p className="mt-6 text-sm font-medium">실전 전 인증 연습으로 보안 안정성 확보</p>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            VQA를 예매 당일 처음 만나면 그 자체가 이탈 지점이 된다. 경기 상세 하단에 사전 체험을 상시
            노출해 실제 예매와 동일한 방식으로 미리 연습하게 했다. 체험 결과는 실제 예매·대기열·Hold에
            영향을 주지 않는다.
          </p>
          <Figure
            name="vqa-tutorial"
            caption="플레이볼 보안 인증 — 야구공 캐치 미니게임으로 매크로·봇 방지"
          />
        </ScreenBlock>

        {/* 예매하기 */}
        <ScreenBlock
          label="Ticket Booking · 예매하기"
          title="긴장되는 순간에도 빠른 판단을 돕는 구역 추천 경험"
          lead="좌석 하나하나를 비교하는 대신, 블록 카드에서 이용 가능 연석과 잔여 좌석만 보고 즉시 고른다. 판단 대상을 줄여 경합 구간을 빠르게 통과시킨다."
        >
          <Figure
            name="booking-seat-select"
            caption="좌석 선택 — 좌측 좌석맵과 우측 추천 구역 리스트를 함께 배치"
          />

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Figure name="booking-toggle" caption="좌석 화면에서도 추천 모드를 즉시 전환" />
            <Figure
              name="booking-block-card"
              caption="블록 카드 — 이용 가능 연석과 잔여 좌석을 함께 노출"
            />
          </div>

          <div className="mt-4 rounded-xl border border-blue-300 bg-blue-50 p-5">
            <p className="text-sm font-medium text-blue-900">
              추천 시 연석 우선 배정으로 좌석 선점 경합 성공률 증가
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-blue-900/80">
              블록을 선택하면 서버가 인원 수에 맞는 연석을 자동 배정한다. 사용자가 같은 좌석을 동시에
              클릭할 일이 없어 Lock 경합이 구조적으로 사라진다.
            </p>
          </div>
        </ScreenBlock>
      </CaseSection>

      {/* 04 My Role */}
      <CaseSection
        id="role"
        eyebrow="04 — My Role"
        title="14인 팀에서 맡은 자리"
        lead="전문 파트가 각 영역을 구현했고, PM으로서 문제 정의·정책·측정·조율을 맡았다. 무엇이 내 몫이었는지 먼저 명확히 둔다."
      >
        <div className="text-muted-foreground mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span>
            <strong className="text-foreground font-medium">기간</strong> 2026.01 – 2026.04
          </span>
          <span>
            <strong className="text-foreground font-medium">소속</strong> KT Cloud Tech UP 1기
          </span>
          <span>
            <strong className="text-foreground font-medium">규모</strong> 14인 · 8개 직군
          </span>
        </div>

        <div className="bg-secondary mt-4 rounded-xl p-4">
          <p className="text-muted-foreground text-xs">팀 구성</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {teamChips.map((chip) => (
              <span
                key={chip.label}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  chip.me
                    ? 'bg-blue-100 font-medium text-blue-800'
                    : 'border-border text-muted-foreground border bg-white'
                }`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-blue-300 bg-blue-50 p-5">
            <h3 className="text-sm font-medium text-blue-900">내가 맡은 것 — PM</h3>
            <ul className="mt-3">
              {myWork.map((item) => (
                <li
                  key={item.text}
                  className="border-t border-blue-200/60 py-2.5 text-sm leading-relaxed first:border-t-0 first:pt-0"
                >
                  <span className="text-blue-950">{item.text}</span>
                  {item.note && (
                    <span className="mt-0.5 block text-xs text-blue-900/60">{item.note}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-border rounded-xl border p-5">
            <h3 className="text-sm font-medium">전문 파트가 구현</h3>
            <ul className="mt-3">
              {teamWork.map((item) => (
                <li
                  key={item.text}
                  className="border-border text-muted-foreground border-t py-2.5 text-sm leading-relaxed first:border-t-0 first:pt-0"
                >
                  {item.text}
                  {item.note && (
                    <span className="text-muted-foreground/70 mt-0.5 block text-xs">
                      {item.note}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CaseSection>

      {/* 04 주요 기술 */}
      <CaseSection
        id="tech"
        eyebrow="05 — 주요 기술 · 팀 성과"
        title="대규모 트래픽과 봇을 견디는 구조"
        lead="두 축의 엔지니어링은 각 전문 파트가 구현했다. PM으로서 나는 이를 문제·요구사항·측정으로 정의하고 조율했다."
      >
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {techCards.map((card) => (
            <div
              key={card.title}
              className="border-border flex flex-col overflow-hidden rounded-xl border"
            >
              <div className="flex-1 p-5">
                <p className="text-muted-foreground text-xs tracking-wide uppercase">{card.tag}</p>
                <h3 className="mt-2 font-medium">{card.title}</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">{card.subtitle}</p>
                <ul className="mt-3">
                  {card.items.map((item) => (
                    <li
                      key={item.term}
                      className="border-border text-muted-foreground border-t py-2.5 text-xs leading-relaxed first:border-t-0 first:pt-0"
                    >
                      <strong className="text-foreground font-medium">{item.term}</strong> —{' '}
                      {item.body}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2.5 bg-blue-50 px-5 py-3">
                <span className="shrink-0 pt-0.5 text-[10px] font-medium tracking-wide text-blue-700 uppercase">
                  나의 관여
                </span>
                <span className="text-xs leading-relaxed text-blue-950">{card.mine}</span>
              </div>
            </div>
          ))}
        </div>
      </CaseSection>

      {/* 05 성능 */}
      <CaseSection
        id="perf"
        eyebrow="06 — 성능 · 부하테스트 · 내 설계"
        title="측정 시나리오를 설계해 안정성을 검증했다"
        lead="성능 목표와 검증 시나리오는 PM으로서 내가 설계했고, 실행은 클라우드·백엔드 파트가 담당했다. 아래는 그 시나리오로 검증한 결과다."
      >
        <div className="mt-6 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {loadSteps.map((step) => (
            <div
              key={step.n}
              className={`rounded-xl border p-4 ${
                step.mine ? 'border-blue-300 bg-blue-50' : 'border-border'
              }`}
            >
              <p className="text-muted-foreground text-xs">{step.n}</p>
              <p className="mt-1.5 text-sm leading-snug font-medium">{step.title}</p>
              <span
                className={`mt-2 inline-block rounded-md px-2 py-0.5 text-[10px] ${
                  step.mine ? 'bg-blue-600 text-white' : 'bg-secondary text-muted-foreground'
                }`}
              >
                {step.who}
              </span>
            </div>
          ))}
        </div>

        <p className="bg-secondary text-muted-foreground mt-4 flex gap-2 rounded-lg px-4 py-3 text-sm leading-relaxed">
          <span className="text-blue-500">ℹ</span>
          <span>
            <strong className="text-foreground font-medium">
              1,000 VU 부하테스트 · 추천 ON/OFF 비교 기준
            </strong>
            이다. 프로덕션 실사용 지표가 아니라, 설계한 시나리오로 검증한 값이다.
          </span>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {perfMetrics.map((metric) => (
            <div key={metric.label} className="border-border rounded-xl border p-4">
              <p className="text-muted-foreground text-xs leading-snug">{metric.label}</p>
              <p className="text-muted-foreground/60 mt-2.5 text-xs line-through">
                {metric.before}
              </p>
              <p className="text-xl font-medium">{metric.after}</p>
              <p className="mt-0.5 text-xs font-medium text-blue-600">{metric.delta}</p>
            </div>
          ))}
        </div>
      </CaseSection>
    </div>
  )
}
