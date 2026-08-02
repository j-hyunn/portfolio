export type ValueItem = {
  title: string
  body: string
}

export const principles: ValueItem[] = [
  {
    title: 'Data',
    body: '핵심 지표를 정의하고 실험과 행동 분석으로 가설을 검증합니다.',
  },
  {
    title: 'Solution',
    body: '근본 원인을 분석해 실행 가능한 해결책을 도출합니다.',
  },
  {
    title: 'Flexibility',
    body: '시장과 기술 변화에 빠르게 적응하며 방향을 조정합니다.',
  },
  {
    title: 'Communication',
    body: '다양한 직군과 목표를 정렬해 실행 속도를 높입니다.',
  },
]

export const strengths: ValueItem[] = [
  {
    title: 'End-to-End',
    body: '기획부터 개발 협업, 출시, 운영까지 전 과정을 주도합니다.',
  },
  {
    title: 'Product Positioning',
    body: '시장 분석으로 제품의 핵심 가치와 메시지를 정의합니다.',
  },
  {
    title: 'Problem Discovery',
    body: '드러나지 않은 문제를 발굴해 제품화 형태로 구조화합니다.',
  },
  {
    title: 'Customer-Centric',
    body: '인터뷰와 데이터로 고객 문제의 우선순위를 정합니다.',
  },
]

export const skillGroups: string[][] = [
  ['Figma', 'Framer', 'GA4', 'Claude Code', 'Jira & Confluence', 'Slack'],
  ['Value Proposition', 'End-to-End', 'UX Strategy', 'Customer-Centric'],
]

export type Capability = {
  category: string
  items: string[]
}

export const capabilities: Capability[] = [
  {
    category: 'User Experience',
    items: ['프로덕트 디자인', '사용성 개선', '서비스 기획'],
  },
  {
    category: 'Product Management',
    items: [
      'PRD 및 기능 명세 작성',
      'GTM 전략 및 운영 프로세스 수립',
      '리소스 관리 및 일정 관리',
      '제품 로드맵 및 백로그 관리',
    ],
  },
]

export type CertificateGroup = {
  label: string
  items: string[]
}

export const certificates: CertificateGroup[] = [
  {
    label: '교육 사항',
    items: ['[KT Cloud] Tech Up - Product Management 1기 수료'],
  },
  {
    label: '수상 내역',
    items: [
      '[2026.04] Tech Up 과정 통합 프로젝트 대상',
      '[2026.04] Tech Up 프로덕트 매니지먼트 과정 최우수 수료생 선정',
    ],
  },
]
