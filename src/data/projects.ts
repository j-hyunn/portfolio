export type ProjectDoc = {
  slug: string
  title: string
}

export type ProjectDocGroup = {
  title: string
  docs: ProjectDoc[]
}

export type ProjectEntry = {
  slug: string
  title: string
  subtitle?: string
  description: string
  period: string
  tags: string[]
  /** 그룹 없이 왼쪽 메뉴에 단독으로 노출되는 산출물 */
  docs: ProjectDoc[]
  /** 왼쪽 메뉴에서 아코디언으로 묶여 노출되는 산출물 그룹 */
  docGroups?: ProjectDocGroup[]
}

/** 왼쪽 메뉴에 노출되는 모든 산출물 (단독 + 그룹) */
export function allProjectDocs(project: ProjectEntry): ProjectDoc[] {
  return [...project.docs, ...(project.docGroups ?? []).flatMap((group) => group.docs)]
}

export const projects: ProjectEntry[] = [
  {
    slug: 'replai',
    title: 'Replai',
    subtitle: '리플레이',
    description:
      '하나의 마스터 이력서로 회사별 제출용 이력서를 만들고, 그 이력서를 그대로 읽은 AI 면접관과 모의면접까지 이어서 진행하는 서비스.',
    period: '2026.03 ~ (운영 중)',
    tags: ['Next.js', 'Google ADK', 'Supabase', 'Gemini'],
    docs: [
      { slug: 'prd', title: 'PRD' },
      { slug: 'trd', title: 'TRD' },
      { slug: 'multi-agent-architecture', title: 'Multi Agent Architecture' },
      { slug: 'agents-prompt', title: 'Agents Prompt' },
      { slug: 'competitor-analysis', title: '경쟁사 분석' },
      { slug: 'tech-decisions', title: '기술 선택 근거 요약' },
      { slug: 'dev-harness', title: '개발 하네스 에이전트 팀' },
    ],
  },
  {
    slug: 'playball',
    title: 'Playball',
    subtitle: '플레이볼',
    description:
      'KBO 티켓팅의 좌석 핫스팟 쏠림을, 온보딩 선호 기반 블록 추천 + 연석 자동배정으로 완화해 좌석 확보 성공률을 높이는 티켓팅 플랫폼.',
    period: '2026.01 – 2026.04',
    tags: ['KT Cloud Tech UP', '14인 팀 프로젝트', 'MSA', 'AI 봇 방어'],
    docs: [
      { slug: 'prd', title: 'PRD' },
      { slug: 'brd', title: 'BRD' },
    ],
    docGroups: [
      {
        title: '기능 명세',
        docs: [
          { slug: 'auth', title: '로그인 · 회원가입' },
          { slug: 'onboarding', title: '온보딩' },
          { slug: 'match-detail', title: '구단 · 경기 상세페이지' },
          { slug: 'ticketing', title: '티켓 예매' },
          { slug: 'block-recommendation', title: '추천블럭 계산 가이드' },
          { slug: 'order-payment', title: '주문서 및 결제' },
          { slug: 'mypage', title: '마이페이지' },
        ],
      },
      {
        title: '운영 · 정책',
        docs: [
          { slug: 'access-policy', title: '회원 접근 정책' },
          { slug: 'queue-policy', title: '대기열 정책' },
          { slug: 'vqa-policy', title: 'VQA 정책' },
          { slug: 'recommendation-policy', title: '추천 정책' },
          { slug: 'cancellation-policy', title: '취소 · 환불 정책' },
          { slug: 'stadium-template', title: '경기장 템플릿' },
          { slug: 'business-metrics', title: '비즈니스 지표' },
          { slug: 'load-test', title: '부하테스트 시나리오' },
          { slug: 'staging-test-case', title: 'Staging Test Case' },
        ],
      },
      {
        title: '약관',
        docs: [
          { slug: 'terms', title: '이용 약관' },
          { slug: 'privacy', title: '개인정보 처리방침' },
        ],
      },
    ],
  },
]
